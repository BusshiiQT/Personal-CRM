"use client";

type Props = {
  data: number[];          // e.g., weekly counts [w1, w2, ..., w8]
  height?: number;         // px
  strokeWidth?: number;    // px
  className?: string;      // extra classes for the wrapper
  title?: string;          // accessible title
};

export default function Sparkline({
  data,
  height = 40,
  strokeWidth = 2,
  className,
  title = "Trend",
}: Props) {
  if (!data || data.length === 0) {
    return <div className={className} aria-label={title} />;
  }

  const w = Math.max(1, data.length - 1);
  const max = Math.max(...data, 1);
  const h = height;

  const points = data.map((v, i) => {
    const x = (i / w) * 100;
    const y = 100 - (v / max) * 100;
    return `${x},${y}`;
  });

  // area fill points
  const areaPoints = [`0,100`, ...points, `100,100`].join(" ");

  return (
    <svg
      className={className}
      viewBox="0 0 100 100"
      role="img"
      aria-label={title}
      preserveAspectRatio="none"
      style={{ height }}
    >
      <title>{title}</title>
      {/* Fill (adapts to theme via currentColor + opacity) */}
      <polygon
        points={areaPoints}
        fill="currentColor"
        opacity="0.15"
      />
      {/* Line */}
      <polyline
        points={points.join(" ")}
        fill="none"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
}
