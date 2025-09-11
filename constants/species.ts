export type Species = {
  name: string;
  image?: string; // URL absolue ou require local (non utilisé ici)
};

// Liste de quelques espèces courantes (FR + mer/douce)
export const FISH_SPECIES: Species[] = [
  { name: 'Brochet' },
  { name: 'Perche' },
  { name: 'Sandre' },
  { name: 'Truite fario' },
  { name: 'Truite arc-en-ciel' },
  { name: 'Carpe commune' },
  { name: 'Carpe miroir' },
  { name: 'Tanche' },
  { name: 'Gardon' },
  { name: 'Rotengle' },
  { name: 'Brème' },
  { name: 'Silure glane' },
  { name: 'Anguille' },
  { name: 'Chevesne' },
  { name: 'Saumon atlantique' },
  { name: 'Bar (loup de mer)' },
  { name: 'Dorade' },
  { name: 'Maquereau' },
  { name: 'Sardine' },
  { name: 'Thon rouge' },
  { name: 'Merlan' },
  { name: 'Lieu jaune' },
  { name: 'Morue (cabillaud)' },
  { name: 'Mulet' },
  { name: 'Sole' },
  { name: 'Turbot' },
  { name: 'Raie' },
  { name: 'Lotte (baudroie)' },
  { name: 'Rouget barbet' },
  { name: 'Éperlan' },
];

export function normalizeName(input: string) {
  return input
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}
