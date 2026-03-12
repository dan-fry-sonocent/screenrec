import { RecState, CodecOption } from '../../types';
import { SourcesSection }        from './SourcesSection';
import { QualitySection }        from './QualitySection';
import { RecordingSection }      from './RecordingSection';

export interface ControlPanelProps {
  // Sources
  captureScreen: boolean;    onCaptureScreen: (v: boolean) => void;
  captureSysAudio: boolean;  onCaptureSysAudio: (v: boolean) => void;
  captureCamera: boolean;    onCaptureCamera: (v: boolean) => void;
  captureMic: boolean;       onCaptureMic: (v: boolean) => void;
  cameras: MediaDeviceInfo[]; cameraDeviceId: string; onCameraDeviceId: (v: string) => void;
  mics: MediaDeviceInfo[];    micDeviceId: string;    onMicDeviceId: (v: string) => void;
  // Quality
  supportedCodecs: CodecOption[]; codecIndex: number; onCodecIndex: (v: number) => void;
  resolution: string;   onResolution: (v: string) => void;
  fps: number;          onFps: (v: number) => void;
  videoBitrate: number; onVideoBitrate: (v: number) => void;
  audioBitrate: number; onAudioBitrate: (v: number) => void;
  // Recording
  recState: RecState;
  opfsAvailable: boolean;
  onStart: () => void;
  onPause: () => void;
  onStop:  () => void;
}

export function ControlPanel({
  captureScreen, onCaptureScreen, captureSysAudio, onCaptureSysAudio,
  captureCamera, onCaptureCamera, captureMic, onCaptureMic,
  cameras, cameraDeviceId, onCameraDeviceId,
  mics,    micDeviceId,    onMicDeviceId,
  supportedCodecs, codecIndex, onCodecIndex,
  resolution, onResolution, fps, onFps,
  videoBitrate, onVideoBitrate, audioBitrate, onAudioBitrate,
  recState, opfsAvailable, onStart, onPause, onStop,
}: ControlPanelProps) {
  const busy = recState !== 'idle';

  return (
    <div className="panel">
      <SourcesSection
        captureScreen={captureScreen}     onCaptureScreen={onCaptureScreen}
        captureSysAudio={captureSysAudio} onCaptureSysAudio={onCaptureSysAudio}
        captureCamera={captureCamera}     onCaptureCamera={onCaptureCamera}
        captureMic={captureMic}           onCaptureMic={onCaptureMic}
        cameras={cameras} cameraDeviceId={cameraDeviceId} onCameraDeviceId={onCameraDeviceId}
        mics={mics}       micDeviceId={micDeviceId}       onMicDeviceId={onMicDeviceId}
        disabled={busy}
      />
      <QualitySection
        supportedCodecs={supportedCodecs} codecIndex={codecIndex} onCodecIndex={onCodecIndex}
        resolution={resolution}           onResolution={onResolution}
        fps={fps}                         onFps={onFps}
        videoBitrate={videoBitrate}       onVideoBitrate={onVideoBitrate}
        audioBitrate={audioBitrate}       onAudioBitrate={onAudioBitrate}
        disabled={busy}
      />
      <RecordingSection
        recState={recState}
        opfsAvailable={opfsAvailable}
        onStart={onStart}
        onPause={onPause}
        onStop={onStop}
      />
    </div>
  );
}
