-- ================================================================
-- SPECIES DATABASE MIGRATION
-- 1. Simplification du champ `name` (matching app)
-- 2. Correction du champ `water_type`
-- 3. Ajout des espèces manquantes
-- ================================================================
-- À exécuter dans : Supabase Dashboard → SQL Editor

-- ── Prérequis : colonne updated_at requise par le trigger ─────
ALTER TABLE species
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();


-- ═══════════════════════════════════════════════════════════════
-- PARTIE 1 — SIMPLIFICATION DU CHAMP `name`
-- Le champ `name` doit être le nom français court et sans
-- parenthèses pour que le matching dans l'app fonctionne.
-- ═══════════════════════════════════════════════════════════════

UPDATE species SET name = 'Thon rouge'                WHERE id = 1;
UPDATE species SET name = 'Thon rouge Pacifique'      WHERE id = 2;
UPDATE species SET name = 'Thon jaune'                WHERE id = 3;
UPDATE species SET name = 'Thon obese'                WHERE id = 4;
UPDATE species SET name = 'Germon'                    WHERE id = 5;
-- id 6 Listao → ok
UPDATE species SET name = 'Bonite a dos raye'         WHERE id = 7;
UPDATE species SET name = 'Little tunny'              WHERE id = 8;
UPDATE species SET name = 'Kawakawa'                  WHERE id = 9;
UPDATE species SET name = 'Marlin bleu'               WHERE id = 10;
UPDATE species SET name = 'Marlin bleu Indo-Pacifique' WHERE id = 11;
-- id 12 Marlin raye → ok
-- id 13 Marlin noir → ok
UPDATE species SET name = 'Voilier'                   WHERE id = 14;
-- id 15-18 mackerels → ok
UPDATE species SET name = 'Carangue GT'               WHERE id = 19;
-- id 20-22 carangues → ok
-- id 23 Yellowtail → ok
UPDATE species SET name = 'Seriole'                   WHERE id = 24;
-- id 25-33 → ok
UPDATE species SET name = 'Jobfish vert'              WHERE id = 34;
UPDATE species SET name = 'Cabillaud'                 WHERE id = 35;
UPDATE species SET name = 'Lieu noir'                 WHERE id = 36;
UPDATE species SET name = 'Lieu jaune'                WHERE id = 37;
-- id 38 Merlan → ok
-- id 39 Maquereau → ok
UPDATE species SET name = 'Orphie'                    WHERE id = 40;
-- id 41 Rouget barbet → ok
-- id 42 Sole commune → ok
-- id 43 Turbot → ok
-- id 44 Barbue → ok
-- id 45 Sar commun → ok
UPDATE species SET name = 'Dorade royale'             WHERE id = 46;
-- id 47 Pagre → ok
-- id 48 Brochet → ok
UPDATE species SET name = 'Perche'                    WHERE id = 49;
-- id 50 Sandre → ok
-- id 51 Carpe commune → ok
UPDATE species SET name = 'Truite fario'              WHERE id = 52;
-- id 53 Truite arc-en-ciel → ok
-- id 54 Omble chevalier → ok
-- id 55 Ombre commun → ok
UPDATE species SET name = 'Lotte de riviere'          WHERE id = 56;
-- id 57 Silure glane → ok
-- id 58 Saumon atlantique → ok
UPDATE species SET name = 'Anguille'                  WHERE id = 59;
-- id 60 Tanche → ok
-- id 61 Gardon → ok
UPDATE species SET name = 'Breme'                     WHERE id = 62;
-- id 63 Chevesne → ok
-- id 64 Goujon → ok
-- id 65-75 bass / catfish → ok
UPDATE species SET name = 'Perchaude'                 WHERE id = 70;
UPDATE species SET name = 'Truite de lac'             WHERE id = 76;
UPDATE species SET name = 'Truite fardee'             WHERE id = 77;
-- id 78-80 saumons → ok
-- id 81-85 → ok
UPDATE species SET name = 'Arapaima'                  WHERE id = 86;
UPDATE species SET name = 'Peacock bass'              WHERE id = 87;
-- id 88 Piranha rouge → ok
UPDATE species SET name = 'Dorado'                    WHERE id = 89;
-- id 90-91 → ok
UPDATE species SET name = 'Surubi'                    WHERE id = 92;
UPDATE species SET name = 'Payara'                    WHERE id = 93;
UPDATE species SET name = 'Trahira'                   WHERE id = 94;
-- id 95 Sabalo → ok
-- id 96-101 → ok
UPDATE species SET name = 'Leerfish'                  WHERE id = 102;
UPDATE species SET name = 'Kob'                       WHERE id = 103;
-- id 104-106 → ok
UPDATE species SET name = 'Giant snakehead'           WHERE id = 107;
-- id 108-114 → ok
UPDATE species SET name = 'Mahi-mahi'                 WHERE id = 115;
-- id 116-118 → ok


