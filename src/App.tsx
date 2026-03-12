import { useMemo, useRef, useState, useEffect, useCallback } from 'react';
import { getSupportedCodecs } from './utils/codecs';
import { useDevices }         from './hooks/useDevices';
import { useOPFS }            from './hooks/useOPFS';
import { useRecorder }        from './hooks/useRecorder';
import { Header }             from './components/Header';
import { ControlPanel }       from './components/ControlPanel';
import { PreviewPane }        from './components/PreviewPane';

export default function App() {
  const videoRef       = useRef<HTMLVideoElement | null>(null);
  const playbackUrlRef = useRef<string | null>(null);

  // ── Source settings ──────────────────────────────────────────────────────
  const [captureScreen,   setCaptureScreen]   = useState(true);
  const [captureSysAudio, setCaptureSysAudio] = useState(false);
  const [captureCamera,   setCaptureCamera]   = useState(false);
  const [captureMic,      setCaptureMic]      = useState(false);
  const [cameraDeviceId,  setCameraDeviceId]  = useState('');
  const [micDeviceId,     setMicDeviceId]     = useState('');

  // ── Quality settings ─────────────────────────────────────────────────────
  const [codecIndex,    setCodecIndex]    = useState(0);
  const [resolution,    setResolution]    = useState('1920x1080');
  const [fps,           setFps]           = useState(30);
  const [videoBitrate,  setVideoBitrate]  = useState(10);     // Mbps
  const [audioBitrate,  setAudioBitrate]  = useState(192000); // bps

  // ── Playback state ───────────────────────────────────────────────────────
  const [playbackSrc, setPlaybackSrc] = useState<string | null>(null);

  // ── Hooks ────────────────────────────────────────────────────────────────
  const supportedCodecs = useMemo(() => getSupportedCodecs(), []);
  const { cameras, mics } = useDevices();
  const { opfsRoot, available: opfsAvailable, recordings, refresh: refreshRecordings } = useOPFS();

  const {
    recState, liveStream, elapsed, bytesWritten, currentRes, currentCodec,
    start, stop, pause,
  } = useRecorder({ opfsRoot, opfsAvailable, onSaved: refreshRecordings });

  // ── Sync video element with live stream or playback URL ──────────────────
  // The <video> element requires imperative control: `muted` is not reliably
  // settable as a React prop, and `srcObject` is not a valid React prop at all.
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (playbackSrc) {
      video.srcObject = null;
      video.src       = playbackSrc;
      video.muted     = false;
      video.controls  = true;
      video.play().catch(() => {});

      const handleEnded = () => {
        URL.revokeObjectURL(playbackSrc);
        playbackUrlRef.current = null;
        setPlaybackSrc(null);
      };
      video.addEventListener('ended', handleEnded, { once: true });
      return () => video.removeEventListener('ended', handleEnded);

    } else if (liveStream) {
      if (video.src) { URL.revokeObjectURL(video.src); video.src = ''; }
      video.srcObject = liveStream;
      video.muted     = true;
      video.controls  = false;
      video.play().catch(() => {});

    } else {
      if (video.src) { URL.revokeObjectURL(video.src); video.src = ''; }
      video.srcObject = null;
      video.muted     = true;
      video.controls  = false;
    }
  }, [playbackSrc, liveStream]);

  // ── Build video constraints from quality settings ────────────────────────
  function buildVideoConstraints(): MediaTrackConstraints {
    const c: MediaTrackConstraints = { frameRate: fps };
    if (resolution !== 'source') {
      const [w, h] = resolution.split('x').map(Number);
      c.width  = { ideal: w };
      c.height = { ideal: h };
    }
    return c;
  }

  // ── Handlers ─────────────────────────────────────────────────────────────
  const handleStart = useCallback(() => {
    // Clear any active playback before starting a new recording.
    if (playbackUrlRef.current) {
      URL.revokeObjectURL(playbackUrlRef.current);
      playbackUrlRef.current = null;
      setPlaybackSrc(null);
    }
    start({
      captureScreen, captureSysAudio, captureCamera, captureMic,
      cameraDeviceId, micDeviceId,
      videoConstraints: buildVideoConstraints(),
      selectedCodec: supportedCodecs[codecIndex],
      videoBps: videoBitrate * 1_000_000,
      audioBps: audioBitrate,
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    start,
    captureScreen, captureSysAudio, captureCamera, captureMic,
    cameraDeviceId, micDeviceId,
    resolution, fps, supportedCodecs, codecIndex, videoBitrate, audioBitrate,
  ]);

  const handlePlay = useCallback(async (handle: FileSystemFileHandle) => {
    if (playbackUrlRef.current) URL.revokeObjectURL(playbackUrlRef.current);
    const file = await handle.getFile();
    const url  = URL.createObjectURL(file);
    playbackUrlRef.current = url;
    setPlaybackSrc(url);
  }, []);

  const handleDownload = useCallback(async (handle: FileSystemFileHandle, name: string) => {
    const file = await handle.getFile();
    const url  = URL.createObjectURL(file);
    const a    = document.createElement('a');
    a.href = url; a.download = name; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 10_000);
  }, []);

  const handleDelete = useCallback(async (name: string) => {
    if (!opfsRoot) return;
    try {
      await opfsRoot.removeEntry(name);
      await refreshRecordings();
    } catch (e) {
      alert('Could not delete: ' + (e as Error).message);
    }
  }, [opfsRoot, refreshRecordings]);

  // ── Render ───────────────────────────────────────────────────────────────
  const showPlaceholder = !playbackSrc && !liveStream;

  return (
    <>
      <Header recState={recState} />
      <main>
        <ControlPanel
          captureScreen={captureScreen}     onCaptureScreen={setCaptureScreen}
          captureSysAudio={captureSysAudio} onCaptureSysAudio={setCaptureSysAudio}
          captureCamera={captureCamera}     onCaptureCamera={setCaptureCamera}
          captureMic={captureMic}           onCaptureMic={setCaptureMic}
          cameras={cameras}      cameraDeviceId={cameraDeviceId} onCameraDeviceId={setCameraDeviceId}
          mics={mics}            micDeviceId={micDeviceId}       onMicDeviceId={setMicDeviceId}
          supportedCodecs={supportedCodecs} codecIndex={codecIndex} onCodecIndex={setCodecIndex}
          resolution={resolution}           onResolution={setResolution}
          fps={fps}                         onFps={setFps}
          videoBitrate={videoBitrate}       onVideoBitrate={setVideoBitrate}
          audioBitrate={audioBitrate}       onAudioBitrate={setAudioBitrate}
          recState={recState}
          opfsAvailable={opfsAvailable}
          onStart={handleStart}
          onPause={pause}
          onStop={stop}
        />
        <PreviewPane
          videoRef={videoRef}
          recState={recState}
          elapsed={elapsed}
          opfsAvailable={opfsAvailable}
          bytesWritten={bytesWritten}
          currentRes={currentRes}
          currentCodec={currentCodec}
          recordings={recordings}
          onPlay={handlePlay}
          onDownload={handleDownload}
          onDelete={handleDelete}
          showPlaceholder={showPlaceholder}
        />
      </main>
    </>
  );
}
