import React, { useMemo } from 'react';
import { View } from 'react-native';
import Svg, {
  Path,
  Circle,
  Line,
  Text as SvgText,
  Defs,
  LinearGradient as SvgLinearGradient,
  Stop,
} from 'react-native-svg';
import { useTheme } from '../../../app/theme/ThemeContext';

// Modern 12-point line chart used by MyDashboard for the monthly performance
// trend. Renders a smooth (Catmull-Rom → Bezier) line with a soft area-fill
// gradient underneath, using react-native-svg.
//
// Why hand-rolled: existing dashboard charts are SVG/CSS-based and we want to
// keep the dependency footprint small (no Victory / Skia just for two charts).
// Empty months ("month had no tasks") render as gaps in the path rather than
// 0-valued dips, so a quiet quarter doesn't look like a productivity crash.
export interface LineChartPoint {
  /** 1..12 */
  month: number;
  /** 0..100 (or arbitrary scale; ymax overrides). null = no data this month. */
  value: number | null;
}

export interface LineChartProps {
  points: LineChartPoint[];
  height?: number;
  width?: number;
  color?: string;
  /** y-axis upper bound; defaults to 100 (percent). */
  ymax?: number;
  /** Localised month labels — defaults to JFMAMJJASOND. */
  monthLabels?: string[];
}

const DEFAULT_MONTHS = ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'];

// Catmull-Rom → Bezier smoothing. Produces a gentle curve through every point
// without overshoot, which reads more "modern dashboard" than straight polylines.
function smoothPath(pts: { x: number; y: number }[]): string {
  if (pts.length === 0) return '';
  if (pts.length === 1) return `M ${pts[0].x} ${pts[0].y}`;
  let d = `M ${pts[0].x} ${pts[0].y}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] ?? p2;
    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;
    d += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`;
  }
  return d;
}

const LineChart: React.FC<LineChartProps> = ({
  points,
  height = 160,
  width,
  color,
  ymax = 100,
  monthLabels = DEFAULT_MONTHS,
}) => {
  const { colors } = useTheme();
  const stroke = color ?? colors.primary;
  const gradId = useMemo(() => `lineGrad-${Math.random().toString(36).slice(2, 8)}`, []);

  // Use a wide virtual viewBox; SVG scales to parent. Fixed 360 reads nicely
  // on phones in both portrait and landscape thanks to preserveAspectRatio.
  const w = width ?? 360;
  const padL = 30;
  const padR = 14;
  const padT = 14;
  const padB = 24;
  const innerW = w - padL - padR;
  const innerH = height - padT - padB;

  const xFor = (m: number) => padL + ((m - 1) / 11) * innerW;
  const yFor = (v: number) => padT + (1 - Math.max(0, Math.min(ymax, v)) / ymax) * innerH;

  // Split into contiguous segments (gap on null), then build a smoothed path
  // for each + an area-fill path that drops to the baseline.
  const segments = useMemo(() => {
    const runs: { x: number; y: number; v: number; m: number }[][] = [];
    let cur: { x: number; y: number; v: number; m: number }[] = [];
    for (const p of points) {
      if (p.value == null) {
        if (cur.length > 0) { runs.push(cur); cur = []; }
        continue;
      }
      cur.push({ x: xFor(p.month), y: yFor(p.value), v: p.value, m: p.month });
    }
    if (cur.length > 0) runs.push(cur);
    return runs;
  }, [points, w, height, ymax]);

  const yTicks = [0, 50, 100].filter(t => t <= ymax);
  const baseline = yFor(0);

  return (
    <View style={{ width: '100%' }}>
      <Svg width="100%" height={height} viewBox={`0 0 ${w} ${height}`}>
        <Defs>
          <SvgLinearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={stroke} stopOpacity={0.32} />
            <Stop offset="1" stopColor={stroke} stopOpacity={0.02} />
          </SvgLinearGradient>
        </Defs>

        {/* Subtle horizontal grid */}
        {yTicks.map((t) => (
          <Line
            key={`g-${t}`}
            x1={padL}
            x2={w - padR}
            y1={yFor(t)}
            y2={yFor(t)}
            stroke={colors.divider}
            strokeWidth={1}
            strokeDasharray="3,5"
            opacity={0.6}
          />
        ))}
        {/* Y-axis labels */}
        {yTicks.map((t) => (
          <SvgText
            key={`yl-${t}`}
            x={padL - 6}
            y={yFor(t) + 3}
            fontSize="9"
            fontWeight="600"
            fill={colors.textMuted}
            textAnchor="end"
          >
            {t}
          </SvgText>
        ))}
        {/* X-axis month labels */}
        {monthLabels.map((m, i) => (
          <SvgText
            key={`xl-${i}`}
            x={xFor(i + 1)}
            y={height - 6}
            fontSize="9"
            fontWeight="600"
            fill={colors.textMuted}
            textAnchor="middle"
          >
            {m}
          </SvgText>
        ))}

        {/* Smooth area + line per contiguous run */}
        {segments.map((seg, idx) => {
          const linePath = smoothPath(seg);
          const areaPath = seg.length > 1
            ? `${linePath} L ${seg[seg.length - 1].x} ${baseline} L ${seg[0].x} ${baseline} Z`
            : '';
          return (
            <React.Fragment key={`seg-${idx}`}>
              {areaPath ? <Path d={areaPath} fill={`url(#${gradId})`} /> : null}
              {seg.length > 1 ? (
                <Path d={linePath} fill="none" stroke={stroke} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
              ) : null}
              {seg.map((p, j) => (
                <React.Fragment key={`dot-${idx}-${j}`}>
                  <Circle cx={p.x} cy={p.y} r={4.5} fill="#FFFFFF" />
                  <Circle cx={p.x} cy={p.y} r={3} fill={stroke} />
                </React.Fragment>
              ))}
            </React.Fragment>
          );
        })}
      </Svg>
    </View>
  );
};

export default LineChart;