-- ═══════════════════════════════════════════════════════════════
-- PARTIE 2 — CORRECTION DU CHAMP `water_type`
-- ═══════════════════════════════════════════════════════════════

-- Espèces strictement eau douce (marquées "Mer" par erreur)
UPDATE species SET water_type = 'Douce' WHERE id IN (
  48,  -- Brochet
  49,  -- Perche
  50,  -- Sandre
  51,  -- Carpe commune
  52,  -- Truite fario
  53,  -- Truite arc-en-ciel
  54,  -- Omble chevalier
  55,  -- Ombre commun
  56,  -- Lotte de riviere
  57,  -- Silure glane
  60,  -- Tanche
  61,  -- Gardon
  62,  -- Breme
  63,  -- Chevesne
  64,  -- Goujon
  65,  -- Largemouth bass
  66,  -- Smallmouth bass
  67,  -- Spotted bass
  68,  -- Walleye
  69,  -- Sauger
  70,  -- Perchaude
  71,  -- Black crappie
  72,  -- Bluegill
  73,  -- Channel catfish
  74,  -- Blue catfish
  75,  -- Flathead catfish
  76,  -- Truite de lac
  77,  -- Truite fardee
  86,  -- Arapaima
  87,  -- Peacock bass
  88,  -- Piranha rouge
  89,  -- Dorado
  90,  -- Pacu
  91,  -- Tambaqui
  92,  -- Surubi
  93,  -- Payara
  94,  -- Trahira
  95,  -- Sabalo
  96,  -- Perche du Nil
  97,  -- Tilapia du Nil
  98,  -- Tilapia mozambicain
  99,  -- Tigerfish
  100, -- Vundu catfish
  101, -- Poisson-chat africain
  105, -- Mahseer dore
  106, -- Carpe amour
  107, -- Giant snakehead
  108, -- Snakehead raye
  109, -- Siamese giant carp
  110, -- Goonch
  111  -- Pangasius
);

-- Espèces migratrices (eau douce + mer selon cycle de vie)
UPDATE species SET water_type = 'Mixte' WHERE id IN (
  58,  -- Saumon atlantique (anadrome)
  59,  -- Anguille (catadrome)
  78,  -- Saumon chinook (anadrome)
  79,  -- Saumon coho (anadrome)
  80   -- Saumon sockeye (anadrome)
);


-- ═══════════════════════════════════════════════════════════════
-- PARTIE 3 — ESPÈCES FRANÇAISES MANQUANTES
-- ═══════════════════════════════════════════════════════════════

-- ── Prérequis : séquence auto-increment sur id ────────────────
DO $$
DECLARE
  seq_name text;
BEGIN
  seq_name := pg_get_serial_sequence('species', 'id');
  IF seq_name IS NULL THEN
    EXECUTE 'CREATE SEQUENCE IF NOT EXISTS species_id_seq';
    EXECUTE 'SELECT setval(''species_id_seq'', (SELECT COALESCE(MAX(id), 0) FROM species))';
    EXECUTE 'ALTER TABLE species ALTER COLUMN id SET DEFAULT nextval(''species_id_seq'')';
  ELSE
    EXECUTE 'SELECT setval(' || quote_literal(seq_name) || ', (SELECT COALESCE(MAX(id), 0) FROM species))';
  END IF;
END $$;

-- ── Bar commun ───────────────────────────────────────────────
INSERT INTO species (
  french_name, name, latin_name, english_name, fish_type, water_type,
  average_weight_kg, max_weight_kg, average_size_cm, legal_min_size_cm,
  average_lifespan_years, conservation_status, diet,
  fishing_methods, baits, optimal_season, region_stock, opening_period
) VALUES (
  'Bar commun', 'Bar', 'Dicentrarchus labrax', 'European sea bass',
  'Carnassier', 'Mer', 2.5, 12.0, 50, 42, 15,
  'Préoccupation mineure (UICN)',
  'Piscivore (lançons, sprats, gobies) / crustacés',
  'Lancer, surfcasting, jigging, traîne, pêche au vif',
  'Leurres souples, poissons, crevettes, vers',
  'Été-automne', 'Atlantique Est & Méditerranée',
  'Toute l''année (restrictions estivales possibles selon zones)'
);

