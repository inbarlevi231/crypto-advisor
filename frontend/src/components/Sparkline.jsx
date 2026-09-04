import { useId } from 'react';

function Sparkline({ dataPoints, width = 280, height = 80 }) {
  const gradId = useId();

  if (!dataPoints || dataPoints.length < 2) {
    return <p className="muted">No chart data</p>;
  }

  const prices = dataPoints.map((d) => d.price);
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const range = max - min || 1;

  const padding = 4;
  const w = width - padding * 2;
  const h = height - padding * 2;

  const points = prices.map((p, i) => {
    const x = padding + (i / (prices.length - 1)) * w;
    const y = padding + h - ((p - min) / range) * h;
    return `${x},${y}`;
  });

  const isUp = prices[prices.length - 1] >= prices[0];
  const lineColor = isUp ? '#4fd1a5' : '#e07a6a';

  const areaPath =
    `M${points[0]} ` +
    points.slice(1).map((p) => `L${p}`).join(' ') +
    ` L${padding + w},${padding + h} L${padding},${padding + h} Z`;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="sparkline-svg" preserveAspectRatio="none">
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={lineColor} stopOpacity="0.35" />
          <stop offset="100%" stopColor={lineColor} stopOpacity="0.04" />
        </linearGradient>
      </defs>
      <path d={areaPath} fill={`url(#${gradId})`} />
      <polyline
        points={points.join(' ')}
        fill="none"
        stroke={lineColor}
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default Sparkline;
