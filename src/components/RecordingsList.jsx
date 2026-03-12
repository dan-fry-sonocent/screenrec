import { useState } from 'react';
import { fmtBytes, fmtDate } from '../utils/format.js';

export function RecordingsList({ recordings, onPlay, onDownload, onDelete }) {
  if (recordings.length === 0) {
    return (
      <span style={{ color: 'var(--text-dim)', fontSize: '13px' }}>
        No recordings yet.
      </span>
    );
  }

  return (
    <div className="recordings-list">
      {recordings.map(({ name, handle, file }) => (
        <RecordingItem
          key={name}
          name={name}
          handle={handle}
          file={file}
          onPlay={onPlay}
          onDownload={onDownload}
          onDelete={onDelete}
        />
      ))}
    </div>
  );
}

function RecordingItem({ name, handle, file, onPlay, onDownload, onDelete }) {
  const [confirming, setConfirming] = useState(false);

  function handleDeleteClick() {
    if (confirming) {
      onDelete(name);
    } else {
      setConfirming(true);
      setTimeout(() => setConfirming(false), 3000);
    }
  }

  return (
    <div className="recording-item">
      <div className="recording-icon">🎬</div>
      <div className="recording-info">
        <div className="recording-name" title={name}>{name}</div>
        <div className="recording-meta">
          {fmtBytes(file.size)} &middot; {fmtDate(new Date(file.lastModified))}
        </div>
      </div>
      <div className="recording-actions">
        <button className="btn btn-ghost btn-sm" onClick={() => onPlay(handle)}>
          ▶ Play
        </button>
        <button className="btn btn-primary btn-sm" onClick={() => onDownload(handle, name)}>
          ⬇ Download
        </button>
        <button
          className={`btn btn-sm ${confirming ? 'btn-danger' : 'btn-ghost btn-icon'}`}
          onClick={handleDeleteClick}
          title="Delete"
        >
          {confirming ? 'Confirm?' : '🗑'}
        </button>
      </div>
    </div>
  );
}