-- ── Dorade grise ─────────────────────────────────────────────
INSERT INTO species (
  french_name, name, latin_name, english_name, fish_type, water_type,
  average_weight_kg, max_weight_kg, average_size_cm, legal_min_size_cm,
  average_lifespan_years, conservation_status, diet,
  fishing_methods, baits, optimal_season, region_stock
) VALUES (
  'Dorade grise', 'Dorade grise', 'Spondyliosoma cantharus', 'Black seabream',
  'Carnassier', 'Mer', 0.8, 3.5, 32, 23, 12,
  'Préoccupation mineure (UICN)',
  'Omnivore (mollusques, crustacés, algues, invertébrés)',
  'Surfcasting, bateau léger, canne en mer, fusil',
  'Vers, crevettes, moules, crabes',
  'Printemps-été', 'Atlantique Est & Méditerranée'
);

-- ── Mulet à grosse tête ───────────────────────────────────────
INSERT INTO species (
  french_name, name, latin_name, english_name, fish_type, water_type,
  average_weight_kg, max_weight_kg, average_size_cm, legal_min_size_cm,
  diet, fishing_methods, baits, optimal_season, region_stock
) VALUES (
  'Mulet à grosse tête', 'Mulet', 'Chelon labrosus', 'Thick-lipped grey mullet',
  'Blanc / Omnivore', 'Mer', 1.5, 6.0, 45, 30,
  'Omnivore (algues, détritus, invertébrés benthiques)',
  'Surfcasting, feeder, coup, pêche à la mouche',
  'Pain, algues, vers, pellets',
  'Toute l''année', 'Atlantique Est & Méditerranée'
);

-- ── Sardine ──────────────────────────────────────────────────
INSERT INTO species (
  french_name, name, latin_name, english_name, fish_type, water_type,
  average_weight_kg, max_weight_kg, average_size_cm,
  diet, fishing_methods, baits, optimal_season, region_stock
) VALUES (
  'Sardine', 'Sardine', 'Sardina pilchardus', 'European pilchard',
  'Indéterminé', 'Mer', 0.08, 0.25, 20,
  'Planctonophage (copépodes, phytoplancton)',
  'Sabiki, traîne légère, canne légère en bateau',
  'Plumes, micro-jigs, pain',
  'Été', 'Atlantique Est & Méditerranée'
);

-- ── Hareng ───────────────────────────────────────────────────
INSERT INTO species (
  french_name, name, latin_name, english_name, fish_type, water_type,
  average_weight_kg, max_weight_kg, average_size_cm, legal_min_size_cm,
  average_lifespan_years, diet, fishing_methods, baits, optimal_season, region_stock
) VALUES (
  'Hareng', 'Hareng', 'Clupea harengus', 'Atlantic herring',
  'Indéterminé', 'Mer', 0.2, 0.7, 30, 20, 15,
  'Planctonophage / piscivore (petits poissons)',
  'Sabiki, traîne légère, filet de fond',
  'Plumes, harenguets, leurres métalliques',
  'Automne-hiver', 'Atlantique Nord-Est & Mer du Nord'
);

-- ── Éperlan ──────────────────────────────────────────────────
INSERT INTO species (
  french_name, name, latin_name, english_name, fish_type, water_type,
  average_weight_kg, max_weight_kg, average_size_cm,
  diet, fishing_methods, baits, optimal_season, region_stock
) VALUES (
  'Éperlan', 'Eperlan', 'Osmerus eperlanus', 'European smelt',
  'Carnassier', 'Mixte', 0.05, 0.2, 18,
  'Piscivore / invertivore (crustacés, insectes)',
  'Traîne légère, coup, pêche en lac',
  'Vers, petits poissons, asticots',
  'Hiver-printemps', 'Atlantique Est & estuaires européens'
);

-- ── Congre ───────────────────────────────────────────────────
INSERT INTO species (
  french_name, name, latin_name, english_name, fish_type, water_type,
  average_weight_kg, max_weight_kg, average_size_cm, legal_min_size_cm,
  diet, fishing_methods, baits, optimal_season, region_stock
) VALUES (
  'Congre', 'Congre', 'Conger conger', 'European conger',
  'Carnassier', 'Mer', 5.0, 65.0, 130, 58,
  'Piscivore / crustacés (pieuvres, maquereaux, crabes)',
  'Fond de nuit, bateau fond rocheux, surfcasting nocturne',
  'Maquereaux, pieuvres, sardines, crevettes',
  'Été-automne', 'Atlantique Est & Méditerranée'
);

