import { useState, useRef, useEffect, useCallback } from 'react';
import { RecState, CodecOption } from '../types';

export interface PreviewSettings {
  captureScreen: boolean;
  captureSysAudio: boolean;
  captureCamera: boolean;
  captureMic: boolean;
  cameraDeviceId: string;
  micDeviceId: string;
  videoConstraints: MediaTrackConstraints;
}

export interface RecordSettings {
  selectedCodec: CodecOption | undefined;
  videoBps: number;
  audioBps: number;
}

interface UseRecorderOptions {
  opfsRoot: FileSystemDirectoryHandle | null;
  opfsAvailable: boolean;
  onSaved?: () => void;
}

export function useRecorder({ opfsRoot, opfsAvailable, onSaved }: UseRecorderOptions): {
  recState: RecState;
  liveStream: MediaStream | null;
  elapsed: number;
  bytesWritten: number;
  currentRes: string | null;
  currentCodec: string | null;
  startPreview: (s: PreviewSettings) => Promise<boolean>;
  stopPreview: () => void;
  startRecording: (s: RecordSettings) => Promise<void>;
  stopRecording: () => void;
  pauseRecording: () => void;
} {
  const [recState,     setRecState]     = useState<RecState>('idle');
  const [liveStream,   setLiveStream]   = useState<MediaStream | null>(null);
  const [elapsed,      setElapsed]      = useState(0);
  const [bytesWritten, setBytesWritten] = useState(0);
  const [currentRes,   setCurrentRes]   = useState<string | null>(null);
  const [currentCodec, setCurrentCodec] = useState<string | null>(null);

  // Keep the latest prop values accessible inside async callbacks without
  // stale closures.
  const propsRef = useRef<{ opfsRoot: FileSystemDirectoryHandle | null; opfsAvailable: boolean; onSaved?: () => void }>({ opfsRoot, opfsAvailable, onSaved });
  useEffect(() => { propsRef.current = { opfsRoot, opfsAvailable, onSaved }; });

  // Media / recording refs — mutable, never cause re-renders.
  const mediaRecorderRef  = useRef<MediaRecorder | null>(null);
  const screenStreamRef   = useRef<MediaStream | null>(null);
  const cameraStreamRef   = useRef<MediaStream | null>(null);
  const micStreamRef      = useRef<MediaStream | null>(null);
  const combinedStreamRef = useRef<MediaStream | null>(null);
  const audioCtxRef       = useRef<AudioContext | null>(null);
  const opfsWritableRef   = useRef<FileSystemWritableFileStream | null>(null);
  const writeQueueRef     = useRef<Promise<void>>(Promise.resolve());
  const fallbackChunksRef = useRef<Blob[]>([]);
  const recordingNameRef  = useRef<string>('');
  const recordMimeRef     = useRef<string | undefined>(undefined);
  // When true, the underlying capture has ended (e.g. the user dismissed the
  // screen-share picker); the in-flight recording should finalize and the
  // preview should fully tear down rather than returning to preview state.
  const endAfterSaveRef   = useRef<boolean>(false);

  // Timer refs.
  const startTimeRef  = useRef<number>(0);
  const pausedMsRef   = useRef<number>(0);
  const pauseStartRef = useRef<number>(0);

  // ── Timer interval ───────────────────────────────────────────────────────
  useEffect(() => {
    if (recState !== 'recording') return;
    const id = setInterval(() => {
      setElapsed(Date.now() - startTimeRef.current - pausedMsRef.current);
    }, 500);
    return () => clearInterval(id);
  }, [recState]);

  // ── Tear down all media streams ──────────────────────────────────────────
  const teardownStreams = useCallback(() => {
    [screenStreamRef, cameraStreamRef, micStreamRef, combinedStreamRef].forEach(r => {
      r.current?.getTracks().forEach(t => t.stop());
      r.current = null;
    });
    if (audioCtxRef.current) {
      audioCtxRef.current.close().catch(() => {});
      audioCtxRef.current = null;
    }
    setLiveStream(null);
    setCurrentRes(null);
  }, []);

  // Cleanup on unmount.
  useEffect(() => {
    return () => {
      mediaRecorderRef.current = null;
      [screenStreamRef, cameraStreamRef, micStreamRef, combinedStreamRef].forEach(r => {
        r.current?.getTracks().forEach(t => t.stop());
        r.current = null;
      });
      audioCtxRef.current?.close().catch(() => {});
    };
  }, []);

  // ── startPreview ─────────────────────────────────────────────────────────
  const startPreview = useCallback(async (settings: PreviewSettings) => {
    const {
      captureScreen, captureSysAudio, captureCamera, captureMic,
      cameraDeviceId, micDeviceId, videoConstraints,
    } = settings;

    setRecState('acquiring');

    try {
      const tracks: MediaStreamTrack[] = [];
      const audioSources: MediaStream[] = [];

      if (captureScreen) {
        const ss = await navigator.mediaDevices.getDisplayMedia({
          video: videoConstraints,
          // Disable all browser audio processing so system audio is captured flat.
          audio: captureSysAudio
            ? { echoCancellation: false, noiseSuppression: false, autoGainControl: false }
            : false,
        });
        screenStreamRef.current = ss;
        ss.getVideoTracks().forEach(t => tracks.push(t));
        if (captureSysAudio) {
          ss.getAudioTracks().forEach(t => audioSources.push(new MediaStream([t])));
        }
        // The user dismissing the browser share picker ends the screen track;
        // finalize any in-flight recording and tear down the preview.
        ss.getVideoTracks()[0].addEventListener('ended', () => {
          const mr = mediaRecorderRef.current;
          if (mr && mr.state !== 'inactive') {
            endAfterSaveRef.current = true;
            mr.stop();
          } else {
            teardownStreams();
            setRecState('idle');
          }
        });
      }

      if (captureCamera) {
        const cs = await navigator.mediaDevices.getUserMedia({
          video: { deviceId: cameraDeviceId || undefined, ...videoConstraints },
        });
        cameraStreamRef.current = cs;
        // Use the camera as video source only when no screen is being captured.
        if (tracks.length === 0) cs.getVideoTracks().forEach(t => tracks.push(t));
      }

      if (captureMic) {
        const ms = await navigator.mediaDevices.getUserMedia({
          audio: {
            deviceId: micDeviceId || undefined,
            echoCancellation: true,
            noiseSuppression: true,
          },
        });
        micStreamRef.current = ms;
        audioSources.push(ms);
      }

      if (tracks.length === 0) {
        throw new Error('No video source selected. Enable Screen or Camera.');
      }

      // Mix multiple audio sources if necessary.
      let audioTrack: MediaStreamTrack | null = null;
      if (audioSources.length > 1) {
        const ctx = new AudioContext();
        audioCtxRef.current = ctx;
        const dest = ctx.createMediaStreamDestination();
        audioSources.forEach(s =>
          s.getAudioTracks().forEach(t =>
            ctx.createMediaStreamSource(new MediaStream([t])).connect(dest)
          )
        );
        audioTrack = dest.stream.getAudioTracks()[0];
      } else if (audioSources.length === 1) {
        audioTrack = audioSources[0].getAudioTracks()[0];
      }

      const combined = new MediaStream(tracks);
      if (audioTrack) combined.addTrack(audioTrack);
      combinedStreamRef.current = combined;

      // Capture actual resolution from the track.
      const trackSettings = tracks[0].getSettings();
      setCurrentRes(`${trackSettings.width ?? '?'}×${trackSettings.height ?? '?'}`);

      setLiveStream(combined);
      setRecState('preview');
      return true;

    } catch (err) {
      console.error('startPreview:', err);
      alert('Could not start preview:\n' + (err as Error).message);
      teardownStreams();
      setRecState('idle');
      return false;
    }
  }, [teardownStreams]);

  // ── stopPreview ──────────────────────────────────────────────────────────
  const stopPreview = useCallback(() => {
    if (mediaRecorderRef.current?.state !== 'inactive' && mediaRecorderRef.current) {
      // Should not normally happen — stopRecording first.
      return;
    }
    teardownStreams();
    setRecState('idle');
    setBytesWritten(0);
    setCurrentCodec(null);
  }, [teardownStreams]);

  // ── startRecording ───────────────────────────────────────────────────────
  // Requires preview to be active (combinedStreamRef populated).
  const startRecording = useCallback(async (settings: RecordSettings) => {
    const combined = combinedStreamRef.current;
    if (!combined) {
      alert('Preview must be started before recording.');
      return;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      return;
    }

    const { selectedCodec, videoBps, audioBps } = settings;
    const { opfsAvailable, opfsRoot } = propsRef.current;

    const ext  = selectedCodec?.ext  ?? 'webm';
    const mime = selectedCodec?.mime ?? undefined;
    recordMimeRef.current = mime;
    const ts   = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    recordingNameRef.current = `screenrec-${ts}.${ext}`;

    try {
      if (opfsAvailable && opfsRoot) {
        const fh = await opfsRoot.getFileHandle(recordingNameRef.current, { create: true });
        opfsWritableRef.current = await fh.createWritable();
        writeQueueRef.current = Promise.resolve();
      } else {
        fallbackChunksRef.current = [];
      }
    } catch (err) {
      alert('Could not open output file:\n' + (err as Error).message);
      return;
    }

    setBytesWritten(0);
    setElapsed(0);
    setCurrentCodec(selectedCodec?.label?.split(' ')[0] ?? 'default');

    const recOpts: MediaRecorderOptions = { videoBitsPerSecond: videoBps, audioBitsPerSecond: audioBps };
    if (mime) recOpts.mimeType = mime;

    let mr: MediaRecorder;
    try {
      mr = new MediaRecorder(combined, recOpts);
    } catch (err) {
      alert('Could not start recording:\n' + (err as Error).message);
      if (opfsWritableRef.current) {
        await opfsWritableRef.current.close().catch(() => {});
        opfsWritableRef.current = null;
      }
      return;
    }
    mediaRecorderRef.current = mr;

    mr.ondataavailable = e => {
      if (!e.data?.size) return;
      setBytesWritten(b => b + e.data.size);
      if (propsRef.current.opfsAvailable && opfsWritableRef.current) {
        const writable = opfsWritableRef.current;
        writeQueueRef.current = writeQueueRef.current.then(
          () => writable.write(e.data)
        );
      } else {
        fallbackChunksRef.current.push(e.data);
      }
    };

    mr.onstop = async () => {
      setRecState('saving');
      try {
        if (propsRef.current.opfsAvailable && opfsWritableRef.current) {
          await writeQueueRef.current;
          await opfsWritableRef.current.close();
          opfsWritableRef.current = null;
        } else {
          // Fallback: build a Blob and trigger a browser download.
          const blob = new Blob(fallbackChunksRef.current, {
            type: recordMimeRef.current ?? 'video/webm',
          });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = recordingNameRef.current;
          a.click();
          setTimeout(() => URL.revokeObjectURL(url), 10_000);
          fallbackChunksRef.current = [];
        }
        propsRef.current.onSaved?.();
      } catch (err) {
        alert('Error saving recording: ' + (err as Error).message);
      } finally {
        mediaRecorderRef.current = null;
        setElapsed(0);
        if (endAfterSaveRef.current) {
          endAfterSaveRef.current = false;
          teardownStreams();
          setRecState('idle');
          setBytesWritten(0);
          setCurrentCodec(null);
        } else {
          setRecState('preview');
        }
      }
    };

    mr.onerror = e => {
      alert('Recording error: ' + (e.error?.message ?? 'unknown'));
      if (mr.state !== 'inactive') mr.stop();
    };

    startTimeRef.current = Date.now();
    pausedMsRef.current  = 0;
    mr.start(1000); // 1-second timeslices
    setRecState('recording');
  }, [teardownStreams]);

  // ── stopRecording ────────────────────────────────────────────────────────
  const stopRecording = useCallback(() => {
    const mr = mediaRecorderRef.current;
    if (mr && mr.state !== 'inactive') mr.stop();
  }, []);

  // ── pause / resume ───────────────────────────────────────────────────────
  const pauseRecording = useCallback(() => {
    const mr = mediaRecorderRef.current;
    if (!mr) return;
    if (mr.state === 'recording') {
      mr.pause();
      pauseStartRef.current = Date.now();
      setRecState('paused');
    } else if (mr.state === 'paused') {
      mr.resume();
      pausedMsRef.current += Date.now() - pauseStartRef.current;
      setRecState('recording');
    }
  }, []);

  return {
    recState, liveStream, elapsed, bytesWritten, currentRes, currentCodec,
    startPreview, stopPreview, startRecording, stopRecording, pauseRecording,
  };
}
