export default function VcrCounter({
  value,
  label,
  minDigits = 6,
}: {
  value: number;
  label?: string;
  minDigits?: number;
}) {
  const digits = value.toString().padStart(minDigits, "0").split("");

  return (
    <span style={{ display: "inline-flex", alignItems: "center" }}>
      <span className="vcr-counter">
        {digits.map((d, i) => (
          <span className="vcr-digit" key={i}>
            {d}
          </span>
        ))}
      </span>
      {label && <span className="vcr-label">{label}</span>}
    </span>
  );
}
