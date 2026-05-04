import React from 'react';
import { View } from 'react-native';
import Svg, { Polyline, Circle, Defs, LinearGradient, Stop, Path } from 'react-native-svg';

interface Props {
  data: number[];
  width?: number;
  height?: number;
  color: string;
  fillColor?: string;
  strokeWidth?: number;
  showDots?: boolean;
}

/**
 * Lightweight sparkline chart for cockpit KPI cards.
 * Renders a smooth area-filled trend line over N data points.
 */
const Sparkline: React.FC<Props> = ({
  data,
  width = 100,
  height = 30,
  color,
  fillColor,
  strokeWidth = 2,
  showDots = false,
}) => {
  if (!data || data.length === 0) return null;

  const max = Math.max(...data, 1);
  const min = Math.min(...data, 0);
  const range = max - min || 1;

  const stepX = data.length > 1 ? width / (data.length - 1) : 0;
  const points = data.map((v, i) => {
    const x = i * stepX;
    const y = height - ((v - min) / range) * height * 0.9 - height * 0.05;
    return { x, y, value: v };
  });

  const polylinePoints = points.map((p) => `${p.x},${p.y}`).join(' ');

  // Create area path (fill below line)
  const areaPath = `M ${points[0].x},${height} ${points
    .map((p) => `L ${p.x},${p.y}`)
    .join(' ')} L ${points[points.length - 1].x},${height} Z`;

  const gradId = `spark-grad-${color.replace('#', '')}`;

  return (
    <View style={{ width, height }}>
      <Svg width={width} height={height}>
        <Defs>
          <LinearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor={fillColor || color} stopOpacity="0.4" />
            <Stop offset="100%" stopColor={fillColor || color} stopOpacity="0.05" />
          </LinearGradient>
        </Defs>
        <Path d={areaPath} fill={`url(#${gradId})`} />
        <Polyline
          points={polylinePoints}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {showDots &&
          points.map((p, i) => (
            <Circle key={i} cx={p.x} cy={p.y} r={2} fill={color} />
          ))}
        {/* Always highlight the last point */}
        <Circle cx={points[points.length - 1].x} cy={points[points.length - 1].y} r={3} fill={color} />
      </Svg>
    </View>
  );
};

export default Sparkline;
