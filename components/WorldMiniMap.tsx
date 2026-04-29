import React from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, { Path, Rect, Text as SvgText, G } from 'react-native-svg';

export type WorldMiniMapProps = {
  tags?: string[];
  height?: number;
  rounded?: number;
};

// Projection: x = (lon + 180) * (300/360), y = (90 - lat) * (150/180)
// Continent paths with ~20-28 points each for recognizable shapes

const CONTINENT_PATHS: Record<string, string> = {
  // Amérique du Nord — Alaska, côte Pacifique, Golfe du Mexique, Floride, côte Est, Labrador, baie d'Hudson
  north_america:
    'M 22,14 L 14,24 L 20,29 L 34,27 ' +
    'L 46,34 L 48,44 L 48,50 L 52,57 ' +
    'L 60,62 L 72,64 L 84,68 ' +
    'L 78,60 L 70,52 L 74,50 ' +
    'L 80,52 L 84,57 ' +
    'L 88,48 L 90,40 L 98,37 L 104,36 ' +
    'L 96,26 L 84,22 L 82,30 L 74,28 L 70,20 ' +
    'L 52,13 L 34,18 Z',

  // Amérique du Sud — bulge NE du Brésil caractéristique, effilement vers le Cap Horn
  south_america:
    'M 84,68 L 88,66 L 98,66 L 102,68 ' +
    'L 121,80 L 118,88 L 114,96 ' +
    'L 102,104 L 94,112 L 92,120 ' +
    'L 88,116 L 88,106 L 90,96 ' +
    'L 84,76 L 86,70 Z',

  // Europe — Scandinavie, péninsule Ibérique, botte italienne, Grèce
  europe:
    'M 173,15 L 156,27 L 158,28 ' +
    'L 154,30 L 148,36 ' +
    'L 142,39 L 142,44 L 146,46 ' +
    'L 152,43 L 160,38 ' +
    'L 163,45 L 170,46 ' +
    'L 174,43 L 180,40 L 182,36 ' +
    'L 180,30 L 174,24 L 166,20 Z',

  // Afrique — Corne de l'Afrique, Cap de Bonne-Espérance, Golfe de Guinée
  africa:
    'M 145,45 L 158,45 L 168,47 L 176,50 ' +
    'L 192,66 ' +
    'L 183,78 L 180,90 ' +
    'L 172,103 L 166,104 ' +
    'L 160,98 L 158,90 L 156,79 ' +
    'L 156,73 L 152,72 ' +
    'L 138,67 L 136,63 L 136,58 ' +
    'L 142,50 Z',

  // Asie — Péninsule arabique, sous-continent indien, Indochine, Sibérie, Kamtchatka
  asia:
    'M 174,43 L 181,37 L 192,34 L 200,24 ' +
    'L 220,16 L 250,14 L 278,18 L 284,30 ' +
    'L 270,44 L 262,56 L 254,68 ' +
    'L 246,72 L 240,78 L 232,72 ' +
    'L 218,70 L 210,62 L 202,56 ' +
    'L 196,66 L 188,70 L 186,62 ' +
    'L 184,52 L 178,50 Z',

  // Australie — Golfe de Carpentarie au N, côtes reconnaissables
  australia:
    'M 246,90 L 252,86 L 264,88 ' +
    'L 264,94 L 268,88 L 270,84 ' +
    'L 276,94 L 274,108 ' +
    'L 262,110 L 248,108 L 244,102 Z',

  // Groenland — île distinctive dans l'Arctique
  greenland:
    'M 96,14 L 108,8 L 120,8 L 136,14 ' +
    'L 130,22 L 114,26 Z',
};

// Centre approximatif pour les labels
const CONTINENT_LABELS: Record<string, { x: number; y: number; label: string }> = {
  north_america: { x: 62, y: 46, label: 'NA' },
  south_america: { x: 96, y: 93, label: 'SA' },
  europe:        { x: 162, y: 35, label: 'EU' },
  africa:        { x: 162, y: 78, label: 'AF' },
  asia:          { x: 228, y: 42, label: 'AS' },
  australia:     { x: 260, y: 98, label: 'OC' },
  greenland:     { x: 116, y: 17, label: ''   },
};

const CONTINENT_TAGS: Record<string, string[]> = {
  north_america: ['america', 'freshwater_na'],
  south_america: ['freshwater_sa'],
  europe:        ['europe', 'freshwater_eu'],
  africa:        ['africa', 'freshwater_af'],
  asia:          ['asia', 'freshwater_as'],
  australia:     ['oceania'],
  greenland:     [],
};

