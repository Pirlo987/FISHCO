// Parse a freeform French/English "Region / Stock" string into coarse map tags
// Returned tags are lowercase and meant for WorldMiniMap
export function parseRegionToTags(input?: string | null): string[] {
  if (!input) return [];
  const s = stripAccents(String(input)).toLowerCase();
  const pieces = s
    .split(/[;,/|]|\(|\)|\[|\]|\n|\r|\t/)
    .map((p) => p.trim())
    .filter(Boolean);

  const out = new Set<string>();

  const addAtlantique = (p: string) => {
    const north = /\b(nord|n|ne|no|nw)\b/.test(p);
    const south = /\b(sud|s|se|so|sw)\b/.test(p);
    if (north) out.add('atl_n');
    if (south) out.add('atl_s');
    if (!north && !south) out.add('atl');
  };
  const addPacifique = (p: string) => {
    const north = /\b(nord|n|ne|no|nw)\b/.test(p);
    const south = /\b(sud|s|se|so|sw)\b/.test(p);
    if (north) out.add('pac_n');
    if (south) out.add('pac_s');
    if (!north && !south) out.add('pac');
  };

  // Global tokens
  const tokens = pieces.length ? pieces : [s];
  for (const p of tokens) {
    if (/atlant/i.test(p)) addAtlantique(p);
    if (/pacif/i.test(p)) addPacifique(p);
    if (/(ocean|oceanique)?\s*indien/.test(p) || /indian/.test(p)) out.add('indian');
    if (/mediter/.test(p) || /mediterranean/.test(p)) out.add('med');
    if (/\bmer du nord\b/.test(p) || /north sea/.test(p)) out.add('north_sea');
    if (/baltique/.test(p) || /baltic/.test(p)) out.add('baltic');
    if (/mer noire/.test(p) || /black sea/.test(p)) out.add('black');
    if (/arctique/.test(p) || /arctic/.test(p)) out.add('arctic');
    if (/antarct|austral|southern ocean/.test(p)) out.add('southern');

    if (/eau(x)? douce(s)?/.test(p) || /fresh(\s+)?water/.test(p) || /rivieres?/.test(p) || /lacs?/.test(p)) out.add('freshwater');

    if (/europe/.test(p)) out.add('europe');
    if (/afrique/.test(p) || /africa/.test(p)) out.add('africa');
    if (/asie/.test(p) || /asia/.test(p)) out.add('asia');
    if (/amerique/.test(p) || /america/.test(p)) out.add('america');
    if (/oceanie/.test(p) || /oceania/.test(p)) out.add('oceania');
  }

  return Array.from(out);
}

function stripAccents(str: string) {
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/œ/g, 'oe')
    .replace(/æ/g, 'ae');
}

