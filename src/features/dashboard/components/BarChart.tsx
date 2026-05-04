import React, { useMemo } from 'react';
import { View } from 'react-native';
import Svg, {
  Rect,
  Line,
  Text as SvgText,
  Defs,
  LinearGradient as SvgLinearGradient,
  Stop,
} from 'react-native-svg';
import { useTheme } from '../../../app/theme/ThemeContext';

// Modern paired bar chart used by MyDashboard for monthly Assigned vs Completed.
// Auto-scales the y-axis to the max across both series so bars stay readable
// even when one user only ever has 5 tasks. Bars use vertical gradients +
// rounded tops for a more polished look.
export interface BarChartGroup {
  label: string;
  a: number;   // first series (e.g. assigned)
  b: number;   // second series (e.g. completed)
}

export interface BarChartProps {
  groups: BarChartGroup[];
  height?: number;
  width?: number;
  colorA?: string;
  colorB?: string;
}

const BarChart: React.FC<BarChartProps> = ({
  groups,
  height = 180,
  width,
  colorA,
  colorB,
}) => {
  const { colors } = useTheme();
  const cA = colorA ?? colors.primary;
  const cB = colorB ?? colors.success;
  const idA = useMemo(() => `barA-${Math.random().toString(36).slice(2, 8)}`, []);
  const idB = useMemo(() => `barB-${Math.random().toString(36).slice(2, 8)}`, []);

  const w = width ?? 360;
  const padL = 30;
  const padR = 14;
  const padT = 14;
  const padB = 24;
  const innerW = w - padL - padR;
  const innerH = height - padT - padB;

  const yMax = useMemo(() => {
    const m = Math.max(1, ...groups.flatMap(g => [g.a, g.b]));
    // Round up to a "nice" number so axis labels are readable.
    const pow = Math.pow(10, Math.floor(Math.log10(m)));
    const n = m / pow;
    const nice = n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10;
    return nice * pow;
  }, [groups]);

  const groupCount = groups.length || 1;
  const groupW = innerW / groupCount;
  const barW = Math.max(3, groupW * 0.34);
  const gap = Math.max(1.5, groupW * 0.06);

  const yFor = (v: number) => padT + (1 - Math.max(0, v) / yMax) * innerH;
  const baseline = yFor(0);

  const yTicks = [0, yMax / 2, yMax];

  return (
    <View style={{ width: '100%' }}>
      <Svg width="100%" height={height} viewBox={`0 0 ${w} ${height}`}>
        <Defs>
          <SvgLinearGradient id={idA} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={cA} stopOpacity={1} />
            <Stop offset="1" stopColor={cA} stopOpacity={0.55} />
          </SvgLinearGradient>
          <SvgLinearGradient id={idB} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={cB} stopOpacity={1} />
            <Stop offset="1" stopColor={cB} stopOpacity={0.55} />
          </SvgLinearGradient>
        </Defs>

        {/* Grid */}
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
            {Math.round(t)}
          </SvgText>
        ))}

        {groups.map((g, i) => {
          const cx = padL + i * groupW + groupW / 2;
          const ay = yFor(g.a);
          const by = yFor(g.b);
          const ah = Math.max(0, baseline - ay);
          const bh = Math.max(0, baseline - by);
          return (
            <React.Fragment key={`g-${i}`}>
              {ah > 0 && (
                <Rect
                  x={cx - barW - gap / 2}
                  y={ay}
                  width={barW}
                  height={ah}
                  rx={Math.min(barW / 2, 4)}
                  fill={`url(#${idA})`}
                />
              )}
              {bh > 0 && (
                <Rect
                  x={cx + gap / 2}
                  y={by}
                  width={barW}
                  height={bh}
                  rx={Math.min(barW / 2, 4)}
                  fill={`url(#${idB})`}
                />
              )}
              <SvgText
                x={cx}
                y={height - 6}
                fontSize="9"
                fontWeight="600"
                fill={colors.textMuted}
                textAnchor="middle"
              >
                {g.label}
              </SvgText>
            </React.Fragment>
          );
        })}
      </Svg>
    </View>
  );
};

export default BarChart;
