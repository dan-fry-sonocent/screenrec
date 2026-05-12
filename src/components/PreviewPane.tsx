import { RefObject } from 'react';
import { fmtBytes, fmtElapsed } from '../utils/format';
import { RecordingsList }       from './RecordingsList';
import { CropOverlay }           from './CropOverlay';
import { CensorLayer }           from './CensorLayer';
import { RecState, RecordingEntry, CropRect, CensorRect, EditMode } from '../types';

const CENSOR_PRESETS = ['#000000', '#ffffff', '#e15252', '#888888'];

interface PreviewPaneProps {
  videoRef: RefObject<HTMLVideoElement>;
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
  // Crop
  cropRect: CropRect | null;
  onCropChange: (rect: CropRect | null) => void;
  // Editing
  editMode: EditMode;
  onEditModeChange: (mode: EditMode) => void;
  // Censor
  censorRects: CensorRect[];
  onAddCensor: (rect: CensorRect) => void;
  onUpdateCensor: (id: string, patch: Partial<CensorRect>) => void;
  onDeleteCensor: (id: string) => void;
  selectedCensorId: string | null;
  onSelectCensor: (id: string | null) => void;
  censorColor: string;
  onCensorColorChange: (color: string) => void;
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
  editMode,
  onEditModeChange,
  censorRects,
  onAddCensor,
  onUpdateCensor,
  onDeleteCensor,
  selectedCensorId,
  onSelectCensor,
  censorColor,
  onCensorColorChange,
}: PreviewPaneProps) {
  const isRecording      = recState === 'recording' || recState === 'paused';
  const overlaysVisible  = recState === 'preview' || isRecording;
  const canEdit          = recState === 'preview';
  const cropEditable     = canEdit && editMode === 'crop';
  const censorEditable   = canEdit && editMode === 'censor';

  // Render the crop region's pixel size from currentRes "WxH".
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

      {canEdit && (
        <div className="preview-toolbar">
          <div className="mode-pills" role="tablist" aria-label="Edit mode">
            <button
              type="button"
              role="tab"
              aria-selected={editMode === 'crop'}
              className={`mode-pill${editMode === 'crop' ? ' active' : ''}`}
              onClick={() => onEditModeChange('crop')}
            >
              Crop
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={editMode === 'censor'}
              className={`mode-pill${editMode === 'censor' ? ' active' : ''}`}
              onClick={() => onEditModeChange('censor')}
            >
              Censor
            </button>
          </div>

          {editMode === 'censor' && (
            <div className="censor-controls">
              <span className="censor-controls-label">Color:</span>
              {CENSOR_PRESETS.map(c => (
                <button
                  key={c}
                  type="button"
                  aria-label={`Set color ${c}`}
                  className={`color-swatch${c.toLowerCase() === censorColor.toLowerCase() ? ' selected' : ''}`}
                  style={{ backgroundColor: c }}
                  onClick={() => {
                    onCensorColorChange(c);
                    if (selectedCensorId) onUpdateCensor(selectedCensorId, { color: c });
                  }}
                />
              ))}
              <label className="color-swatch custom" aria-label="Custom color">
                <input
                  type="color"
                  value={censorColor}
                  onChange={e => {
                    onCensorColorChange(e.target.value);
                    if (selectedCensorId) onUpdateCensor(selectedCensorId, { color: e.target.value });
                  }}
                />
              </label>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                disabled={!selectedCensorId}
                onClick={() => { if (selectedCensorId) onDeleteCensor(selectedCensorId); }}
              >
                Delete
              </button>
            </div>
          )}
        </div>
      )}

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

        {overlaysVisible && (
          <CropOverlay
            videoRef={videoRef}
            cropRect={cropRect}
            editable={cropEditable}
            onCropChange={onCropChange}
          />
        )}

        {overlaysVisible && (
          <CensorLayer
            videoRef={videoRef}
            rects={censorRects}
            selectedId={selectedCensorId}
            editable={censorEditable}
            newColor={censorColor}
            onAdd={onAddCensor}
            onUpdate={onUpdateCensor}
            onSelect={onSelectCensor}
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
        {recState === 'preview' && !cropRect && editMode === 'crop' && (
          <div className="info-chip region-hint">
            Drag on the preview to crop
          </div>
        )}
        {recState === 'preview' && editMode === 'censor' && censorRects.length === 0 && (
          <div className="info-chip region-hint">
            Drag on the preview to add a censor box
          </div>
        )}
        {censorRects.length > 0 && (
          <div className="info-chip">
            Censors: <strong>{censorRects.length}</strong>
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