-- ── Raie bouclée ─────────────────────────────────────────────
INSERT INTO species (
  french_name, name, latin_name, english_name, fish_type, water_type,
  average_weight_kg, max_weight_kg, average_size_cm, legal_min_size_cm,
  average_lifespan_years, conservation_status, diet,
  fishing_methods, baits, optimal_season, region_stock
) VALUES (
  'Raie bouclée', 'Raie', 'Raja clavata', 'Thornback ray',
  'Indéterminé', 'Mer', 4.0, 18.0, 85, 45, 15,
  'Quasi menacé (UICN)',
  'Piscivore / invertivore (crustacés, mollusques, poissons plats)',
  'Fond, surfcasting posé, bateau fond sableux',
  'Vers, crevettes, poissons morts, crabes',
  'Printemps-automne', 'Atlantique Est & Mer du Nord'
);

-- ── Grondin rouge ────────────────────────────────────────────
INSERT INTO species (
  french_name, name, latin_name, english_name, fish_type, water_type,
  average_weight_kg, max_weight_kg, average_size_cm, legal_min_size_cm,
  diet, fishing_methods, baits, optimal_season, region_stock
) VALUES (
  'Grondin rouge', 'Grondin rouge', 'Chelidonichthys cuculus', 'Red gurnard',
  'Carnassier', 'Mer', 0.4, 1.8, 33, 20,
  'Piscivore / crustacés (crevettes, crabes, petits poissons)',
  'Fond, dérive bateau, canne en mer',
  'Vers, crevettes, leurres souples',
  'Été', 'Atlantique Est & Méditerranée'
);

-- ── Grondin gris ─────────────────────────────────────────────
INSERT INTO species (
  french_name, name, latin_name, english_name, fish_type, water_type,
  average_weight_kg, max_weight_kg, average_size_cm,
  diet, fishing_methods, baits, optimal_season, region_stock
) VALUES (
  'Grondin gris', 'Grondin gris', 'Eutrigla gurnardus', 'Grey gurnard',
  'Carnassier', 'Mer', 0.3, 1.0, 28,
  'Piscivore / crustacés',
  'Fond, dérive',
  'Vers, crevettes',
  'Été', 'Atlantique Nord-Est'
);

-- ── Saint-Pierre ─────────────────────────────────────────────
INSERT INTO species (
  french_name, name, latin_name, english_name, fish_type, water_type,
  average_weight_kg, max_weight_kg, average_size_cm, legal_min_size_cm,
  diet, fishing_methods, baits, optimal_season, region_stock
) VALUES (
  'Saint-Pierre', 'Saint-Pierre', 'Zeus faber', 'John Dory',
  'Carnassier', 'Mer', 1.5, 8.0, 45, 35,
  'Piscivore (lançons, sardines, petits poissons pélagiques)',
  'Fond, jigging léger, dérive bateau',
  'Petits poissons vifs, crevettes, leurres souples',
  'Été-automne', 'Atlantique Est & Méditerranée'
);

-- ── Vieille (Labre) ──────────────────────────────────────────
INSERT INTO species (
  french_name, name, latin_name, english_name, fish_type, water_type,
  average_weight_kg, max_weight_kg, average_size_cm, legal_min_size_cm,
  diet, fishing_methods, baits, optimal_season, region_stock
) VALUES (
  'Vieille (Labre commun)', 'Vieille', 'Labrus bergylta', 'Ballan wrasse',
  'Carnassier', 'Mer', 0.8, 4.5, 38, 25,
  'Invertivore (mollusques, oursins, crustacés, vers)',
  'Pêche en roche, fusil sous-marin, canne légère fond rocheux',
  'Crabes, vers, crevettes, moules',
  'Été', 'Atlantique Est'
);

-- ── Chinchard commun ─────────────────────────────────────────
INSERT INTO species (
  french_name, name, latin_name, english_name, fish_type, water_type,
  average_weight_kg, max_weight_kg, average_size_cm,
  diet, fishing_methods, baits, optimal_season, region_stock
) VALUES (
  'Chinchard commun', 'Chinchard', 'Trachurus trachurus', 'Atlantic horse mackerel',
  'Carnassier', 'Mer', 0.3, 1.5, 35,
  'Piscivore / planctonophage (crustacés, petits poissons)',
  'Sabiki, traîne légère, canne en mer',
  'Plumes, micro-leurres, morceaux de poisson',
  'Été-automne', 'Atlantique Est & Méditerranée'
);

