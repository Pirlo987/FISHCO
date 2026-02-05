export type Species = {
  name: string;
  image?: string; // URL absolue ou require local (non utilisé ici)
  // Optional flag to track whether the species entry has been validated.
  verified?: boolean;
  status?: string | null;
  waterType?: 'fresh' | 'salt';
};

// Liste de quelques espèces courantes (FR + mer/douce)
export const FISH_SPECIES: Species[] = [
  { name: 'Brochet', waterType: 'fresh' },
  { name: 'Perche', waterType: 'fresh' },
  { name: 'Sandre', waterType: 'fresh' },
  { name: 'Truite fario', waterType: 'fresh' },
  { name: 'Truite arc-en-ciel', waterType: 'fresh' },
  { name: 'Carpe commune', waterType: 'fresh' },
  { name: 'Carpe miroir', waterType: 'fresh' },
  { name: 'Tanche', waterType: 'fresh' },
  { name: 'Gardon', waterType: 'fresh' },
  { name: 'Rotengle', waterType: 'fresh' },
  { name: 'Brème', waterType: 'fresh' },
  { name: 'Silure glane', waterType: 'fresh' },
  { name: 'Anguille', waterType: 'fresh' },
  { name: 'Chevesne', waterType: 'fresh' },
  { name: 'Saumon atlantique', waterType: 'salt' },
  { name: 'Bar (loup de mer)', waterType: 'salt' },
  { name: 'Dorade', waterType: 'salt' },
  { name: 'Maquereau', waterType: 'salt' },
  { name: 'Sardine', waterType: 'salt' },
  { name: 'Thon rouge', waterType: 'salt' },
  { name: 'Merlan', waterType: 'salt' },
  { name: 'Lieu jaune', waterType: 'salt' },
  { name: 'Morue (cabillaud)', waterType: 'salt' },
  { name: 'Mulet', waterType: 'salt' },
  { name: 'Sole', waterType: 'salt' },
  { name: 'Turbot', waterType: 'salt' },
  { name: 'Raie', waterType: 'salt' },
  { name: 'Lotte (baudroie)', waterType: 'salt' },
  { name: 'Rouget barbet', waterType: 'salt' },
  { name: 'Éperlan', waterType: 'salt' },
];

export function normalizeName(input: string) {
  return input
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}
