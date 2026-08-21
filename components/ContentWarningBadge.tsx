export default function ContentWarningBadge({ text }: { text: string }) {
  return <span className="cw-badge">⚠ {text}</span>;
}
