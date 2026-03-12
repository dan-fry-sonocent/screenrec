export function Section({ title, children }) {
  return (
    <div className="section">
      <div className="section-header">{title}</div>
      <div className="section-body">{children}</div>
    </div>
  );
}
