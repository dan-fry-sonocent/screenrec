import { RefObject } from 'react';
import { fmtBytes, fmtElapsed } from '../utils/format';
import { RecordingsList }       from './RecordingsList';
import { CropOverlay }           from './CropOverlay';
import { RecState, RecordingEntry, CropRect } from '../types';

interface PreviewPaneProps {
  videoRef: RefObject<HTMLVideoElement | null>;
  recState: RecState;
  elapsed: number;
  opfsAvailable: boolean;
  bytesWritten: number;
  currentRes: string | null;
  currentCodec: string | null;
  recordings: RecordingEntry[];
  onPlay: (handle: FileSystemFileHandle) => void;
  onDownload: (handle: FileSystemFileHandle, name: string) => void;
  onDelete: (name: string) => void;
  showPlaceholder: boolean;
  cropRect: CropRect | null;
  onCropChange: (rect: CropRect | null) => void;
}

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
  cropRect,
  onCropChange,
}: PreviewPaneProps) {
  const isRecording = recState === 'recording' || recState === 'paused';
  const showCropOverlay = recState === 'preview' || isRecording;
  const cropEditable    = recState === 'preview';

  // Render the crop region's pixel size (computed against the source track's
  // intrinsic resolution, parsed from currentRes "WxH").
  let cropLabel: string | null = null;
  if (cropRect && currentRes) {
    const m = currentRes.match(/(\d+)\D+(\d+)/);
    if (m) {
      const srcW = Number(m[1]);
      const srcH = Number(m[2]);
      cropLabel = `${Math.round(cropRect.width * srcW)}×${Math.round(cropRect.height * srcH)}`;
    }
  }

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

        {showCropOverlay && (
          <CropOverlay
            videoRef={videoRef}
            cropRect={cropRect}
            editable={cropEditable}
            onCropChange={onCropChange}
          />
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
        {cropRect && (
          <div className="info-chip region-chip">
            Region: <strong>{cropLabel ?? 'cropped'}</strong>
            {cropEditable && (
              <button
                type="button"
                className="region-clear"
                aria-label="Clear crop region"
                onClick={() => onCropChange(null)}
              >
                ×
              </button>
            )}
          </div>
        )}
        {recState === 'preview' && !cropRect && (
          <div className="info-chip region-hint">
            Drag on the preview to crop
          </div>
        )}
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
