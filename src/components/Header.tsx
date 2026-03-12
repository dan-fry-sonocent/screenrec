import { RecState } from '../types';

interface HeaderProps {
  recState: RecState;
}

const STATUS_LABELS: Record<RecState, string> = {
  idle:       'Idle',
  acquiring:  'Ready',
  recording:  'Recording',
  paused:     'Paused',
  saving:     'Saving\u2026',
};

export function Header({ recState }: HeaderProps) {
  return (
    <header>
      <h1>Screen<span>Rec</span></h1>
      <div className="status-badge">
        <div className={`status-dot ${recState}`} />
        <span>{STATUS_LABELS[recState] ?? recState}</span>
      </div>
    </header>
  );
}