// Zones maritimes [x, y, w, h]
const SEA_RECTS: Array<{
  id: string; x: number; y: number; w: number; h: number;
  tags: string[]; small?: boolean;
}> = [
  { id: 'pac_n_w',   x: 4,   y: 18, w: 48,  h: 44, tags: ['pac', 'pac_n', 'pacific'] },
  { id: 'pac_s_w',   x: 4,   y: 68, w: 48,  h: 54, tags: ['pac', 'pac_s', 'pacific'] },
  { id: 'pac_n_e',   x: 268, y: 18, w: 28,  h: 44, tags: ['pac', 'pac_n', 'pacific'] },
  { id: 'pac_s_e',   x: 268, y: 68, w: 28,  h: 54, tags: ['pac', 'pac_s', 'pacific'] },
  { id: 'atl_n',     x: 108, y: 24, w: 34,  h: 44, tags: ['atl', 'atl_n', 'atlantic'] },
  { id: 'atl_s',     x: 112, y: 72, w: 30,  h: 48, tags: ['atl', 'atl_s', 'atlantic'] },
  { id: 'indian',    x: 184, y: 70, w: 52,  h: 52, tags: ['indian', 'indien'] },
  { id: 'arctic',    x: 84,  y: 4,  w: 132, h: 10, tags: ['arctic'] },
  { id: 'southern',  x: 4,   y: 128,w: 292, h: 14, tags: ['southern'] },
  { id: 'med',       x: 146, y: 46, w: 28,  h: 6,  tags: ['med', 'mediterranean'], small: true },
  { id: 'north_sea', x: 134, y: 32, w: 14,  h: 8,  tags: ['north_sea'], small: true },
  { id: 'baltic',    x: 157, y: 24, w: 14,  h: 8,  tags: ['baltic'], small: true },
  { id: 'black',     x: 178, y: 40, w: 18,  h: 6,  tags: ['black'], small: true },
];

export default function WorldMiniMap({ tags = [], height = 150, rounded = 12 }: WorldMiniMapProps) {
  const set = new Set((tags || []).map((t) => t.toLowerCase()));
  const hasAny = set.size > 0;

  const seaOn  = (zt: string[]) => zt.some((k) => set.has(k));
  const contOn = (key: string)  => (CONTINENT_TAGS[key] || []).some((k) => set.has(k));

  return (
    <View style={[styles.card, { height, borderRadius: rounded }]}>
      <Svg width="100%" height="100%" viewBox="0 0 300 150" preserveAspectRatio="xMidYMid meet">

        {/* Fond océan */}
        <Rect x={0} y={0} width={300} height={150} fill="#DBEAFE" rx={rounded} />

        {/* Zones maritimes */}
        {SEA_RECTS.map(({ id, x, y, w, h, tags: zt, small }) => (
          <Rect
            key={id}
            x={x} y={y} width={w} height={h}
            fill={seaOn(zt) ? '#1D6FDB' : '#BFDBFE'}
            opacity={seaOn(zt) ? 0.8 : (small ? 0.45 : 0.55)}
            rx={small ? 2 : 4}
          />
        ))}

        {/* Continents */}
        {Object.entries(CONTINENT_PATHS).map(([key, d]) => {
          const active = contOn(key);
          const isGreenland = key === 'greenland';
          return (
            <G key={key}>
              <Path
                d={d}
                fill={isGreenland ? '#D1D5DB' : '#CBD5E1'}
                stroke={isGreenland ? '#9CA3AF' : '#94A3B8'}
                strokeWidth={isGreenland ? 0.5 : 0.8}
              />
              {active && (
                <Path
                  d={d}
                  fill="#3B82F6"
                  stroke="#1D4ED8"
                  strokeWidth={1.2}
                  opacity={0.78}
                />
              )}
            </G>
          );
        })}

        {/* Labels continents (sauf Groenland) */}
        {Object.entries(CONTINENT_LABELS)
          .filter(([, { label }]) => label !== '')
          .map(([key, { x, y, label }]) => {
            const active = contOn(key);
            return (
              <G key={`lbl-${key}`}>
                <Rect
                  x={x - 11} y={y - 8}
                  width={22} height={11}
                  fill={active ? '#1E40AF' : '#6B7280'}
                  opacity={active ? 0.92 : 0.5}
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
            <Rect x={108} y={62} width={84} height={22} fill="white" opacity={0.85} rx={11} />
            <SvgText
              x={150} y={73}
              fontSize={10}
              fontWeight="bold"
              fill="#6B7280"
              textAnchor="middle"
              alignmentBaseline="middle"
            >
              Zones mondiales
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
    backgroundColor: '#DBEAFE',
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
});
