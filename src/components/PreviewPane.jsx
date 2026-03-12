import { fmtBytes, fmtElapsed } from '../utils/format.js';
import { RecordingsList }       from './RecordingsList.jsx';

export function PreviewPane({
  videoRef,
  recState,
  elapsed,
  opfsAvailable,
  bytesWritten,
  currentRes,
  currentCodec,
  recordings,
  onPlay,
  onDownload,
  onDelete,
  showPlaceholder,
}) {
  const isRecording = recState === 'recording' || recState === 'paused';

  return (
    <div className="preview-area">

      <div className="preview-wrap">
        {/* The video element is controlled imperatively via videoRef in App. */}
        <video
          ref={videoRef}
          className="preview-video"
          autoPlay
          playsInline
        />

        {showPlaceholder && (
          <div className="preview-placeholder">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none"
                 stroke="currentColor" strokeWidth="1.5">
              <rect x="2" y="3" width="20" height="14" rx="2" />
              <path d="M8 21h8M12 17v4" />
            </svg>
            <span>Preview will appear here</span>
          </div>
        )}

        {isRecording && (
          <div className="timer-overlay">
            {fmtElapsed(elapsed)}
          </div>
        )}

        {isRecording && (
          <div className={`rec-indicator${recState === 'paused' ? ' paused' : ''}`}>
            REC
          </div>
        )}
      </div>

      <div className="info-bar">
        <div className="info-chip">
          Storage: <strong>{opfsAvailable ? 'OPFS' : 'Memory'}</strong>
        </div>
        <div className="info-chip">
          Codec: <strong>{currentCodec ?? '—'}</strong>
        </div>
        <div className="info-chip">
          Resolution: <strong>{currentRes ?? '—'}</strong>
        </div>
        <div className="info-chip">
          Size: <strong>{bytesWritten > 0 ? fmtBytes(bytesWritten) : '—'}</strong>
        </div>
      </div>

      <div className="recordings-section">
        <h2>Saved Recordings</h2>
        <RecordingsList
          recordings={recordings}
          onPlay={onPlay}
          onDownload={onDownload}
          onDelete={onDelete}
        />
      </div>

    </div>
  );
}
