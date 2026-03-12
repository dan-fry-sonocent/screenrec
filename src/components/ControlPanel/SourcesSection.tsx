import { Section } from '../Section';
import { Toggle }  from '../Toggle';

export interface SourcesSectionProps {
  captureScreen: boolean;    onCaptureScreen: (v: boolean) => void;
  captureSysAudio: boolean;  onCaptureSysAudio: (v: boolean) => void;
  captureCamera: boolean;    onCaptureCamera: (v: boolean) => void;
  captureMic: boolean;       onCaptureMic: (v: boolean) => void;
  cameras: MediaDeviceInfo[]; cameraDeviceId: string; onCameraDeviceId: (v: string) => void;
  mics: MediaDeviceInfo[];    micDeviceId: string;    onMicDeviceId: (v: string) => void;
  disabled: boolean;
}

export function SourcesSection({
  captureScreen,   onCaptureScreen,
  captureSysAudio, onCaptureSysAudio,
  captureCamera,   onCaptureCamera,
  captureMic,      onCaptureMic,
  cameras, cameraDeviceId, onCameraDeviceId,
  mics,    micDeviceId,    onMicDeviceId,
  disabled,
}: SourcesSectionProps) {
  return (
    <Section title="Sources">
      <Toggle
        label="Screen / Window"
        sublabel="Capture display or app window"
        checked={captureScreen}
        onChange={onCaptureScreen}
        disabled={disabled}
      />
      <Toggle
        label="System Audio"
        sublabel="From screen share (Chrome/Edge)"
        checked={captureSysAudio}
        onChange={onCaptureSysAudio}
        disabled={disabled}
      />
      <Toggle
        label="Camera"
        sublabel="Webcam"
        checked={captureCamera}
        onChange={onCaptureCamera}
        disabled={disabled}
      />
      {captureCamera && (
        <div>
          <label>Camera device</label>
          <select
            value={cameraDeviceId}
            onChange={e => onCameraDeviceId(e.target.value)}
            disabled={disabled}
          >
            {cameras.length > 0
              ? cameras.map((d, i) => (
                  <option key={d.deviceId} value={d.deviceId}>
                    {d.label || `Camera ${i + 1}`}
                  </option>
                ))
              : <option value="">No cameras found</option>
            }
          </select>
        </div>
      )}
      <Toggle
        label="Microphone"
        checked={captureMic}
        onChange={onCaptureMic}
        disabled={disabled}
      />
      {captureMic && (
        <div>
          <label>Microphone device</label>
          <select
            value={micDeviceId}
            onChange={e => onMicDeviceId(e.target.value)}
            disabled={disabled}
          >
            {mics.length > 0
              ? mics.map((d, i) => (
                  <option key={d.deviceId} value={d.deviceId}>
                    {d.label || `Microphone ${i + 1}`}
                  </option>
                ))
              : <option value="">No microphones found</option>
            }
          </select>
        </div>
      )}
    </Section>
  );
}
