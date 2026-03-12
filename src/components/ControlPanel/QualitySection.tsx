import { Section }    from '../Section';
import { CodecOption } from '../../types';

export interface QualitySectionProps {
  supportedCodecs: CodecOption[]; codecIndex: number; onCodecIndex: (v: number) => void;
  resolution: string;   onResolution: (v: string) => void;
  fps: number;          onFps: (v: number) => void;
  videoBitrate: number; onVideoBitrate: (v: number) => void;
  audioBitrate: number; onAudioBitrate: (v: number) => void;
  disabled: boolean;
}

export function QualitySection({
  supportedCodecs, codecIndex, onCodecIndex,
  resolution,      onResolution,
  fps,             onFps,
  videoBitrate,    onVideoBitrate,
  audioBitrate,    onAudioBitrate,
  disabled,
}: QualitySectionProps) {
  return (
    <Section title="Quality">
      <div>
        <label>Codec</label>
        <select
          value={codecIndex}
          onChange={e => onCodecIndex(Number(e.target.value))}
          disabled={disabled}
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
            disabled={disabled}
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
            disabled={disabled}
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
            disabled={disabled}
          />
          <div className="range-val">{videoBitrate} Mbps</div>
        </div>
      </div>

      <div>
        <label>Audio bitrate</label>
        <select
          value={audioBitrate}
          onChange={e => onAudioBitrate(Number(e.target.value))}
          disabled={disabled}
        >
          <option value={320000}>320 kbps</option>
          <option value={192000}>192 kbps</option>
          <option value={128000}>128 kbps</option>
          <option value={64000}>64 kbps</option>
        </select>
      </div>
    </Section>
  );
}
