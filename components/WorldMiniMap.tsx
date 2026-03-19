import React from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, { Path, Rect, Text as SvgText, G } from 'react-native-svg';

export type WorldMiniMapProps = {
  tags?: string[];
  height?: number;
  rounded?: number;
};

// ── Continent silhouettes simplifiées (viewBox 300×150) ──────────────────────
// Formes reconnaissables mais légères
const CONTINENT_PATHS: Record<string, string> = {
  // Amériques
  americas:
    'M60,18 L68,16 L76,18 L80,24 L82,34 L80,48 L83,58 L80,72 L76,88 L70,102 L64,108 L58,104 L54,90 L52,74 L54,60 L50,46 L52,32 L56,22 Z',
  // Europe
  europe:
    'M148,18 L158,16 L166,18 L170,14 L176,18 L179,26 L176,34 L169,36 L173,42 L170,48 L163,50 L159,46 L154,50 L148,48 L144,42 L146,34 L143,26 Z',
  // Afrique
  africa:
    'M148,54 L158,52 L168,54 L174,62 L176,74 L175,88 L170,100 L162,110 L155,113 L148,110 L142,100 L139,86 L140,72 L143,60 Z',
  // Asie
  asia:
    'M178,14 L196,12 L218,11 L238,13 L252,16 L260,14 L267,20 L268,30 L262,40 L250,44 L238,42 L228,48 L214,52 L200,56 L190,52 L182,44 L178,34 L176,24 Z',
  // Océanie
  oceania:
    'M238,82 L250,80 L260,82 L265,90 L262,98 L250,102 L240,99 L236,90 Z',
};

// Centre de chaque continent pour le label
const CONTINENT_LABELS: Record<string, { x: number; y: number; label: string }> = {
  americas: { x: 66, y: 64, label: 'AM' },
  europe:   { x: 160, y: 33, label: 'EU' },
  africa:   { x: 158, y: 82, label: 'AF' },
  asia:     { x: 222, y: 32, label: 'AS' },
  oceania:  { x: 251, y: 91, label: 'OC' },
};

// Tags qui activent chaque continent
const CONTINENT_TAGS: Record<string, string[]> = {
  americas: ['america', 'freshwater_na', 'freshwater_sa'],
  europe:   ['europe', 'freshwater_eu'],
  africa:   ['africa', 'freshwater_af'],
  asia:     ['asia', 'freshwater_as'],
  oceania:  ['oceania'],
};

// ── Zones maritimes [x, y, w, h] ─────────────────────────────────────────────
const SEA_RECTS: Array<{
  id: string;
  x: number; y: number; w: number; h: number;
  tags: string[];
  small?: boolean;
}> = [
  { id: 'pac_n_w', x: 4,   y: 18, w: 48, h: 44, tags: ['pac', 'pac_n', 'pacific'] },
  { id: 'pac_s_w', x: 4,   y: 68, w: 48, h: 54, tags: ['pac', 'pac_s', 'pacific'] },
  { id: 'pac_n_e', x: 268, y: 18, w: 28, h: 44, tags: ['pac', 'pac_n', 'pacific'] },
  { id: 'pac_s_e', x: 268, y: 68, w: 28, h: 54, tags: ['pac', 'pac_s', 'pacific'] },
  { id: 'atl_n',   x: 108, y: 24, w: 38, h: 44, tags: ['atl', 'atl_n', 'atlantic'] },
  { id: 'atl_s',   x: 112, y: 72, w: 34, h: 48, tags: ['atl', 'atl_s', 'atlantic'] },
  { id: 'indian',  x: 184, y: 70, w: 52, h: 52, tags: ['indian', 'indien'] },
  { id: 'arctic',  x: 84,  y: 4,  w: 132,h: 12, tags: ['arctic'] },
  { id: 'southern',x: 4,   y: 128,w: 292,h: 14, tags: ['southern'] },
  { id: 'med',     x: 148, y: 51, w: 28, h: 7,  tags: ['med', 'mediterranean'], small: true },
  { id: 'north_sea',x: 134,y: 32, w: 14, h: 9,  tags: ['north_sea'], small: true },
  { id: 'baltic',  x: 157, y: 24, w: 14, h: 8,  tags: ['baltic'], small: true },
  { id: 'black',   x: 178, y: 44, w: 18, h: 6,  tags: ['black'], small: true },
];

export default function WorldMiniMap({ tags = [], height = 150, rounded = 12 }: WorldMiniMapProps) {
  const set = new Set((tags || []).map((t) => t.toLowerCase()));
  const hasAny = set.size > 0;

  const seaOn = (zoneTags: string[]) => zoneTags.some((k) => set.has(k));
  const contOn = (key: string) => (CONTINENT_TAGS[key] || []).some((k) => set.has(k));

  return (
    <View style={[styles.card, { height, borderRadius: rounded }]}>
      <Svg
        width="100%"
        height="100%"
        viewBox="0 0 300 150"
        preserveAspectRatio="xMidYMid meet"
      >
        {/* Fond océan */}
        <Rect x={0} y={0} width={300} height={150} fill="#dbeafe" rx={rounded} />

        {/* Zones maritimes */}
        {SEA_RECTS.map(({ id, x, y, w, h, tags: zt, small }) => {
          const active = seaOn(zt);
          return (
            <Rect
              key={id}
              x={x} y={y} width={w} height={h}
              fill={active ? '#1d6fdb' : '#bfdbfe'}
              opacity={active ? 0.8 : (small ? 0.5 : 0.6)}
              rx={small ? 2 : 4}
            />
          );
        })}

        {/* Continents — fond gris puis overlay coloré si actif */}
        {Object.entries(CONTINENT_PATHS).map(([key, d]) => {
          const active = contOn(key);
          return (
            <G key={key}>
              <Path d={d} fill="#c9d1d9" stroke="#9ca3af" strokeWidth={0.8} />
              {active && (
                <Path d={d} fill="#3b82f6" stroke="#1d4ed8" strokeWidth={1.2} opacity={0.75} />
              )}
            </G>
          );
        })}

        {/* Labels continents */}
        {Object.entries(CONTINENT_LABELS).map(([key, { x, y, label }]) => {
          const active = contOn(key);
          return (
            <G key={`lbl-${key}`}>
              {/* Fond pastille */}
              <Rect
                x={x - 11} y={y - 8}
                width={22} height={11}
                fill={active ? '#1e40af' : '#6b7280'}
                opacity={active ? 0.9 : 0.5}
                rx={3}
              />
              <SvgText
                x={x} y={y + 0.5}
                fontSize={7}
                fontWeight="bold"
                fill="white"
                textAnchor="middle"
                alignmentBaseline="middle"
              >
                {label}
              </SvgText>
            </G>
          );
        })}

        {/* Placeholder si aucun tag */}
        {!hasAny && (
          <G>
            <Rect x={110} y={62} width={80} height={22} fill="white" opacity={0.85} rx={11} />
            <SvgText
              x={150} y={73}
              fontSize={10}
              fontWeight="bold"
              fill="#6b7280"
              textAnchor="middle"
              alignmentBaseline="middle"
            >
              Carte
            </SvgText>
          </G>
        )}
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: '100%',
    overflow: 'hidden',
    backgroundColor: '#dbeafe',
    borderWidth: 1,
    borderColor: '#bfdbfe',
    position: 'relative',
  },
});
