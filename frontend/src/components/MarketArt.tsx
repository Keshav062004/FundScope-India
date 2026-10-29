// Deterministic abstract candlestick field, rendered in the product's own palette.
// Used instead of stock photography: no licensing risk, no hotlink to break, and it
// reads as "this product's chart language" rather than a generic trading-floor photo.
const CANDLES = [
  { x: 0, open: 44, close: 58, high: 36, low: 64, up: true },
  { x: 1, open: 58, close: 50, high: 52, low: 66, up: false },
  { x: 2, open: 50, close: 62, high: 44, low: 68, up: true },
  { x: 3, open: 62, close: 40, high: 36, low: 70, up: false },
  { x: 4, open: 40, close: 54, high: 34, low: 60, up: true },
  { x: 5, open: 54, close: 68, high: 48, low: 72, up: true },
  { x: 6, open: 68, close: 46, high: 40, low: 76, up: false },
  { x: 7, open: 46, close: 60, high: 38, low: 66, up: true },
  { x: 8, open: 60, close: 74, high: 54, low: 80, up: true },
  { x: 9, open: 74, close: 56, high: 50, low: 82, up: false },
  { x: 10, open: 56, close: 72, high: 48, low: 84, up: true },
  { x: 11, open: 72, close: 86, high: 64, low: 90, up: true },
];

const COLUMN_WIDTH = 34;
const BODY_WIDTH = 13;

export default function MarketArt({ className }: { className?: string }) {
  const width = CANDLES.length * COLUMN_WIDTH;
  const trendPoints = CANDLES.map((c) => `${c.x * COLUMN_WIDTH + COLUMN_WIDTH / 2},${100 - c.close}`).join(' ');

  return (
    <svg viewBox={`0 0 ${width} 100`} className={className} aria-hidden="true" preserveAspectRatio="none">
      <defs>
        <linearGradient id="marketart-fade" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--brand)" stopOpacity="0.16" />
          <stop offset="100%" stopColor="var(--brand)" stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon
        points={`0,100 ${trendPoints} ${width},100`}
        fill="url(#marketart-fade)"
      />
      {CANDLES.map((c) => {
        const cx = c.x * COLUMN_WIDTH + COLUMN_WIDTH / 2;
        const bodyTop = 100 - Math.max(c.open, c.close);
        const bodyHeight = Math.max(Math.abs(c.open - c.close), 2.5);
        const color = c.up ? 'var(--status-good)' : 'var(--status-critical)';
        return (
          <g key={c.x}>
            <line x1={cx} x2={cx} y1={100 - c.low} y2={100 - c.high} stroke={color} strokeOpacity={0.45} strokeWidth={1} />
            <rect x={cx - BODY_WIDTH / 2} y={bodyTop} width={BODY_WIDTH} height={bodyHeight} rx={2} fill={color} fillOpacity={0.85} />
          </g>
        );
      })}
      <polyline points={trendPoints} fill="none" stroke="var(--brand-ink)" strokeWidth={1.4} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
