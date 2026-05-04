import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

// Lightweight donut gauge using two overlapping rounded rings — keeps the
// dependency surface small (no SVG/Skia just for the Exec Dashboard).
// Looks like the web `c100` widget: a 90° rotated stack of two half-circles
// composited so the foreground arc reveals the % value.
//
// For the "round trick" we colour two halves and rotate them — works on both
// iOS and Android without any extra deps.
export interface DonutProps {
  value: number;          // 0..100
  size?: number;
  thickness?: number;
  color: string;
  trackColor: string;
  bg: string;
  label?: string;
  valueText?: string;     // optional override (e.g. "55.17%")
  textColor?: string;
}

export const Donut: React.FC<DonutProps> = ({
  value,
  size = 110,
  thickness = 10,
  color,
  trackColor,
  bg,
  label,
  valueText,
  textColor,
}) => {
  const v = Math.max(0, Math.min(100, value));
  const r = size / 2;

  // Half-disc rotation trick: each "half" of the donut covers 50%. We rotate
  // the front half by (v/100)*360 degrees relative to its starting position.
  // For values <= 50 we only rotate the right half; > 50 we flip the left half.
  const right = Math.min(50, v);
  const left  = Math.max(0, v - 50);
  const rightDeg = (right / 50) * 180;
  const leftDeg  = (left  / 50) * 180;

  return (
    <View style={[styles.wrap, { width: size, height: size }]}>
      {/* Track ring */}
      <View style={[styles.full, { borderRadius: r, backgroundColor: trackColor }]} />
      {/* Right half — rotates to fill the first 50% */}
      <View style={[styles.halfClip, { width: r, height: size, left: r, borderTopRightRadius: r, borderBottomRightRadius: r }]}>
        <View
          style={[
            styles.halfFill,
            {
              width: size,
              height: size,
              borderRadius: r,
              backgroundColor: color,
              transform: [{ rotateZ: `${rightDeg - 180}deg` }],
              left: -r,
            },
          ]}
        />
      </View>
      {v > 50 && (
        <View style={[styles.halfClip, { width: r, height: size, left: 0, borderTopLeftRadius: r, borderBottomLeftRadius: r }]}>
          <View
            style={[
              styles.halfFill,
              {
                width: size,
                height: size,
                borderRadius: r,
                backgroundColor: color,
                transform: [{ rotateZ: `${leftDeg}deg` }],
                left: 0,
              },
            ]}
          />
        </View>
      )}
      {/* Inner mask */}
      <View
        style={[
          styles.center,
          {
            width: size - thickness * 2,
            height: size - thickness * 2,
            borderRadius: (size - thickness * 2) / 2,
            backgroundColor: bg,
          },
        ]}
      >
        <Text style={[styles.value, { color: textColor ?? color }]}>
          {valueText ?? `${v.toFixed(2)}%`}
        </Text>
        {label ? <Text style={[styles.label, { color: textColor ?? color }]}>{label}</Text> : null}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  full: { ...StyleSheet.absoluteFillObject },
  halfClip: { position: 'absolute', top: 0, overflow: 'hidden' },
  halfFill: { position: 'absolute', top: 0 },
  center: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  value: { fontSize: 16, fontWeight: '800' },
  label: { fontSize: 10, fontWeight: '600', marginTop: 2, opacity: 0.75 },
});

export default Donut;
