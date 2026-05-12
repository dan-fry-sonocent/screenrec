import { Section }  from '../Section';
import { RecState } from '../../types';

export interface RecordingSectionProps {
  recState: RecState;
  opfsAvailable: boolean;
  onStartPreview:   () => void;
  onStopPreview:    () => void;
  onStartRecording: () => void;
  onStopRecording:  () => void;
  onPause:          () => void;
}

export function RecordingSection({
  recState, opfsAvailable,
  onStartPreview, onStopPreview, onStartRecording, onStopRecording, onPause,
}: RecordingSectionProps) {
  const isIdle      = recState === 'idle';
  const isPreview   = recState === 'preview';
  const isRecording = recState === 'recording' || recState === 'paused';
  const isAcquiring = recState === 'acquiring';
  const isSaving    = recState === 'saving';

  return (
    <Section title="Recording">
      <div className="recording-controls">
        {isIdle && (
          <>
            <button className="btn btn-ghost" onClick={onStartPreview}>
              &#128065; Start Preview
            </button>
            <button className="btn btn-primary" onClick={onStartRecording}>
              &#9679; Record
            </button>
          </>
        )}

        {isAcquiring && (
          <button className="btn btn-ghost" disabled>
            Acquiring&hellip;
          </button>
        )}

        {isPreview && (
          <>
            <button className="btn btn-primary" onClick={onStartRecording}>
              &#9679; Start Recording
            </button>
            <button className="btn btn-ghost" onClick={onStopPreview}>
              Stop Preview
            </button>
          </>
        )}

        {isRecording && (
          <>
            <button className="btn btn-warn" onClick={onPause}>
              {recState === 'paused' ? '▶ Resume' : '⏸ Pause'}
            </button>
            <button className="btn btn-danger" onClick={onStopRecording}>
              &#9632; Stop Recording
            </button>
          </>
        )}

        {isSaving && (
          <button className="btn btn-ghost" disabled>
            Saving&hellip;
          </button>
        )}
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
