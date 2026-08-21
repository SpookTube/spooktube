export default function ContentWarningBadge({ text }: { text: string | null | undefined }) {
  if (!text || !text.trim()) return null;
  return <span className="cw-badge">⚠ {text}</span>;
}
