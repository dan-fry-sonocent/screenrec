import { ReactNode } from 'react';

interface SectionProps {
  title: string;
  children: ReactNode;
}

export function Section({ title, children }: SectionProps) {
  return (
    <div className="section">
      <div className="section-header">{title}</div>
      <div className="section-body">{children}</div>
    </div>
  );
}
