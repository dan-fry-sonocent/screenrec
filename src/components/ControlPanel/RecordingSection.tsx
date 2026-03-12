import { Section }  from '../Section';
import { RecState } from '../../types';

export interface RecordingSectionProps {
  recState: RecState;
  opfsAvailable: boolean;
  onStart: () => void;
  onPause: () => void;
  onStop:  () => void;
}

export function RecordingSection({
  recState, opfsAvailable, onStart, onPause, onStop,
}: RecordingSectionProps) {
  const idle = recState === 'idle';

  return (
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
          OPFS unavailable — recordings are held in memory and downloaded
          automatically on stop. Use Chrome, Edge, or Firefox for persistent
          storage.
        </div>
      )}
    </Section>
  );
}