-- ── Carpe miroir ─────────────────────────────────────────────
INSERT INTO species (
  french_name, name, latin_name, english_name, fish_type, water_type,
  average_weight_kg, max_weight_kg, average_size_cm, legal_min_size_cm,
  average_lifespan_years, conservation_status, diet,
  fishing_methods, baits, optimal_season, region_stock
) VALUES (
  'Carpe miroir', 'Carpe miroir', 'Cyprinus carpio', 'Mirror carp',
  'Blanc / Omnivore', 'Douce', 12.0, 40.0, 75, 30, 25,
  'Préoccupation mineure (UICN)',
  'Omnivore (invertébrés benthiques, végétaux, détritus)',
  'Fond carpe, method feeder, pellet waggler',
  'Bouillettes, maïs, chènevis, pellets',
  'Été', 'Europe'
);

-- ── Carpe cuir ───────────────────────────────────────────────
INSERT INTO species (
  french_name, name, latin_name, english_name, fish_type, water_type,
  average_weight_kg, max_weight_kg, average_size_cm, legal_min_size_cm,
  average_lifespan_years, diet, fishing_methods, baits, optimal_season, region_stock
) VALUES (
  'Carpe cuir', 'Carpe cuir', 'Cyprinus carpio', 'Leather carp',
  'Blanc / Omnivore', 'Douce', 10.0, 35.0, 70, 30, 25,
  'Omnivore (invertébrés, végétaux)',
  'Fond, method feeder',
  'Bouillettes, maïs, vers',
  'Été', 'Europe'
);

-- ── Rotengle ─────────────────────────────────────────────────
INSERT INTO species (
  french_name, name, latin_name, english_name, fish_type, water_type,
  average_weight_kg, max_weight_kg, average_size_cm, legal_min_size_cm,
  diet, fishing_methods, baits, optimal_season, region_stock
) VALUES (
  'Rotengle', 'Rotengle', 'Scardinius erythrophthalmus', 'Rudd',
  'Blanc / Omnivore', 'Douce', 0.3, 2.0, 28, 18,
  'Herbivore / insectivore (algues, insectes, petits invertébrés)',
  'Coup en surface, pêche à la mouche sèche',
  'Pain en surface, insectes, asticots',
  'Été', 'Europe'
);

-- ── Ablette ──────────────────────────────────────────────────
INSERT INTO species (
  french_name, name, latin_name, english_name, fish_type, water_type,
  average_weight_kg, max_weight_kg, average_size_cm,
  diet, fishing_methods, baits, optimal_season, region_stock
) VALUES (
  'Ablette', 'Ablette', 'Alburnus alburnus', 'Common bleak',
  'Blanc / Omnivore', 'Douce', 0.02, 0.08, 12,
  'Planctonophage / insectivore (invertébrés de surface)',
  'Coup ultraléger, mouche sèche',
  'Asticots, pain, petits insectes',
  'Printemps-été', 'Europe'
);

-- ── Barbeau fluviatile ───────────────────────────────────────
INSERT INTO species (
  french_name, name, latin_name, english_name, fish_type, water_type,
  average_weight_kg, max_weight_kg, average_size_cm, legal_min_size_cm,
  average_lifespan_years, diet, fishing_methods, baits, optimal_season, region_stock
) VALUES (
  'Barbeau fluviatile', 'Barbeau', 'Barbus barbus', 'Barbel',
  'Blanc / Omnivore', 'Douce', 1.5, 9.0, 50, 30, 15,
  'Omnivore benthique (invertébrés de fond, mollusques, algues)',
  'Feeder, fond, pêche en rivière rapide',
  'Vers, pellets, bouillettes, fromage',
  'Été', 'Europe de l''Ouest (Loire, Rhône, Garonne)'
);

-- ── Black-bass ───────────────────────────────────────────────
INSERT INTO species (
  french_name, name, latin_name, english_name, fish_type, water_type,
  average_weight_kg, max_weight_kg, average_size_cm, legal_min_size_cm,
  diet, fishing_methods, baits, optimal_season, region_stock
) VALUES (
  'Black-bass', 'Black-bass', 'Micropterus salmoides', 'Largemouth bass',
  'Carnassier', 'Douce', 1.5, 7.0, 42, 30,
  'Piscivore (grenouilles, écrevisses, petits poissons)',
  'Leurres souples, topwater, jerkbait, crankbait',
  'Leurres artificiels, écrevisses, poissons',
  'Printemps-été', 'France (introduit), USA, Europe'
);

