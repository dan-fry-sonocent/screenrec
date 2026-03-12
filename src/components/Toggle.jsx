export function Toggle({ label, sublabel, checked, onChange, disabled }) {
  return (
    <div className="toggle-row">
      <div>
        <div className="toggle-label">{label}</div>
        {sublabel && <div className="toggle-sub">{sublabel}</div>}
      </div>
      <label className="switch">
        <input
          type="checkbox"
          checked={checked}
          onChange={e => onChange(e.target.checked)}
          disabled={disabled}
        />
        <span className="slider" />
      </label>
    </div>
  );
}
