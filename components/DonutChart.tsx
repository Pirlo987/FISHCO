import React from 'react';
import { View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

export type DonutSlice = {
  value: number;
  color: string;
  label?: string;
};

type Props = {
  data: DonutSlice[];
  size?: number;
  strokeWidth?: number;
  centerLabel?: React.ReactNode;
};

const SHADOW_STROKE = 5; // largeur du halo extérieur

export default function DonutChart({ data, size = 140, strokeWidth = 10, centerLabel }: Props) {
  const total = data.reduce((s, d) => s + d.value, 0);
  if (total === 0) return null;

  const cx = size / 2;
  const cy = size / 2;

  // Le rayon de l'anneau principal est centré dans la moitié du SVG
  // On laisse de la place pour le halo extérieur
  const outerPadding = SHADOW_STROKE + 2;
  const radius = (size - strokeWidth - outerPadding * 2) / 2;

  // Le halo se dessine sur un cercle plus grand, juste à l'extérieur du bord de l'anneau
  const shadowRadius = radius + strokeWidth / 2 + SHADOW_STROKE / 2;

  const circumference = 2 * Math.PI * radius;
  const shadowCircumference = 2 * Math.PI * shadowRadius;

  // Gap entre segments : ~4° pour que la séparation soit bien visible
  const gapDeg = data.length > 1 ? 4 : 0;
  const gapRad = (gapDeg * Math.PI) / 180;

  let currentAngle = -Math.PI / 2; // départ en haut

  const segments = data.map((slice) => {
    const sliceAngle = (slice.value / total) * 2 * Math.PI;
    const drawAngle = Math.max(sliceAngle - gapRad, 0);

    const dash = (drawAngle / (2 * Math.PI)) * circumference;
    const dashOffset = circumference - dash;

    const shadowDash = (drawAngle / (2 * Math.PI)) * shadowCircumference;
    const shadowDashOffset = shadowCircumference - shadowDash;

    const rotation = (currentAngle * 180) / Math.PI;
    currentAngle += sliceAngle;

    return { ...slice, dash, dashOffset, shadowDash, shadowDashOffset, rotation };
  });

  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size}>
        {/* Track (fond gris) */}
        <Circle
          cx={cx}
          cy={cy}
          r={radius}
          fill="none"
          stroke="#F0F0F0"
          strokeWidth={strokeWidth}
        />

        {/* Halos extérieurs — cercle à shadowRadius */}
        {segments.map((seg, i) => (
          <Circle
            key={`shadow-${i}`}
            cx={cx}
            cy={cy}
            r={shadowRadius}
            fill="none"
            stroke={seg.color}
            strokeWidth={SHADOW_STROKE}
            strokeDasharray={`${seg.shadowDash} ${shadowCircumference}`}
            strokeDashoffset={seg.shadowDashOffset}
            strokeLinecap="butt"
            opacity={0.12}
            rotation={seg.rotation}
            origin={`${cx}, ${cy}`}
          />
        ))}

        {/* Segments principaux */}
        {segments.map((seg, i) => (
          <Circle
            key={`seg-${i}`}
            cx={cx}
            cy={cy}
            r={radius}
            fill="none"
            stroke={seg.color}
            strokeWidth={strokeWidth}
            strokeDasharray={`${seg.dash} ${circumference}`}
            strokeDashoffset={seg.dashOffset}
            strokeLinecap="butt"
            rotation={seg.rotation}
            origin={`${cx}, ${cy}`}
          />
        ))}
      </Svg>

      {centerLabel && (
        <View
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: size,
            height: size,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {centerLabel}
        </View>
      )}
    </View>
  );
}
