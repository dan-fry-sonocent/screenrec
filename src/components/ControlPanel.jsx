import { Toggle }  from './Toggle.jsx';
import { Section } from './Section.jsx';

export function ControlPanel({
  // Sources
  captureScreen,   onCaptureScreen,
  captureSysAudio, onCaptureSysAudio,
  captureCamera,   onCaptureCamera,
  captureMic,      onCaptureMic,
  cameras, cameraDeviceId, onCameraDeviceId,
  mics,    micDeviceId,    onMicDeviceId,
  // Quality
  supportedCodecs, codecIndex, onCodecIndex,
  resolution,      onResolution,
  fps,             onFps,
  videoBitrate,    onVideoBitrate,
  audioBitrate,    onAudioBitrate,
  // Recording
  recState, opfsAvailable,
  onStart, onPause, onStop,
}) {
  const idle     = recState === 'idle';
  const busy     = !idle;

  return (
    <div className="panel">

      <Section title="Sources">
        <Toggle
          label="Screen / Window"
          sublabel="Capture display or app window"
          checked={captureScreen}
          onChange={onCaptureScreen}
          disabled={busy}
        />
        <Toggle
          label="System Audio"
          sublabel="From screen share (Chrome/Edge)"
          checked={captureSysAudio}
          onChange={onCaptureSysAudio}
          disabled={busy}
        />
        <Toggle
          label="Camera"
          sublabel="Webcam"
          checked={captureCamera}
          onChange={onCaptureCamera}
          disabled={busy}
        />
        {captureCamera && (
          <div>
            <label>Camera device</label>
            <select
              value={cameraDeviceId}
              onChange={e => onCameraDeviceId(e.target.value)}
              disabled={busy}
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
          disabled={busy}
        />
        {captureMic && (
          <div>
            <label>Microphone device</label>
            <select
              value={micDeviceId}
              onChange={e => onMicDeviceId(e.target.value)}
              disabled={busy}
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

      <Section title="Quality">
        <div>
          <label>Codec</label>
          <select
            value={codecIndex}
            onChange={e => onCodecIndex(Number(e.target.value))}
            disabled={busy}
          >
            {supportedCodecs.length > 0
              ? supportedCodecs.map((c, i) => (
                  <option key={i} value={i}>{c.label}</option>
                ))
              : <option value={-1}>Browser default</option>
            }
          </select>
        </div>

        <div className="row">
          <div>
            <label>Resolution</label>
            <select
              value={resolution}
              onChange={e => onResolution(e.target.value)}
              disabled={busy}
            >
              <option value="source">Source</option>
              <option value="3840x2160">4K (2160p)</option>
              <option value="2560x1440">1440p</option>
              <option value="1920x1080">1080p</option>
              <option value="1280x720">720p</option>
              <option value="854x480">480p</option>
            </select>
          </div>
          <div>
            <label>Frame rate</label>
            <select
              value={fps}
              onChange={e => onFps(Number(e.target.value))}
              disabled={busy}
            >
              <option value={60}>60 fps</option>
              <option value={30}>30 fps</option>
              <option value={24}>24 fps</option>
              <option value={15}>15 fps</option>
            </select>
          </div>
        </div>

        <div>
          <label>Video bitrate</label>
          <div className="range-row">
            <input
              type="range"
              min="1" max="100" step="1"
              value={videoBitrate}
              onChange={e => onVideoBitrate(Number(e.target.value))}
              disabled={busy}
            />
            <div className="range-val">{videoBitrate} Mbps</div>
          </div>
        </div>

        <div>
          <label>Audio bitrate</label>
          <select
            value={audioBitrate}
            onChange={e => onAudioBitrate(Number(e.target.value))}
            disabled={busy}
          >
            <option value={320000}>320 kbps</option>
            <option value={192000}>192 kbps</option>
            <option value={128000}>128 kbps</option>
            <option value={64000}>64 kbps</option>
          </select>
        </div>
      </Section>

      <Section title="Recording">
        <div className="recording-controls">
          <button className="btn btn-primary" onClick={onStart} disabled={!idle}>
            &#9679; Start
          </button>
          <button className="btn btn-warn" onClick={onPause} disabled={idle}>
            {recState === 'paused' ? '▶ Resume' : '⏸ Pause'}
          </button>
          <button className="btn btn-danger" onClick={onStop} disabled={idle}>
            &#9632; Stop
          </button>
        </div>
        {!opfsAvailable && (
          <div className="notice notice-info">
            OPFS unavailable — recordings are held in memory and downloaded automatically on stop.
            Use Chrome, Edge, or Firefox for persistent storage.
          </div>
        )}
      </Section>

    </div>
  );
}