-- ── Oblade ───────────────────────────────────────────────────
INSERT INTO species (
  french_name, name, latin_name, english_name, fish_type, water_type,
  average_weight_kg, max_weight_kg, average_size_cm, legal_min_size_cm,
  diet, fishing_methods, baits, optimal_season, region_stock
) VALUES (
  'Oblade', 'Oblade', 'Oblada melanura', 'Saddled seabream',
  'Indéterminé', 'Mer', 0.25, 0.8, 25, 18,
  'Omnivore (invertébrés, algues, détritus)',
  'Canne légère, fusil sous-marin, coup en mer',
  'Vers, crevettes, boulette de pain',
  'Été', 'Méditerranée & Atlantique Est'
);

-- ── Saupe ────────────────────────────────────────────────────
INSERT INTO species (
  french_name, name, latin_name, english_name, fish_type, water_type,
  average_weight_kg, max_weight_kg, average_size_cm, legal_min_size_cm,
  diet, fishing_methods, baits, optimal_season, region_stock
) VALUES (
  'Saupe', 'Saupe', 'Sarpa salpa', 'Salema porgy',
  'Indéterminé', 'Mer', 0.5, 1.8, 30, 20,
  'Herbivore (algues, posidonies, zostères)',
  'Canne légère, fusil, coup entre deux eaux',
  'Algues, pain, herbes marines',
  'Été', 'Méditerranée & Atlantique Est'
);

-- ── Lotte de mer (baudroie) ──────────────────────────────────
INSERT INTO species (
  french_name, name, latin_name, english_name, fish_type, water_type,
  average_weight_kg, max_weight_kg, average_size_cm, legal_min_size_cm,
  diet, fishing_methods, baits, optimal_season, region_stock
) VALUES (
  'Lotte de mer', 'Lotte de mer', 'Lophius piscatorius', 'Anglerfish',
  'Carnassier', 'Mer', 5.0, 40.0, 85, 50,
  'Piscivore vorace (embuscade : poissons, seiches)',
  'Fond profond, jigging lent, bateau au mouillage',
  'Poissons morts, céphalopodes',
  'Toute l''année', 'Atlantique Est & Méditerranée'
);

-- ── Tacaud commun ────────────────────────────────────────────
INSERT INTO species (
  french_name, name, latin_name, english_name, fish_type, water_type,
  average_weight_kg, max_weight_kg, average_size_cm,
  diet, fishing_methods, baits, optimal_season, region_stock
) VALUES (
  'Tacaud commun', 'Tacaud', 'Trisopterus minutus', 'Poor cod',
  'Indéterminé', 'Mer', 0.1, 0.5, 22,
  'Piscivore / invertivore (crevettes, petits poissons, vers)',
  'Fond, canne légère en bateau',
  'Vers, crevettes, morceaux de poisson',
  'Hiver-printemps', 'Atlantique Est'
);

-- ── Pageot commun ────────────────────────────────────────────
INSERT INTO species (
  french_name, name, latin_name, english_name, fish_type, water_type,
  average_weight_kg, max_weight_kg, average_size_cm, legal_min_size_cm,
  diet, fishing_methods, baits, optimal_season, region_stock
) VALUES (
  'Pageot commun', 'Pageot', 'Pagellus erythrinus', 'Common pandora',
  'Carnassier', 'Mer', 0.6, 2.5, 30, 20,
  'Invertivore (crustacés, mollusques, vers)',
  'Fond bateau, jigging léger, dérive',
  'Vers, crevettes, céphalopodes',
  'Été-automne', 'Méditerranée & Atlantique Est'
);

-- ── Perche soleil ────────────────────────────────────────────
INSERT INTO species (
  french_name, name, latin_name, english_name, fish_type, water_type,
  average_weight_kg, max_weight_kg, average_size_cm,
  diet, fishing_methods, baits, optimal_season, region_stock
) VALUES (
  'Perche soleil', 'Perche soleil', 'Lepomis gibbosus', 'Pumpkinseed sunfish',
  'Blanc / Omnivore', 'Douce', 0.1, 0.4, 16,
  'Invertivore (mollusques, insectes, petits crustacés)',
  'Coup ultraléger, mouche',
  'Vers, asticots, leurres minuscules',
  'Été', 'Europe (introduit), USA'
);

-- ── Poisson-chat ─────────────────────────────────────────────
INSERT INTO species (
  french_name, name, latin_name, english_name, fish_type, water_type,
  average_weight_kg, max_weight_kg, average_size_cm,
  diet, fishing_methods, baits, optimal_season, region_stock
) VALUES (
  'Poisson-chat', 'Poisson-chat', 'Ameiurus melas', 'Black bullhead',
  'Indéterminé', 'Douce', 0.3, 1.8, 28,
  'Omnivore benthique (vers, détritus, petits poissons)',
  'Fond de nuit, coup',
  'Vers, viande, pellets',
  'Été', 'Europe (introduit), Amérique du Nord'
);

-- ── Vairon ───────────────────────────────────────────────────
INSERT INTO species (
  french_name, name, latin_name, english_name, fish_type, water_type,
  average_weight_kg, max_weight_kg, average_size_cm,
  diet, fishing_methods, baits, optimal_season, region_stock
) VALUES (
  'Vairon', 'Vairon', 'Phoxinus phoxinus', 'Common minnow',
  'Blanc / Omnivore', 'Douce', 0.01, 0.04, 9,
  'Omnivore (invertébrés, algues, larves)',
  'Coup ultraléger, pêche à la main (nasse)',
  'Vers, asticots, pain',
  'Printemps-été', 'Europe'
);

-- ── Vandoise ─────────────────────────────────────────────────
INSERT INTO species (
  french_name, name, latin_name, english_name, fish_type, water_type,
  average_weight_kg, max_weight_kg, average_size_cm,
  diet, fishing_methods, baits, optimal_season, region_stock
) VALUES (
  'Vandoise', 'Vandoise', 'Leuciscus leuciscus', 'Common dace',
  'Blanc / Omnivore', 'Douce', 0.15, 0.6, 20,
  'Insectivore / planctonophage',
  'Mouche sèche, coup en surface',
  'Insectes, asticots',
  'Printemps-été', 'Europe de l''Ouest'
);

-- ── Ide mélanote ─────────────────────────────────────────────
INSERT INTO species (
  french_name, name, latin_name, english_name, fish_type, water_type,
  average_weight_kg, max_weight_kg, average_size_cm, legal_min_size_cm,
  diet, fishing_methods, baits, optimal_season, region_stock
) VALUES (
  'Ide mélanote', 'Ide melanote', 'Leuciscus idus', 'Ide (Orfe)',
  'Blanc / Omnivore', 'Douce', 0.8, 4.0, 38, 25,
  'Omnivore (insectes, vers, petits poissons)',
  'Coup, mouche, leurres légers',
  'Pain, insectes, vers',
  'Printemps-été', 'Europe centrale & Nord'
);

-- ── Coryphène (Mahi-mahi) — alias déjà en BDD id 115 ─────────
-- (pas d'INSERT, déjà présent)

-- ── Espadon ──────────────────────────────────────────────────
INSERT INTO species (
  french_name, name, latin_name, english_name, fish_type, water_type,
  average_weight_kg, max_weight_kg, average_size_cm,
  conservation_status, diet, fishing_methods, baits, optimal_season, region_stock
) VALUES (
  'Espadon', 'Espadon', 'Xiphias gladius', 'Swordfish',
  'Carnassier', 'Mer', 80.0, 650.0, 280,
  'Vulnérable (UICN)',
  'Piscivore (thons, maquereaux, céphalopodes)',
  'Traîne profonde de nuit, drifting',
  'Calamars, thazards',
  'Été-automne', 'Méditerranée & Atlantique'
);


-- ═══════════════════════════════════════════════════════════════
-- PARTIE 4 — COMPLÉTION DES ENGLISH_NAME MANQUANTS
-- ═══════════════════════════════════════════════════════════════

UPDATE species SET english_name = 'Pacific bluefin tuna'    WHERE id = 2  AND (english_name IS NULL OR english_name = '');
UPDATE species SET english_name = 'Bigeye tuna'             WHERE id = 4  AND (english_name IS NULL OR english_name = '');
UPDATE species SET english_name = 'Skipjack tuna'           WHERE id = 6  AND (english_name IS NULL OR english_name = '');
UPDATE species SET english_name = 'Indo-Pacific blue marlin' WHERE id = 11 AND (english_name IS NULL OR english_name = '');
UPDATE species SET english_name = 'Striped marlin'          WHERE id = 12 AND (english_name IS NULL OR english_name = '');
UPDATE species SET english_name = 'Black marlin'            WHERE id = 13 AND (english_name IS NULL OR english_name = '');
UPDATE species SET english_name = 'Sailfish'                WHERE id = 14 AND (english_name IS NULL OR english_name = '');
UPDATE species SET english_name = 'Bluefin trevally'        WHERE id = 20 AND (english_name IS NULL OR english_name = '');
UPDATE species SET english_name = 'Golden trevally'         WHERE id = 21 AND (english_name IS NULL OR english_name = '');
UPDATE species SET english_name = 'Rainbow runner'          WHERE id = 22 AND (english_name IS NULL OR english_name = '');
UPDATE species SET english_name = 'Red porgy'               WHERE id = 47 AND (english_name IS NULL OR english_name = '');
UPDATE species SET english_name = 'Northern pike'           WHERE id = 48 AND (english_name IS NULL OR english_name = '');
UPDATE species SET english_name = 'Common carp'             WHERE id = 51 AND (english_name IS NULL OR english_name = '');
UPDATE species SET english_name = 'Brown trout'             WHERE id = 52 AND (english_name IS NULL OR english_name = '');
UPDATE species SET english_name = 'Rainbow trout'           WHERE id = 53 AND (english_name IS NULL OR english_name = '');
UPDATE species SET english_name = 'Burbot'                  WHERE id = 56 AND (english_name IS NULL OR english_name = '');
UPDATE species SET english_name = 'Wels catfish'            WHERE id = 57 AND (english_name IS NULL OR english_name = '');
UPDATE species SET english_name = 'Common roach'            WHERE id = 61 AND (english_name IS NULL OR english_name = '');
UPDATE species SET english_name = 'Common bream'            WHERE id = 62 AND (english_name IS NULL OR english_name = '');
UPDATE species SET english_name = 'European chub'           WHERE id = 63 AND (english_name IS NULL OR english_name = '');
UPDATE species SET english_name = 'Gudgeon'                 WHERE id = 64 AND (english_name IS NULL OR english_name = '');
UPDATE species SET english_name = 'Striped bass'            WHERE id = 81 AND (english_name IS NULL OR english_name = '');
UPDATE species SET english_name = 'Red drum'                WHERE id = 82 AND (english_name IS NULL OR english_name = '');
UPDATE species SET english_name = 'Spotted seatrout'        WHERE id = 83 AND (english_name IS NULL OR english_name = '');
UPDATE species SET english_name = 'Cobia'                   WHERE id = 84 AND (english_name IS NULL OR english_name = '');
UPDATE species SET english_name = 'Wahoo'                   WHERE id = 85 AND (english_name IS NULL OR english_name = '');
UPDATE species SET english_name = 'Red-bellied piranha'     WHERE id = 88 AND (english_name IS NULL OR english_name = '');
UPDATE species SET english_name = 'Golden dorado'           WHERE id = 89 AND (english_name IS NULL OR english_name = '');
UPDATE species SET english_name = 'Pacu'                    WHERE id = 90 AND (english_name IS NULL OR english_name = '');
UPDATE species SET english_name = 'Tambaqui'                WHERE id = 91 AND (english_name IS NULL OR english_name = '');
UPDATE species SET english_name = 'Streaked prochilodus'    WHERE id = 95 AND (english_name IS NULL OR english_name = '');
UPDATE species SET english_name = 'Nile perch'              WHERE id = 96 AND (english_name IS NULL OR english_name = '');
UPDATE species SET english_name = 'Nile tilapia'            WHERE id = 97 AND (english_name IS NULL OR english_name = '');
UPDATE species SET english_name = 'Mozambique tilapia'      WHERE id = 98 AND (english_name IS NULL OR english_name = '');
UPDATE species SET english_name = 'African tigerfish'       WHERE id = 99 AND (english_name IS NULL OR english_name = '');
UPDATE species SET english_name = 'Vundu catfish'           WHERE id = 100 AND (english_name IS NULL OR english_name = '');
UPDATE species SET english_name = 'African sharptooth catfish' WHERE id = 101 AND (english_name IS NULL OR english_name = '');
UPDATE species SET english_name = 'Grass carp'              WHERE id = 106 AND (english_name IS NULL OR english_name = '');
UPDATE species SET english_name = 'Striped snakehead'       WHERE id = 108 AND (english_name IS NULL OR english_name = '');
UPDATE species SET english_name = 'Siamese giant carp'      WHERE id = 109 AND (english_name IS NULL OR english_name = '');
UPDATE species SET english_name = 'Goonch catfish'          WHERE id = 110 AND (english_name IS NULL OR english_name = '');
UPDATE species SET english_name = 'Striped catfish'         WHERE id = 111 AND (english_name IS NULL OR english_name = '');
UPDATE species SET english_name = 'Dogtooth tuna'           WHERE id = 116 AND (english_name IS NULL OR english_name = '');
UPDATE species SET english_name = 'Bluespine unicornfish'   WHERE id = 117 AND (english_name IS NULL OR english_name = '');
UPDATE species SET english_name = 'Bigeye scad'             WHERE id = 118 AND (english_name IS NULL OR english_name = '');
