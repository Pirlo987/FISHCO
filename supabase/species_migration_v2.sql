-- ================================================================
-- SPECIES DATABASE — MIGRATION COMPLÈTE v2
-- Nettoyage intégral + aliases (english_name) pour toutes les espèces
-- Couvre les IDs originaux 1-118 + nouvelles espèces Part 3
-- À exécuter dans : Supabase Dashboard → SQL Editor
-- ================================================================

-- ── Infrastructure ────────────────────────────────────────────
ALTER TABLE species ADD COLUMN IF NOT EXISTS updated_at       timestamptz  DEFAULT now();
ALTER TABLE species ADD COLUMN IF NOT EXISTS english_name     text;
ALTER TABLE species ADD COLUMN IF NOT EXISTS french_aliases   text[]       DEFAULT '{}';
ALTER TABLE species ADD COLUMN IF NOT EXISTS english_aliases  text[]       DEFAULT '{}';
ALTER TABLE species ADD COLUMN IF NOT EXISTS regions          text[]       DEFAULT '{}';

-- Séquence auto-increment si absente
DO $$
DECLARE seq_name text;
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


-- ================================================================
-- BLOC 1 — THONIDÉS & PÉLAGIQUES HAUTURIERS (ids 1-9)
-- ================================================================

UPDATE species SET name = 'Thon rouge',                french_name = 'Thon rouge de l''Atlantique',         english_name = 'Atlantic bluefin tuna',            water_type = 'Mer', latin_name = 'Thunnus thynnus'            WHERE id = 1;
UPDATE species SET name = 'Thon rouge Pacifique',      french_name = 'Thon rouge du Pacifique',              english_name = 'Pacific bluefin tuna',             water_type = 'Mer', latin_name = 'Thunnus orientalis'         WHERE id = 2;
UPDATE species SET name = 'Thon jaune',                french_name = 'Thon à nageoires jaunes',              english_name = 'Yellowfin tuna',                   water_type = 'Mer', latin_name = 'Thunnus albacares'          WHERE id = 3;
UPDATE species SET name = 'Thon obese',                french_name = 'Thon obèse',                           english_name = 'Bigeye tuna',                      water_type = 'Mer', latin_name = 'Thunnus obesus'             WHERE id = 4;
UPDATE species SET name = 'Germon',                    french_name = 'Germon (thon blanc)',                   english_name = 'Albacore',                         water_type = 'Mer', latin_name = 'Thunnus alalunga'           WHERE id = 5;
UPDATE species SET name = 'Listao',                    french_name = 'Listao (bonite à ventre rayé)',         english_name = 'Skipjack tuna',                    water_type = 'Mer', latin_name = 'Katsuwonus pelamis'         WHERE id = 6;
UPDATE species SET name = 'Bonite a dos raye',         french_name = 'Bonite à dos rayé',                    english_name = 'Atlantic bonito',                  water_type = 'Mer', latin_name = 'Sarda sarda'                WHERE id = 7;
UPDATE species SET name = 'Little tunny',              french_name = 'Thazard atlantique (little tunny)',     english_name = 'Little tunny',                     water_type = 'Mer', latin_name = 'Euthynnus alletteratus'     WHERE id = 8;
UPDATE species SET name = 'Kawakawa',                  french_name = 'Kawakawa',                             english_name = 'Kawakawa',                         water_type = 'Mer', latin_name = 'Euthynnus affinis'          WHERE id = 9;


-- ================================================================
-- BLOC 2 — MARLINS, VOILIERS & ESPADONS (ids 10-14)
-- ================================================================

UPDATE species SET name = 'Marlin bleu',               french_name = 'Marlin bleu de l''Atlantique',         english_name = 'Atlantic blue marlin',             water_type = 'Mer', latin_name = 'Makaira nigricans'          WHERE id = 10;
UPDATE species SET name = 'Marlin bleu Indo-Pacifique',french_name = 'Marlin bleu Indo-Pacifique',           english_name = 'Indo-Pacific blue marlin',         water_type = 'Mer', latin_name = 'Makaira mazara'             WHERE id = 11;
UPDATE species SET name = 'Marlin raye',               french_name = 'Marlin rayé',                          english_name = 'Striped marlin',                   water_type = 'Mer', latin_name = 'Kajikia audax'              WHERE id = 12;
UPDATE species SET name = 'Marlin noir',               french_name = 'Marlin noir',                          english_name = 'Black marlin',                     water_type = 'Mer', latin_name = 'Istiompax indica'           WHERE id = 13;
UPDATE species SET name = 'Voilier',                   french_name = 'Voilier de l''Atlantique',             english_name = 'Sailfish',                         water_type = 'Mer', latin_name = 'Istiophorus albicans'       WHERE id = 14;


-- ================================================================
-- BLOC 3 — MAQUEREAUX ESPAGNOLS & THAZARDS (ids 15-18)
-- ================================================================

UPDATE species SET name = 'Maquereau espagnol',        french_name = 'Maquereau espagnol',                   english_name = 'Spanish mackerel',                 water_type = 'Mer', latin_name = 'Scomberomorus maculatus'    WHERE id = 15;
UPDATE species SET name = 'Thazard barre',             french_name = 'Thazard barré',                        english_name = 'Narrow-barred Spanish mackerel',   water_type = 'Mer', latin_name = 'Scomberomorus commerson'    WHERE id = 16;
UPDATE species SET name = 'Roi des maquereaux',        french_name = 'Roi des maquereaux',                   english_name = 'King mackerel',                    water_type = 'Mer', latin_name = 'Scomberomorus cavalla'      WHERE id = 17;
UPDATE species SET name = 'Cero',                      french_name = 'Cero (maquereau cero)',                 english_name = 'Cero',                             water_type = 'Mer', latin_name = 'Scomberomorus regalis'      WHERE id = 18;


-- ================================================================
-- BLOC 4 — CARANGUES & SÉRIOLES (ids 19-24)
-- ================================================================

UPDATE species SET name = 'Carangue GT',               french_name = 'Carangue géante (Giant Trevally)',     english_name = 'Giant trevally',                   water_type = 'Mer', latin_name = 'Caranx ignobilis'           WHERE id = 19;
UPDATE species SET name = 'Carangue bleue',            french_name = 'Carangue bleue',                       english_name = 'Bluefin trevally',                 water_type = 'Mer', latin_name = 'Caranx melampygus'          WHERE id = 20;
UPDATE species SET name = 'Carangue doree',            french_name = 'Carangue dorée',                       english_name = 'Golden trevally',                  water_type = 'Mer', latin_name = 'Gnathanodon speciosus'      WHERE id = 21;
UPDATE species SET name = 'Rainbow runner',            french_name = 'Rainbow runner',                       english_name = 'Rainbow runner',                   water_type = 'Mer', latin_name = 'Elagatis bipinnulata'       WHERE id = 22;
UPDATE species SET name = 'Seriole limon',             french_name = 'Sériole limon (Yellowtail)',           english_name = 'Yellowtail amberjack',             water_type = 'Mer', latin_name = 'Seriola lalandi'            WHERE id = 23;
UPDATE species SET name = 'Seriole',                   french_name = 'Sériole couronnée (Greater amberjack)', english_name = 'Greater amberjack',               water_type = 'Mer', latin_name = 'Seriola dumerili'           WHERE id = 24;


-- ================================================================
-- BLOC 5 — MÉROUS & VIVANEAUX (ids 25-34)
-- ================================================================

UPDATE species SET name = 'Merou geant',              french_name = 'Mérou géant (Goliath grouper)',        english_name = 'Goliath grouper',                  water_type = 'Mer', latin_name = 'Epinephelus itajara'        WHERE id = 25;
UPDATE species SET name = 'Merou noir',               french_name = 'Mérou noir',                           english_name = 'Black grouper',                    water_type = 'Mer', latin_name = 'Mycteroperca bonaci'        WHERE id = 26;
UPDATE species SET name = 'Merou rayé',               french_name = 'Mérou rayé',                           english_name = 'Nassau grouper',                   water_type = 'Mer', latin_name = 'Epinephelus striatus'       WHERE id = 27;
UPDATE species SET name = 'Vivaneau rouge',           french_name = 'Vivaneau rouge',                       english_name = 'Red snapper',                      water_type = 'Mer', latin_name = 'Lutjanus campechanus'       WHERE id = 28;
UPDATE species SET name = 'Vivaneau cubere',          french_name = 'Vivaneau cubère',                      english_name = 'Cubera snapper',                   water_type = 'Mer', latin_name = 'Lutjanus cyanopterus'       WHERE id = 29;
UPDATE species SET name = 'Vivaneau soie',            french_name = 'Vivaneau soie',                        english_name = 'Silk snapper',                     water_type = 'Mer', latin_name = 'Lutjanus vivanus'           WHERE id = 30;
UPDATE species SET name = 'Vivaneau levreche',        french_name = 'Vivaneau lèvrèche',                    english_name = 'Mutton snapper',                   water_type = 'Mer', latin_name = 'Lutjanus analis'            WHERE id = 31;
UPDATE species SET name = 'Balaou',                   french_name = 'Balaou (Halfbeak)',                    english_name = 'Halfbeak',                         water_type = 'Mer', latin_name = 'Hemiramphus brasiliensis'   WHERE id = 32;
UPDATE species SET name = 'Perche de mer',            french_name = 'Perche de mer (Barramundi)',           english_name = 'Barramundi',                       water_type = 'Mixte', latin_name = 'Lates calcarifer'          WHERE id = 33;
UPDATE species SET name = 'Jobfish vert',             french_name = 'Jobfish vert',                         english_name = 'Green jobfish',                    water_type = 'Mer', latin_name = 'Aprion virescens'           WHERE id = 34;


-- ================================================================
-- BLOC 6 — GADIDÉS & POISSONS DE FOND MARINS (ids 35-40)
-- ================================================================

UPDATE species SET name = 'Cabillaud',                french_name = 'Cabillaud (morue de l''Atlantique)',   english_name = 'Atlantic cod',                     water_type = 'Mer', latin_name = 'Gadus morhua'               WHERE id = 35;
UPDATE species SET name = 'Lieu noir',                french_name = 'Lieu noir (colin)',                    english_name = 'Saithe',                           water_type = 'Mer', latin_name = 'Pollachius virens'          WHERE id = 36;
UPDATE species SET name = 'Lieu jaune',               french_name = 'Lieu jaune (pollack)',                 english_name = 'Pollack',                          water_type = 'Mer', latin_name = 'Pollachius pollachius'      WHERE id = 37;
UPDATE species SET name = 'Merlan',                   french_name = 'Merlan',                               english_name = 'Whiting',                          water_type = 'Mer', latin_name = 'Merlangius merlangus'       WHERE id = 38;
UPDATE species SET name = 'Maquereau',                french_name = 'Maquereau commun',                     english_name = 'Atlantic mackerel',                water_type = 'Mer', latin_name = 'Scomber scombrus'           WHERE id = 39;
UPDATE species SET name = 'Orphie',                   french_name = 'Orphie commune (aiguille de mer)',     english_name = 'Garfish',                          water_type = 'Mer', latin_name = 'Belone belone'              WHERE id = 40;


-- ================================================================
-- BLOC 7 — SPARIDÉS, PLEURONECTIFORMES & POISSONS PLATS (ids 41-47)
-- ================================================================

UPDATE species SET name = 'Rouget barbet',            french_name = 'Rouget barbet de roche',               english_name = 'Red mullet',                       water_type = 'Mer', latin_name = 'Mullus surmuletus'          WHERE id = 41;
UPDATE species SET name = 'Sole commune',             french_name = 'Sole commune',                         english_name = 'Common sole',                      water_type = 'Mer', latin_name = 'Solea solea'                WHERE id = 42;
UPDATE species SET name = 'Turbot',                   french_name = 'Turbot',                               english_name = 'Turbot',                           water_type = 'Mer', latin_name = 'Scophthalmus maximus'       WHERE id = 43;
UPDATE species SET name = 'Barbue',                   french_name = 'Barbue',                               english_name = 'Brill',                            water_type = 'Mer', latin_name = 'Scophthalmus rhombus'       WHERE id = 44;
UPDATE species SET name = 'Sar commun',               french_name = 'Sar commun (sparaillon)',               english_name = 'White seabream',                   water_type = 'Mer', latin_name = 'Diplodus sargus'            WHERE id = 45;
UPDATE species SET name = 'Dorade royale',            french_name = 'Daurade royale',                       english_name = 'Gilthead seabream',                water_type = 'Mer', latin_name = 'Sparus aurata'             WHERE id = 46;
UPDATE species SET name = 'Pagre',                    french_name = 'Pagre commun',                         english_name = 'Red porgy',                        water_type = 'Mer', latin_name = 'Pagrus pagrus'              WHERE id = 47;


-- ================================================================
-- BLOC 8 — CARNASSIERS D'EAU DOUCE EUROPÉENS (ids 48-50)
-- ================================================================

UPDATE species SET name = 'Brochet',                  french_name = 'Brochet commun',                       english_name = 'Northern pike',                    water_type = 'Douce', latin_name = 'Esox lucius'              WHERE id = 48;
UPDATE species SET name = 'Perche',                   french_name = 'Perche européenne',                    english_name = 'European perch',                   water_type = 'Douce', latin_name = 'Perca fluviatilis'        WHERE id = 49;
UPDATE species SET name = 'Sandre',                   french_name = 'Sandre',                               english_name = 'Zander',                           water_type = 'Douce', latin_name = 'Sander lucioperca'        WHERE id = 50;


-- ================================================================
-- BLOC 9 — CYPRINIDÉS EUROPÉENS (ids 51, 60-64)
-- ================================================================

UPDATE species SET name = 'Carpe commune',            french_name = 'Carpe commune',                        english_name = 'Common carp',                      water_type = 'Douce', latin_name = 'Cyprinus carpio'          WHERE id = 51;
UPDATE species SET name = 'Tanche',                   french_name = 'Tanche',                               english_name = 'Tench',                            water_type = 'Douce', latin_name = 'Tinca tinca'              WHERE id = 60;
UPDATE species SET name = 'Gardon',                   french_name = 'Gardon',                               english_name = 'Common roach',                     water_type = 'Douce', latin_name = 'Rutilus rutilus'          WHERE id = 61;
UPDATE species SET name = 'Breme',                    french_name = 'Brème commune',                        english_name = 'Common bream',                     water_type = 'Douce', latin_name = 'Abramis brama'            WHERE id = 62;
UPDATE species SET name = 'Chevesne',                 french_name = 'Chevesne (chabot)',                    english_name = 'European chub',                    water_type = 'Douce', latin_name = 'Squalius cephalus'        WHERE id = 63;
UPDATE species SET name = 'Goujon',                   french_name = 'Goujon',                               english_name = 'Gudgeon',                          water_type = 'Douce', latin_name = 'Gobio gobio'              WHERE id = 64;


-- ================================================================
-- BLOC 10 — SALMONIDÉS EUROPÉENS (ids 52-55)
-- ================================================================

UPDATE species SET name = 'Truite fario',             french_name = 'Truite fario (truite de rivière)',     english_name = 'Brown trout',                      water_type = 'Douce', latin_name = 'Salmo trutta fario'       WHERE id = 52;
UPDATE species SET name = 'Truite arc-en-ciel',       french_name = 'Truite arc-en-ciel',                   english_name = 'Rainbow trout',                    water_type = 'Douce', latin_name = 'Oncorhynchus mykiss'      WHERE id = 53;
UPDATE species SET name = 'Omble chevalier',          french_name = 'Omble chevalier',                      english_name = 'Arctic char',                      water_type = 'Douce', latin_name = 'Salvelinus alpinus'       WHERE id = 54;
UPDATE species SET name = 'Ombre commun',             french_name = 'Ombre commun',                         english_name = 'European grayling',                water_type = 'Douce', latin_name = 'Thymallus thymallus'      WHERE id = 55;


-- ================================================================
-- BLOC 11 — ESPÈCES MIGRATRICES & SILURIDÉS (ids 56-59)
-- ================================================================

UPDATE species SET name = 'Lotte de riviere',         french_name = 'Lotte de rivière',                     english_name = 'Burbot',                           water_type = 'Douce', latin_name = 'Lota lota'                WHERE id = 56;
UPDATE species SET name = 'Silure glane',             french_name = 'Silure glane',                         english_name = 'Wels catfish',                     water_type = 'Douce', latin_name = 'Silurus glanis'           WHERE id = 57;
UPDATE species SET name = 'Saumon atlantique',        french_name = 'Saumon de l''Atlantique',              english_name = 'Atlantic salmon',                  water_type = 'Mixte', latin_name = 'Salmo salar'              WHERE id = 58;
UPDATE species SET name = 'Anguille',                 french_name = 'Anguille européenne',                  english_name = 'European eel',                     water_type = 'Mixte', latin_name = 'Anguilla anguilla'        WHERE id = 59;


-- ================================================================
-- BLOC 12 — BASS & PERCIDÉS NORD-AMÉRICAINS (ids 65-75)
-- ================================================================

UPDATE species SET name = 'Largemouth bass',          french_name = 'Black-bass à grande bouche',           english_name = 'Largemouth bass',                  water_type = 'Douce', latin_name = 'Micropterus salmoides'    WHERE id = 65;
UPDATE species SET name = 'Smallmouth bass',          french_name = 'Black-bass à petite bouche',           english_name = 'Smallmouth bass',                  water_type = 'Douce', latin_name = 'Micropterus dolomieu'     WHERE id = 66;
UPDATE species SET name = 'Spotted bass',             french_name = 'Black-bass tacheté',                   english_name = 'Spotted bass',                     water_type = 'Douce', latin_name = 'Micropterus punctulatus'  WHERE id = 67;
UPDATE species SET name = 'Walleye',                  french_name = 'Doré jaune (Walleye)',                 english_name = 'Walleye',                          water_type = 'Douce', latin_name = 'Sander vitreus'           WHERE id = 68;
UPDATE species SET name = 'Sauger',                   french_name = 'Doré noir (Sauger)',                   english_name = 'Sauger',                           water_type = 'Douce', latin_name = 'Sander canadensis'        WHERE id = 69;
UPDATE species SET name = 'Perchaude',                french_name = 'Perchaude (perche jaune)',             english_name = 'Yellow perch',                     water_type = 'Douce', latin_name = 'Perca flavescens'         WHERE id = 70;
UPDATE species SET name = 'Black crappie',            french_name = 'Black crappie',                        english_name = 'Black crappie',                    water_type = 'Douce', latin_name = 'Pomoxis nigromaculatus'   WHERE id = 71;
UPDATE species SET name = 'Bluegill',                 french_name = 'Bluegill (perche soleil bleue)',       english_name = 'Bluegill sunfish',                 water_type = 'Douce', latin_name = 'Lepomis macrochirus'      WHERE id = 72;
UPDATE species SET name = 'Channel catfish',          french_name = 'Barbue de rivière (channel catfish)',  english_name = 'Channel catfish',                  water_type = 'Douce', latin_name = 'Ictalurus punctatus'      WHERE id = 73;
UPDATE species SET name = 'Blue catfish',             french_name = 'Poisson-chat bleu',                    english_name = 'Blue catfish',                     water_type = 'Douce', latin_name = 'Ictalurus furcatus'       WHERE id = 74;
UPDATE species SET name = 'Flathead catfish',         french_name = 'Poisson-chat tête-plate',              english_name = 'Flathead catfish',                 water_type = 'Douce', latin_name = 'Pylodictis olivaris'      WHERE id = 75;


-- ================================================================
-- BLOC 13 — SALMONIDÉS NORD-AMÉRICAINS (ids 76-80)
-- ================================================================

UPDATE species SET name = 'Truite de lac',            french_name = 'Truite de lac',                        english_name = 'Lake trout',                       water_type = 'Douce', latin_name = 'Salvelinus namaycush'     WHERE id = 76;
UPDATE species SET name = 'Truite fardee',            french_name = 'Truite fardée',                        english_name = 'Cutthroat trout',                  water_type = 'Douce', latin_name = 'Oncorhynchus clarkii'     WHERE id = 77;
UPDATE species SET name = 'Saumon chinook',           french_name = 'Saumon chinook (roi)',                 english_name = 'Chinook salmon',                   water_type = 'Mixte', latin_name = 'Oncorhynchus tshawytscha' WHERE id = 78;
UPDATE species SET name = 'Saumon coho',              french_name = 'Saumon coho',                          english_name = 'Coho salmon',                      water_type = 'Mixte', latin_name = 'Oncorhynchus kisutch'     WHERE id = 79;
UPDATE species SET name = 'Saumon sockeye',           french_name = 'Saumon sockeye (rouge)',               english_name = 'Sockeye salmon',                   water_type = 'Mixte', latin_name = 'Oncorhynchus nerka'       WHERE id = 80;


-- ================================================================
-- BLOC 14 — PERCIDÉS & PÉLAGIQUES CÔTIERS AMÉRICAINS (ids 81-85)
-- ================================================================

UPDATE species SET name = 'Striped bass',             french_name = 'Bar rayé (striped bass)',              english_name = 'Striped bass',                     water_type = 'Mixte', latin_name = 'Morone saxatilis'         WHERE id = 81;
UPDATE species SET name = 'Red drum',                 french_name = 'Red drum (tambour rouge)',             english_name = 'Red drum',                         water_type = 'Mer',   latin_name = 'Sciaenops ocellatus'      WHERE id = 82;
UPDATE species SET name = 'Spotted seatrout',         french_name = 'Truite de mer tachetée',               english_name = 'Spotted seatrout',                 water_type = 'Mer',   latin_name = 'Cynoscion nebulosus'      WHERE id = 83;
UPDATE species SET name = 'Cobia',                    french_name = 'Cobia (mafou)',                        english_name = 'Cobia',                            water_type = 'Mer',   latin_name = 'Rachycentron canadum'     WHERE id = 84;
UPDATE species SET name = 'Wahoo',                    french_name = 'Wahoo (thazard-bâtard)',               english_name = 'Wahoo',                            water_type = 'Mer',   latin_name = 'Acanthocybium solandri'   WHERE id = 85;


-- ================================================================
-- BLOC 15 — POISSONS D'AMAZONIE (ids 86-95)
-- ================================================================

UPDATE species SET name = 'Arapaima',                 french_name = 'Arapaïma (pirarucu)',                  english_name = 'Arapaima',                         water_type = 'Douce', latin_name = 'Arapaima gigas'           WHERE id = 86;
UPDATE species SET name = 'Peacock bass',             french_name = 'Pavon (peacock bass)',                 english_name = 'Peacock bass',                     water_type = 'Douce', latin_name = 'Cichla ocellaris'         WHERE id = 87;
UPDATE species SET name = 'Piranha rouge',            french_name = 'Piranha rouge',                        english_name = 'Red-bellied piranha',              water_type = 'Douce', latin_name = 'Pygocentrus nattereri'    WHERE id = 88;
UPDATE species SET name = 'Dorado',                   french_name = 'Dorado (golden dorado)',               english_name = 'Golden dorado',                    water_type = 'Douce', latin_name = 'Salminus brasiliensis'    WHERE id = 89;
UPDATE species SET name = 'Pacu',                     french_name = 'Pacu',                                 english_name = 'Pacu',                             water_type = 'Douce', latin_name = 'Colossoma bidens'         WHERE id = 90;
UPDATE species SET name = 'Tambaqui',                 french_name = 'Tambaqui',                             english_name = 'Tambaqui',                         water_type = 'Douce', latin_name = 'Colossoma macropomum'     WHERE id = 91;
UPDATE species SET name = 'Surubi',                   french_name = 'Surubí (poisson-chat tigré)',          english_name = 'Tiger catfish',                    water_type = 'Douce', latin_name = 'Pseudoplatystoma corruscans' WHERE id = 92;
UPDATE species SET name = 'Payara',                   french_name = 'Payara (poisson-vampire)',             english_name = 'Payara',                           water_type = 'Douce', latin_name = 'Hydrolycus scomberoides'  WHERE id = 93;
UPDATE species SET name = 'Trahira',                  french_name = 'Trahira (loup d''eau douce)',          english_name = 'Trahira',                          water_type = 'Douce', latin_name = 'Hoplias malabaricus'      WHERE id = 94;
UPDATE species SET name = 'Sabalo',                   french_name = 'Sabalo (dorade d''Amérique du Sud)',   english_name = 'Streaked prochilodus',              water_type = 'Douce', latin_name = 'Prochilodus lineatus'     WHERE id = 95;


-- ================================================================
-- BLOC 16 — POISSONS AFRICAINS (ids 96-103)
-- ================================================================

UPDATE species SET name = 'Perche du Nil',            french_name = 'Perche du Nil',                        english_name = 'Nile perch',                       water_type = 'Douce', latin_name = 'Lates niloticus'          WHERE id = 96;
UPDATE species SET name = 'Tilapia du Nil',           french_name = 'Tilapia du Nil',                       english_name = 'Nile tilapia',                     water_type = 'Douce', latin_name = 'Oreochromis niloticus'    WHERE id = 97;
UPDATE species SET name = 'Tilapia mozambicain',      french_name = 'Tilapia mozambicain',                  english_name = 'Mozambique tilapia',               water_type = 'Douce', latin_name = 'Oreochromis mossambicus' WHERE id = 98;
UPDATE species SET name = 'Tigerfish',                french_name = 'Tigerfish africain',                   english_name = 'African tigerfish',                water_type = 'Douce', latin_name = 'Hydrocynus vittatus'      WHERE id = 99;
UPDATE species SET name = 'Vundu catfish',            french_name = 'Vundu (silure africain géant)',        english_name = 'Vundu catfish',                    water_type = 'Douce', latin_name = 'Heterobranchus longifilis' WHERE id = 100;
UPDATE species SET name = 'Poisson-chat africain',    french_name = 'Poisson-chat africain',                english_name = 'African sharptooth catfish',       water_type = 'Douce', latin_name = 'Clarias gariepinus'       WHERE id = 101;
UPDATE species SET name = 'Leerfish',                 french_name = 'Lichia (leerfish)',                    english_name = 'Leerfish',                         water_type = 'Mer',   latin_name = 'Lichia amia'              WHERE id = 102;
UPDATE species SET name = 'Kob',                      french_name = 'Courbine (kob)',                       english_name = 'Kob',                              water_type = 'Mer',   latin_name = 'Argyrosomus japonicus'    WHERE id = 103;


-- ================================================================
-- BLOC 17 — POISSONS ASIATIQUES (ids 104-114)
-- ================================================================

UPDATE species SET name = 'Barramundi',               french_name = 'Barramundi (perche géante)',           english_name = 'Barramundi',                       water_type = 'Mixte', latin_name = 'Lates calcarifer'         WHERE id = 104;
UPDATE species SET name = 'Mahseer dore',             french_name = 'Mahseer doré',                         english_name = 'Golden mahseer',                   water_type = 'Douce', latin_name = 'Tor putitora'             WHERE id = 105;
UPDATE species SET name = 'Carpe amour',              french_name = 'Carpe herbivore (amour blanc)',        english_name = 'Grass carp',                       water_type = 'Douce', latin_name = 'Ctenopharyngodon idella'  WHERE id = 106;
UPDATE species SET name = 'Giant snakehead',          french_name = 'Channa géant (giant snakehead)',       english_name = 'Giant snakehead',                  water_type = 'Douce', latin_name = 'Channa micropeltes'       WHERE id = 107;
UPDATE species SET name = 'Snakehead raye',           french_name = 'Channa rayé (striped snakehead)',      english_name = 'Striped snakehead',                water_type = 'Douce', latin_name = 'Channa striata'           WHERE id = 108;
UPDATE species SET name = 'Siamese giant carp',       french_name = 'Carpe géante siamoise',                english_name = 'Siamese giant carp',               water_type = 'Douce', latin_name = 'Catlocarpio siamensis'   WHERE id = 109;
UPDATE species SET name = 'Goonch',                   french_name = 'Goonch (poisson-chat géant d''Inde)', english_name = 'Goonch catfish',                   water_type = 'Douce', latin_name = 'Bagarius yarrelli'        WHERE id = 110;
UPDATE species SET name = 'Pangasius',                french_name = 'Pangasius (poisson-chat rayé)',        english_name = 'Striped catfish',                  water_type = 'Douce', latin_name = 'Pangasianodon hypophthalmus' WHERE id = 111;
UPDATE species SET name = 'Taimen',                   french_name = 'Taimen (saumon géant de Sibérie)',     english_name = 'Taimen',                           water_type = 'Douce', latin_name = 'Hucho taimen'             WHERE id = 112;
UPDATE species SET name = 'Mahseer rouge',            french_name = 'Mahseer rouge',                        english_name = 'Red-finned mahseer',               water_type = 'Douce', latin_name = 'Tor tambroides'           WHERE id = 113;
UPDATE species SET name = 'Dorade coryphene',         french_name = 'Dorade coryphène (Mahi-mahi indien)', english_name = 'Pompano dolphinfish',              water_type = 'Mer',   latin_name = 'Coryphaena equiselis'     WHERE id = 114;


-- ================================================================
-- BLOC 18 — GRANDS PÉLAGIQUES TROPICAUX (ids 115-118)
-- ================================================================

UPDATE species SET name = 'Mahi-mahi',               french_name = 'Mahi-mahi (coryphène)',                english_name = 'Mahi-mahi',                        water_type = 'Mer',   latin_name = 'Coryphaena hippurus'      WHERE id = 115;
UPDATE species SET name = 'Thon a dents de chien',   french_name = 'Thon à dents de chien',                english_name = 'Dogtooth tuna',                    water_type = 'Mer',   latin_name = 'Gymnosarda unicolor'      WHERE id = 116;
UPDATE species SET name = 'Nason licorne',            french_name = 'Nason licorne (unicornfish)',          english_name = 'Bluespine unicornfish',             water_type = 'Mer',   latin_name = 'Naso unicornis'           WHERE id = 117;
UPDATE species SET name = 'Selar',                    french_name = 'Selar couronné (bigeye scad)',         english_name = 'Bigeye scad',                      water_type = 'Mer',   latin_name = 'Selar crumenophthalmus'   WHERE id = 118;


-- ================================================================
-- BLOC 19 — MISE À JOUR DES ESPÈCES AJOUTÉES EN PART 3
-- (identifiées par latin_name car leur id est inconnu)
-- ================================================================

UPDATE species SET
  name = 'Bar',             french_name = 'Bar commun (loup de mer)',        english_name = 'European sea bass',          water_type = 'Mer'
  WHERE latin_name = 'Dicentrarchus labrax';

UPDATE species SET
  name = 'Dorade grise',   french_name = 'Dorade grise',                    english_name = 'Black seabream',             water_type = 'Mer'
  WHERE latin_name = 'Spondyliosoma cantharus';

UPDATE species SET
  name = 'Mulet',          french_name = 'Mulet à grosse tête',             english_name = 'Thick-lipped grey mullet',   water_type = 'Mer'
  WHERE latin_name = 'Chelon labrosus';

UPDATE species SET
  name = 'Sardine',        french_name = 'Sardine européenne',               english_name = 'European pilchard',          water_type = 'Mer'
  WHERE latin_name = 'Sardina pilchardus';

UPDATE species SET
  name = 'Hareng',         french_name = 'Hareng de l''Atlantique',         english_name = 'Atlantic herring',           water_type = 'Mer'
  WHERE latin_name = 'Clupea harengus';

UPDATE species SET
  name = 'Eperlan',        french_name = 'Éperlan européen',                english_name = 'European smelt',             water_type = 'Mixte'
  WHERE latin_name = 'Osmerus eperlanus';

UPDATE species SET
  name = 'Congre',         french_name = 'Congre commun',                   english_name = 'European conger',            water_type = 'Mer'
  WHERE latin_name = 'Conger conger';

UPDATE species SET
  name = 'Raie',           french_name = 'Raie bouclée',                    english_name = 'Thornback ray',              water_type = 'Mer'
  WHERE latin_name = 'Raja clavata';

UPDATE species SET
  name = 'Grondin rouge',  french_name = 'Grondin rouge',                   english_name = 'Red gurnard',                water_type = 'Mer'
  WHERE latin_name = 'Chelidonichthys cuculus';

UPDATE species SET
  name = 'Grondin gris',   french_name = 'Grondin gris',                    english_name = 'Grey gurnard',               water_type = 'Mer'
  WHERE latin_name = 'Eutrigla gurnardus';

UPDATE species SET
  name = 'Saint-Pierre',   french_name = 'Saint-Pierre',                    english_name = 'John Dory',                  water_type = 'Mer'
  WHERE latin_name = 'Zeus faber';

UPDATE species SET
  name = 'Vieille',        french_name = 'Vieille (labre commun)',          english_name = 'Ballan wrasse',              water_type = 'Mer'
  WHERE latin_name = 'Labrus bergylta';

UPDATE species SET
  name = 'Chinchard',      french_name = 'Chinchard commun',                english_name = 'Atlantic horse mackerel',    water_type = 'Mer'
  WHERE latin_name = 'Trachurus trachurus';

UPDATE species SET
  name = 'Carpe miroir',   french_name = 'Carpe miroir',                    english_name = 'Mirror carp',                water_type = 'Douce'
  WHERE latin_name = 'Cyprinus carpio' AND french_name = 'Carpe miroir';

UPDATE species SET
  name = 'Carpe cuir',     french_name = 'Carpe cuir',                      english_name = 'Leather carp',               water_type = 'Douce'
  WHERE latin_name = 'Cyprinus carpio' AND french_name = 'Carpe cuir';

UPDATE species SET
  name = 'Rotengle',       french_name = 'Rotengle',                        english_name = 'Rudd',                       water_type = 'Douce'
  WHERE latin_name = 'Scardinius erythrophthalmus';

UPDATE species SET
  name = 'Ablette',        french_name = 'Ablette commune',                 english_name = 'Common bleak',               water_type = 'Douce'
  WHERE latin_name = 'Alburnus alburnus';

UPDATE species SET
  name = 'Barbeau',        french_name = 'Barbeau fluviatile',              english_name = 'Barbel',                     water_type = 'Douce'
  WHERE latin_name = 'Barbus barbus';

UPDATE species SET
  name = 'Black-bass',     french_name = 'Black-bass (achigan)',             english_name = 'Largemouth bass',            water_type = 'Douce'
  WHERE latin_name = 'Micropterus salmoides' AND french_name = 'Black-bass';

UPDATE species SET
  name = 'Oblade',         french_name = 'Oblade',                          english_name = 'Saddled seabream',           water_type = 'Mer'
  WHERE latin_name = 'Oblada melanura';

UPDATE species SET
  name = 'Saupe',          french_name = 'Saupe',                           english_name = 'Salema porgy',               water_type = 'Mer'
  WHERE latin_name = 'Sarpa salpa';

UPDATE species SET
  name = 'Lotte de mer',   french_name = 'Lotte de mer (baudroie)',         english_name = 'Anglerfish',                 water_type = 'Mer'
  WHERE latin_name = 'Lophius piscatorius';

UPDATE species SET
  name = 'Tacaud',         french_name = 'Tacaud commun',                   english_name = 'Poor cod',                   water_type = 'Mer'
  WHERE latin_name = 'Trisopterus minutus';

UPDATE species SET
  name = 'Pageot',         french_name = 'Pageot commun',                   english_name = 'Common pandora',             water_type = 'Mer'
  WHERE latin_name = 'Pagellus erythrinus';

UPDATE species SET
  name = 'Perche soleil',  french_name = 'Perche-soleil',                   english_name = 'Pumpkinseed sunfish',        water_type = 'Douce'
  WHERE latin_name = 'Lepomis gibbosus';

UPDATE species SET
  name = 'Poisson-chat',   french_name = 'Poisson-chat américain',          english_name = 'Black bullhead',             water_type = 'Douce'
  WHERE latin_name = 'Ameiurus melas';

UPDATE species SET
  name = 'Vairon',         french_name = 'Vairon',                          english_name = 'Common minnow',              water_type = 'Douce'
  WHERE latin_name = 'Phoxinus phoxinus';

UPDATE species SET
  name = 'Vandoise',       french_name = 'Vandoise commune',                english_name = 'Common dace',                water_type = 'Douce'
  WHERE latin_name = 'Leuciscus leuciscus';

UPDATE species SET
  name = 'Ide melanote',   french_name = 'Ide mélanote',                   english_name = 'Ide',                        water_type = 'Douce'
  WHERE latin_name = 'Leuciscus idus';

UPDATE species SET
  name = 'Espadon',        french_name = 'Espadon',                         english_name = 'Swordfish',                  water_type = 'Mer'
  WHERE latin_name = 'Xiphias gladius';


-- ================================================================
-- BLOC 20 — NOUVELLES ESPÈCES MANQUANTES
-- (INSERT avec ON CONFLICT DO NOTHING sur latin_name)
-- ================================================================

-- Mérou brun (absent de la BDD)
INSERT INTO species (french_name, name, latin_name, english_name, fish_type, water_type,
  average_weight_kg, max_weight_kg, average_size_cm, legal_min_size_cm,
  conservation_status, diet, fishing_methods, baits, optimal_season, region_stock)
SELECT 'Mérou brun', 'Merou brun', 'Epinephelus marginatus', 'Dusky grouper',
  'Carnassier', 'Mer', 3.0, 60.0, 60, 45,
  'Vulnérable (UICN)',
  'Piscivore (poissons, pieuvres, crustacés)',
  'Fusil sous-marin, fond rocheux, jigging',
  'Pieuvres, poissons vifs, leurres',
  'Été', 'Méditerranée & Atlantique Est'
WHERE NOT EXISTS (SELECT 1 FROM species WHERE latin_name = 'Epinephelus marginatus');

-- Barramundi (si pas déjà présent avec ce name)
INSERT INTO species (french_name, name, latin_name, english_name, fish_type, water_type,
  average_weight_kg, max_weight_kg, average_size_cm, legal_min_size_cm,
  diet, fishing_methods, baits, optimal_season, region_stock)
SELECT 'Barramundi (perche géante)', 'Barramundi', 'Lates calcarifer', 'Barramundi',
  'Carnassier', 'Mixte', 4.0, 60.0, 70, 55,
  'Piscivore (crevettes, petits poissons)',
  'Leurres souples, jigs, popper, lancer-ramener',
  'Leurres artificiels, crevettes, poissons',
  'Toute l''année', 'Australie, Asie du Sud-Est'
WHERE NOT EXISTS (SELECT 1 FROM species WHERE name = 'Barramundi');


-- ================================================================
-- BLOC 21 — ALIASES (noms familiers / annexes FR & EN)
-- french_aliases  = noms populaires / régionaux français
-- english_aliases = noms populaires / régionaux anglais
-- ================================================================

-- ── THONIDÉS ──────────────────────────────────────────────────
UPDATE species SET
  english_aliases = ARRAY['Bluefin', 'BFT']
  WHERE id = 1; -- Thon rouge (english_name = 'Atlantic bluefin tuna')

UPDATE species SET
  english_aliases = ARRAY['Yellowfin', 'Ahi', 'YFT']
  WHERE id = 3; -- Thon jaune

UPDATE species SET
  english_aliases = ARRAY['Bigeye', 'BET']
  WHERE id = 4; -- Thon obese

UPDATE species SET
  english_aliases = ARRAY['Longfin tuna', 'White tuna']
  WHERE id = 5; -- Germon (english_name = 'Albacore')

UPDATE species SET
  english_aliases = ARRAY['Skipjack', 'Oceanic bonito', 'Striped tuna']
  WHERE id = 6; -- Listao

UPDATE species SET
  french_aliases  = ARRAY['Bonite', 'Pélamide'],
  english_aliases = ARRAY['Bonito']
  WHERE id = 7; -- Bonite à dos rayé

-- ── MARLINS & VOILIERS ────────────────────────────────────────
UPDATE species SET
  english_aliases = ARRAY['Blue marlin']
  WHERE id = 10; -- Marlin bleu

UPDATE species SET
  english_aliases = ARRAY['Indo-Pacific sailfish']
  WHERE id = 14; -- Voilier (english_name = 'Sailfish')

UPDATE species SET
  french_aliases  = ARRAY['Espadon voilier'],
  english_aliases = ARRAY['Broadbill', 'Broadbill swordfish']
  WHERE latin_name = 'Xiphias gladius'; -- Espadon (english_name = 'Swordfish')

-- ── CARANGUES & SÉRIOLES ─────────────────────────────────────
UPDATE species SET
  french_aliases  = ARRAY['GT', 'Carangue géante'],
  english_aliases = ARRAY['GT', 'GTs']
  WHERE id = 19; -- Carangue GT (english_name = 'Giant trevally')

UPDATE species SET
  french_aliases  = ARRAY['Sériole', 'Limon'],
  english_aliases = ARRAY['Amberjack', 'AJ']
  WHERE id = 24; -- Seriole (english_name = 'Greater amberjack')

-- ── WAHOO, MAHI-MAHI, COBIA ───────────────────────────────────
UPDATE species SET
  english_aliases = ARRAY['Ono', 'Pacific kingfish']
  WHERE id = 85; -- Wahoo

UPDATE species SET
  french_aliases  = ARRAY['Coryphène', 'Dorade tropicale', 'Daurade coryphène'],
  english_aliases = ARRAY['Dolphinfish', 'Dorado', 'Common dolphinfish']
  WHERE id = 115; -- Mahi-mahi

UPDATE species SET
  english_aliases = ARRAY['Ling', 'Black kingfish', 'Lemonfish', 'Sergeant fish']
  WHERE id = 84; -- Cobia

-- ── GADIDÉS & FOND MARINS ─────────────────────────────────────
UPDATE species SET
  french_aliases  = ARRAY['Morue', 'Morue de l''Atlantique'],
  english_aliases = ARRAY['Cod', 'Codfish']
  WHERE id = 35; -- Cabillaud (english_name = 'Atlantic cod')

UPDATE species SET
  french_aliases  = ARRAY['Lieu', 'Colin noir'],
  english_aliases = ARRAY['Coley', 'Coalfish', 'Black pollack']
  WHERE id = 36; -- Lieu noir (english_name = 'Saithe')

UPDATE species SET
  french_aliases  = ARRAY['Lieu'],
  english_aliases = ARRAY['Lythe', 'Green pollack']
  WHERE id = 37; -- Lieu jaune (english_name = 'Pollack')

UPDATE species SET
  english_aliases = ARRAY['Mackerel', 'Joey']
  WHERE id = 39; -- Maquereau (english_name = 'Atlantic mackerel')

UPDATE species SET
  french_aliases  = ARRAY['Aiguille de mer'],
  english_aliases = ARRAY['Needlefish', 'Gar']
  WHERE id = 40; -- Orphie (english_name = 'Garfish')

-- ── SPARIDÉS & PLATS ──────────────────────────────────────────
UPDATE species SET
  french_aliases  = ARRAY['Rouget', 'Rouget de roche'],
  english_aliases = ARRAY['Goatfish', 'Surmullet']
  WHERE id = 41; -- Rouget barbet (english_name = 'Red mullet')

UPDATE species SET
  english_aliases = ARRAY['Dover sole', 'English sole']
  WHERE id = 42; -- Sole commune (english_name = 'Common sole')

UPDATE species SET
  french_aliases  = ARRAY['Daurade', 'Dorade', 'Daurade royale'],
  english_aliases = ARRAY['Sea bream', 'Orata', 'Gilt-head bream']
  WHERE id = 46; -- Dorade royale (english_name = 'Gilthead seabream')

UPDATE species SET
  french_aliases  = ARRAY['Loup', 'Loup de mer', 'Loubine', 'Branzin'],
  english_aliases = ARRAY['Sea bass', 'Branzino', 'Loup']
  WHERE latin_name = 'Dicentrarchus labrax'; -- Bar (english_name = 'European sea bass')

UPDATE species SET
  english_aliases = ARRAY['St Peter''s fish', 'Dory']
  WHERE latin_name = 'Zeus faber'; -- Saint-Pierre (english_name = 'John Dory')

UPDATE species SET
  french_aliases  = ARRAY['Baudroie', 'Crapaud de mer', 'Diable de mer'],
  english_aliases = ARRAY['Monkfish', 'Goosefish', 'Sea-devil']
  WHERE latin_name = 'Lophius piscatorius'; -- Lotte de mer (english_name = 'Anglerfish')

UPDATE species SET
  english_aliases = ARRAY['Conger eel', 'Common conger']
  WHERE latin_name = 'Conger conger'; -- Congre (english_name = 'European conger')

UPDATE species SET
  english_aliases = ARRAY['Ray', 'Roker']
  WHERE latin_name = 'Raja clavata'; -- Raie (english_name = 'Thornback ray')

UPDATE species SET
  english_aliases = ARRAY['Mullet', 'Grey mullet']
  WHERE latin_name = 'Chelon labrosus'; -- Mulet (english_name = 'Thick-lipped grey mullet')

UPDATE species SET
  english_aliases = ARRAY['Horse mackerel', 'Scad', 'Maasbanker']
  WHERE latin_name = 'Trachurus trachurus'; -- Chinchard (english_name = 'Atlantic horse mackerel')

UPDATE species SET
  english_aliases = ARRAY['Wrasse']
  WHERE latin_name = 'Labrus bergylta'; -- Vieille (english_name = 'Ballan wrasse')

UPDATE species SET
  english_aliases = ARRAY['Saddled bream']
  WHERE latin_name = 'Oblada melanura'; -- Oblade (english_name = 'Saddled seabream')

UPDATE species SET
  english_aliases = ARRAY['Black bream']
  WHERE latin_name = 'Spondyliosoma cantharus'; -- Dorade grise (english_name = 'Black seabream')

UPDATE species SET
  english_aliases = ARRAY['Pilchard', 'Sardine']
  WHERE latin_name = 'Sardina pilchardus'; -- Sardine (english_name = 'European pilchard')

UPDATE species SET
  english_aliases = ARRAY['Herring']
  WHERE latin_name = 'Clupea harengus'; -- Hareng (english_name = 'Atlantic herring')

UPDATE species SET
  english_aliases = ARRAY['Smelt']
  WHERE latin_name = 'Osmerus eperlanus'; -- Éperlan (english_name = 'European smelt')

-- ── CARNASSIERS EAU DOUCE EUROPÉENS ──────────────────────────
UPDATE species SET
  french_aliases  = ARRAY['Grand brochet', 'Esox'],
  english_aliases = ARRAY['Pike', 'Jack', 'Luce']
  WHERE id = 48; -- Brochet (english_name = 'Northern pike')

UPDATE species SET
  french_aliases  = ARRAY['Perchette'],
  english_aliases = ARRAY['Perch', 'Redfin perch', 'Eurasian perch']
  WHERE id = 49; -- Perche (english_name = 'European perch')

UPDATE species SET
  french_aliases  = ARRAY['Brochet doré'],
  english_aliases = ARRAY['Pike-perch', 'Pikeperch']
  WHERE id = 50; -- Sandre (english_name = 'Zander')

UPDATE species SET
  french_aliases  = ARRAY['Silure'],
  english_aliases = ARRAY['Catfish', 'European catfish', 'Sheatfish', 'Wels']
  WHERE id = 57; -- Silure glane (english_name = 'Wels catfish')

-- ── SALMONIDÉS EUROPÉENS ──────────────────────────────────────
UPDATE species SET
  french_aliases  = ARRAY['Truite commune', 'Truite de rivière', 'Truite sauvage'],
  english_aliases = ARRAY['River trout', 'Ferox trout']
  WHERE id = 52; -- Truite fario (english_name = 'Brown trout')

UPDATE species SET
  french_aliases  = ARRAY['Arc-en-ciel'],
  english_aliases = ARRAY['Rainbow', 'Steelhead', 'Bow']
  WHERE id = 53; -- Truite arc-en-ciel (english_name = 'Rainbow trout')

UPDATE species SET
  english_aliases = ARRAY['Char', 'Charr']
  WHERE id = 54; -- Omble chevalier (english_name = 'Arctic char')

UPDATE species SET
  english_aliases = ARRAY['Grayling', 'Lady of the stream']
  WHERE id = 55; -- Ombre commun (english_name = 'European grayling')

UPDATE species SET
  french_aliases  = ARRAY['Saumon', 'Saumon de rivière'],
  english_aliases = ARRAY['Salmon', 'King of fish']
  WHERE id = 58; -- Saumon atlantique (english_name = 'Atlantic salmon')

UPDATE species SET
  french_aliases  = ARRAY['Anguille commune', 'Civelle'],
  english_aliases = ARRAY['Eel', 'Glass eel']
  WHERE id = 59; -- Anguille (english_name = 'European eel')

-- ── CYPRINIDÉS EUROPÉENS ──────────────────────────────────────
UPDATE species SET
  french_aliases  = ARRAY['Carpe sauvage', 'Carpe écaille'],
  english_aliases = ARRAY['Carp', 'European carp', 'Wild carp']
  WHERE id = 51; -- Carpe commune (english_name = 'Common carp')

UPDATE species SET
  english_aliases = ARRAY['Plated carp']
  WHERE latin_name = 'Cyprinus carpio' AND french_name = 'Carpe miroir'; -- (english_name = 'Mirror carp')

UPDATE species SET
  english_aliases = ARRAY['Scaleless carp']
  WHERE latin_name = 'Cyprinus carpio' AND french_name = 'Carpe cuir'; -- (english_name = 'Leather carp')

UPDATE species SET
  english_aliases = ARRAY['Doctor fish']
  WHERE id = 60; -- Tanche (english_name = 'Tench')

UPDATE species SET
  english_aliases = ARRAY['Roach']
  WHERE id = 61; -- Gardon (english_name = 'Common roach')

UPDATE species SET
  english_aliases = ARRAY['Bream', 'Bronze bream', 'Carp bream']
  WHERE id = 62; -- Brème (english_name = 'Common bream')

UPDATE species SET
  french_aliases  = ARRAY['Chevaine', 'Chevenne'],
  english_aliases = ARRAY['Chub']
  WHERE id = 63; -- Chevesne (english_name = 'European chub')

UPDATE species SET
  english_aliases = ARRAY['European barbel']
  WHERE latin_name = 'Barbus barbus'; -- Barbeau (english_name = 'Barbel')

UPDATE species SET
  english_aliases = ARRAY['Red-eye']
  WHERE latin_name = 'Scardinius erythrophthalmus'; -- Rotengle (english_name = 'Rudd')

UPDATE species SET
  english_aliases = ARRAY['Bleak']
  WHERE latin_name = 'Alburnus alburnus'; -- Ablette (english_name = 'Common bleak')

UPDATE species SET
  english_aliases = ARRAY['Dace']
  WHERE latin_name = 'Leuciscus leuciscus'; -- Vandoise (english_name = 'Common dace')

UPDATE species SET
  french_aliases  = ARRAY['Ide', 'Gardon rouge'],
  english_aliases = ARRAY['Orfe', 'Golden orfe']
  WHERE latin_name = 'Leuciscus idus'; -- Ide melanote (english_name = 'Ide')

-- ── BLACK-BASS & EAU DOUCE NORD-AMÉRICAINS ───────────────────
UPDATE species SET
  french_aliases  = ARRAY['Achigan', 'Achigan à grande bouche'],
  english_aliases = ARRAY['Bass', 'LMB', 'Largemouth', 'Bucketmouth']
  WHERE latin_name = 'Micropterus salmoides' AND french_name = 'Black-bass';

UPDATE species SET
  french_aliases  = ARRAY['Achigan'],
  english_aliases = ARRAY['Bass', 'LMB', 'Largemouth', 'Bucketmouth']
  WHERE id = 65; -- Largemouth bass

UPDATE species SET
  english_aliases = ARRAY['Smallmouth', 'Bronzeback', 'SMB']
  WHERE id = 66; -- Smallmouth bass

UPDATE species SET
  english_aliases = ARRAY['Yellow pike', 'Yellow pickerel', 'Walleyed pike']
  WHERE id = 68; -- Walleye

UPDATE species SET
  english_aliases = ARRAY['Ringed perch', 'Jack perch']
  WHERE id = 70; -- Perchaude (english_name = 'Yellow perch')

UPDATE species SET
  english_aliases = ARRAY['Striper', 'Rockfish', 'Linesider']
  WHERE id = 81; -- Striped bass

UPDATE species SET
  english_aliases = ARRAY['Redfish', 'Channel bass', 'Puppy drum']
  WHERE id = 82; -- Red drum

UPDATE species SET
  english_aliases = ARRAY['Speck', 'Spotted trout']
  WHERE id = 83; -- Spotted seatrout

-- ── SALMONIDÉS NORD-AMÉRICAINS ────────────────────────────────
UPDATE species SET
  english_aliases = ARRAY['Togue', 'Mackinaw']
  WHERE id = 76; -- Truite de lac (english_name = 'Lake trout')

UPDATE species SET
  english_aliases = ARRAY['Cutthroat', 'Cut']
  WHERE id = 77; -- Truite fardée (english_name = 'Cutthroat trout')

UPDATE species SET
  english_aliases = ARRAY['King salmon', 'Spring salmon', 'Tyee', 'Quinnat']
  WHERE id = 78; -- Saumon chinook (english_name = 'Chinook salmon')

UPDATE species SET
  english_aliases = ARRAY['Silver salmon', 'Silver']
  WHERE id = 79; -- Saumon coho (english_name = 'Coho salmon')

UPDATE species SET
  english_aliases = ARRAY['Red salmon', 'Blueback salmon', 'Sockeye']
  WHERE id = 80; -- Saumon sockeye (english_name = 'Sockeye salmon')

-- ── POISSONS D'AMAZONIE ───────────────────────────────────────
UPDATE species SET
  english_aliases = ARRAY['Pirarucu', 'Paiche']
  WHERE id = 86; -- Arapaima (english_name = 'Arapaima')

UPDATE species SET
  english_aliases = ARRAY['Tucunare', 'Peacock cichlid']
  WHERE id = 87; -- Peacock bass

UPDATE species SET
  english_aliases = ARRAY['Salmon dorado', 'River tiger']
  WHERE id = 89; -- Dorado (english_name = 'Golden dorado')

-- ── POISSONS AFRICAINS ────────────────────────────────────────
UPDATE species SET
  english_aliases = ARRAY['Victoria perch', 'Capitaine']
  WHERE id = 96; -- Perche du Nil (english_name = 'Nile perch')

UPDATE species SET
  english_aliases = ARRAY['Mamba fish']
  WHERE id = 99; -- Tigerfish (english_name = 'African tigerfish')

-- ── POISSONS ASIATIQUES ──────────────────────────────────────
UPDATE species SET
  english_aliases = ARRAY['Asian sea bass', 'Giant sea perch']
  WHERE id = 104; -- Barramundi (english_name = 'Barramundi')

UPDATE species SET
  english_aliases = ARRAY['Himalayan mahseer', 'Golden carp']
  WHERE id = 105; -- Mahseer doré (english_name = 'Golden mahseer')

UPDATE species SET
  english_aliases = ARRAY['White amur', 'Herbivorous carp']
  WHERE id = 106; -- Carpe amour (english_name = 'Grass carp')

-- ── MÉROU BRUN ───────────────────────────────────────────────
UPDATE species SET
  french_aliases  = ARRAY['Badèche', 'Mérou de Méditerranée'],
  english_aliases = ARRAY['Grouper', 'Mediterranean grouper']
  WHERE latin_name = 'Epinephelus marginatus'; -- Mérou brun (english_name = 'Dusky grouper')


-- ================================================================
-- BLOC 22 — ZONES GÉOGRAPHIQUES (colonne regions text[])
-- Codes standardisés lus directement par WorldMiniMap sans parsing regex.
-- ⚠️  UPDATEs par latin_name (fiable) et non par id (id peut varier).
--   Océans / mers    : atl_n, atl_s, med, north_sea, baltic, black,
--                      pac_n, pac_s, indian, arctic, southern
--   Eaux douces      : freshwater_eu, freshwater_na, freshwater_sa,
--                      freshwater_af, freshwater_as
-- ================================================================

-- ── CIRCUMGLOBAUX TROPICAUX ────────────────────────────────────
UPDATE species SET regions = ARRAY['atl_n','atl_s','pac_n','pac_s','indian']
  WHERE latin_name IN (
    'Thunnus albacares',         -- Thon jaune
    'Thunnus obesus',            -- Thon obese
    'Katsuwonus pelamis',        -- Listao
    'Elagatis bipinnulata',      -- Rainbow runner
    'Acanthocybium solandri',    -- Wahoo
    'Coryphaena hippurus',       -- Mahi-mahi
    'Selar crumenophthalmus'     -- Selar
  );

UPDATE species SET regions = ARRAY['atl_n','atl_s','med','pac_n','pac_s','indian']
  WHERE latin_name IN (
    'Thunnus alalunga',          -- Germon
    'Rachycentron canadum',      -- Cobia
    'Xiphias gladius'            -- Espadon
  );

-- ── THONIDÉS ──────────────────────────────────────────────────
UPDATE species SET regions = ARRAY['atl_n','med']
  WHERE latin_name IN ('Thunnus thynnus','Euthynnus alletteratus');
  -- Thon rouge Atlantique, Little tunny

UPDATE species SET regions = ARRAY['pac_n']
  WHERE latin_name = 'Thunnus orientalis';

UPDATE species SET regions = ARRAY['atl_n','med','black']
  WHERE latin_name = 'Sarda sarda';             -- Bonite à dos rayé

-- ── INDO-PACIFIQUE ────────────────────────────────────────────
UPDATE species SET regions = ARRAY['pac_n','pac_s','indian']
  WHERE latin_name IN (
    'Euthynnus affinis',         -- Kawakawa
    'Makaira mazara',            -- Marlin bleu IP
    'Kajikia audax',             -- Marlin rayé
    'Istiompax indica',          -- Marlin noir
    'Scomberomorus commerson',   -- Thazard barré
    'Caranx ignobilis',          -- Carangue GT
    'Caranx melampygus',         -- Carangue bleue
    'Gnathanodon speciosus',     -- Carangue dorée
    'Aprion virescens',          -- Jobfish vert
    'Gymnosarda unicolor',       -- Thon à dents de chien
    'Naso unicornis',            -- Nason licorne
    'Coryphaena equiselis',      -- Dorade coryphène
    'Lates calcarifer'           -- Barramundi / Perche de mer (tous IDs)
  );

-- ── MARLINS & VOILIERS ATLANTIQUE ────────────────────────────
UPDATE species SET regions = ARRAY['atl_n','atl_s']
  WHERE latin_name IN (
    'Makaira nigricans',         -- Marlin bleu Atl.
    'Istiophorus albicans',      -- Voilier
    'Hemiramphus brasiliensis'   -- Balaou
  );

UPDATE species SET regions = ARRAY['atl_n','med','pac_n','pac_s','indian']
  WHERE latin_name = 'Seriola dumerili';         -- Sériole couronnée

UPDATE species SET regions = ARRAY['pac_n','pac_s','atl_s','indian']
  WHERE latin_name = 'Seriola lalandi';          -- Sériole limon

-- ── ATLANTIQUE NORD CÔTIER ────────────────────────────────────
UPDATE species SET regions = ARRAY['atl_n']
  WHERE latin_name IN (
    'Scomberomorus maculatus',   -- Maquereau espagnol
    'Scomberomorus cavalla',     -- Roi des maquereaux
    'Scomberomorus regalis',     -- Cero
    'Epinephelus itajara',       -- Mérou géant
    'Mycteroperca bonaci',       -- Mérou noir
    'Epinephelus striatus',      -- Mérou rayé
    'Lutjanus campechanus',      -- Vivaneau rouge
    'Lutjanus cyanopterus',      -- Vivaneau cubère
    'Lutjanus vivanus',          -- Vivaneau soie
    'Lutjanus analis',           -- Vivaneau lèvrèche
    'Sciaenops ocellatus',       -- Red drum
    'Cynoscion nebulosus'        -- Spotted seatrout
  );

UPDATE species SET regions = ARRAY['atl_n','freshwater_na']
  WHERE latin_name = 'Morone saxatilis';         -- Striped bass

-- ── GADIDÉS & FONDS MARINS EUROPÉENS ─────────────────────────
UPDATE species SET regions = ARRAY['atl_n','north_sea','arctic']
  WHERE latin_name = 'Gadus morhua';

UPDATE species SET regions = ARRAY['atl_n','north_sea']
  WHERE latin_name IN ('Pollachius virens','Pollachius pollachius');

UPDATE species SET regions = ARRAY['atl_n','north_sea','med']
  WHERE latin_name IN ('Merlangius merlangus','Solea solea','Scophthalmus rhombus');

UPDATE species SET regions = ARRAY['atl_n','north_sea','med','baltic']
  WHERE latin_name IN ('Scomber scombrus','Belone belone','Scophthalmus maximus');

-- ── SPARIDÉS & MÉDITERRANÉE ────────────────────────────────────
UPDATE species SET regions = ARRAY['atl_n','med']
  WHERE latin_name IN (
    'Mullus surmuletus',         -- Rouget barbet
    'Diplodus sargus',           -- Sar commun
    'Sparus aurata',             -- Dorade royale
    'Pagrus pagrus',             -- Pagre
    'Lichia amia'                -- Leerfish
  );

-- ── EAUX DOUCES EUROPÉENNES ───────────────────────────────────
UPDATE species SET regions = ARRAY['freshwater_eu']
  WHERE latin_name IN (
    'Esox lucius',               -- Brochet
    'Perca fluviatilis',         -- Perche
    'Sander lucioperca',         -- Sandre
    'Salmo trutta fario',        -- Truite fario
    'Thymallus thymallus',       -- Ombre commun
    'Tinca tinca',               -- Tanche
    'Rutilus rutilus',           -- Gardon
    'Abramis brama',             -- Brème
    'Squalius cephalus',         -- Chevesne
    'Gobio gobio',               -- Goujon
    'Scardinius erythrophthalmus',-- Rotengle
    'Alburnus alburnus',         -- Ablette
    'Barbus barbus',             -- Barbeau
    'Phoxinus phoxinus',         -- Vairon
    'Leuciscus leuciscus'        -- Vandoise
  );

UPDATE species SET regions = ARRAY['freshwater_eu','freshwater_na']
  WHERE latin_name = 'Oncorhynchus mykiss';      -- Truite arc-en-ciel

UPDATE species SET regions = ARRAY['freshwater_eu','arctic']
  WHERE latin_name = 'Salvelinus alpinus';        -- Omble chevalier

UPDATE species SET regions = ARRAY['freshwater_eu','freshwater_na','freshwater_as']
  WHERE latin_name = 'Lota lota';                -- Lotte de rivière (holarctique)

UPDATE species SET regions = ARRAY['freshwater_eu','freshwater_as']
  WHERE latin_name IN (
    'Cyprinus carpio',           -- Carpe commune / miroir / cuir
    'Silurus glanis',            -- Silure glane
    'Leuciscus idus',            -- Ide mélanote
    'Ctenopharyngodon idella'    -- Carpe amour
  );

UPDATE species SET regions = ARRAY['atl_n','north_sea','freshwater_eu']
  WHERE latin_name = 'Salmo salar';              -- Saumon atlantique

UPDATE species SET regions = ARRAY['atl_n','freshwater_eu','med']
  WHERE latin_name = 'Anguilla anguilla';         -- Anguille européenne

-- ── EAUX DOUCES NORD-AMÉRICAINES ─────────────────────────────
UPDATE species SET regions = ARRAY['freshwater_na']
  WHERE latin_name IN (
    'Micropterus dolomieu',      -- Smallmouth bass
    'Micropterus punctulatus',   -- Spotted bass
    'Sander vitreus',            -- Walleye
    'Sander canadensis',         -- Sauger
    'Perca flavescens',          -- Perchaude
    'Pomoxis nigromaculatus',    -- Black crappie
    'Lepomis macrochirus',       -- Bluegill
    'Ictalurus punctatus',       -- Channel catfish
    'Ictalurus furcatus',        -- Blue catfish
    'Pylodictis olivaris',       -- Flathead catfish
    'Salvelinus namaycush',      -- Truite de lac
    'Oncorhynchus clarkii'       -- Truite fardée
  );

-- Largemouth bass (NA) — les entrées qui ne sont pas le Black-bass européen
UPDATE species SET regions = ARRAY['freshwater_na']
  WHERE latin_name = 'Micropterus salmoides'
    AND french_name NOT IN ('Black-bass (achigan)', 'Black-bass');

-- Black-bass européen (introduit EU + origine NA)
UPDATE species SET regions = ARRAY['freshwater_eu','freshwater_na']
  WHERE latin_name = 'Micropterus salmoides'
    AND french_name IN ('Black-bass (achigan)', 'Black-bass');

-- Perche soleil, Poisson-chat américain (introduits EU)
UPDATE species SET regions = ARRAY['freshwater_eu','freshwater_na']
  WHERE latin_name IN ('Lepomis gibbosus','Ameiurus melas');

-- Saumons du Pacifique
UPDATE species SET regions = ARRAY['pac_n','freshwater_na']
  WHERE latin_name IN (
    'Oncorhynchus tshawytscha',  -- Saumon chinook
    'Oncorhynchus kisutch',      -- Saumon coho
    'Oncorhynchus nerka'         -- Saumon sockeye
  );

-- ── AMAZONIE ──────────────────────────────────────────────────
UPDATE species SET regions = ARRAY['freshwater_sa']
  WHERE latin_name IN (
    'Arapaima gigas',            -- Arapaima
    'Cichla ocellaris',          -- Peacock bass
    'Pygocentrus nattereri',     -- Piranha rouge
    'Salminus brasiliensis',     -- Dorado
    'Colossoma bidens',          -- Pacu
    'Colossoma macropomum',      -- Tambaqui
    'Pseudoplatystoma corruscans',-- Surubí
    'Hydrolycus scomberoides',   -- Payara
    'Hoplias malabaricus',       -- Trahira
    'Prochilodus lineatus'       -- Sabalo
  );

-- ── AFRIQUE ───────────────────────────────────────────────────
UPDATE species SET regions = ARRAY['freshwater_af']
  WHERE latin_name IN (
    'Lates niloticus',           -- Perche du Nil
    'Oreochromis niloticus',     -- Tilapia du Nil
    'Oreochromis mossambicus',   -- Tilapia mozambicain
    'Hydrocynus vittatus',       -- Tigerfish
    'Heterobranchus longifilis', -- Vundu catfish
    'Clarias gariepinus'         -- Poisson-chat africain
  );

UPDATE species SET regions = ARRAY['atl_s','indian']
  WHERE latin_name = 'Argyrosomus japonicus';    -- Kob

-- ── ASIE ──────────────────────────────────────────────────────
UPDATE species SET regions = ARRAY['freshwater_as']
  WHERE latin_name IN (
    'Tor putitora',              -- Mahseer doré
    'Channa micropeltes',        -- Giant snakehead
    'Channa striata',            -- Snakehead rayé
    'Catlocarpio siamensis',     -- Siamese giant carp
    'Bagarius yarrelli',         -- Goonch
    'Pangasianodon hypophthalmus',-- Pangasius
    'Hucho taimen',              -- Taimen
    'Tor tambroides'             -- Mahseer rouge
  );

-- ── ESPÈCES PART 3 (latin_name défini dans BLOC 19) ──────────
UPDATE species SET regions = ARRAY['atl_n','north_sea','med']
  WHERE latin_name IN (
    'Dicentrarchus labrax',      -- Bar
    'Chelon labrosus',           -- Mulet
    'Conger conger',             -- Congre
    'Raja clavata',              -- Raie
    'Chelidonichthys cuculus',   -- Grondin rouge
    'Lophius piscatorius',       -- Lotte de mer
    'Labrus bergylta',           -- Vieille
    'Trachurus trachurus'        -- Chinchard
  );

UPDATE species SET regions = ARRAY['atl_n','med']
  WHERE latin_name IN (
    'Spondyliosoma cantharus',   -- Dorade grise
    'Sardina pilchardus',        -- Sardine
    'Oblada melanura',           -- Oblade
    'Sarpa salpa',               -- Saupe
    'Pagellus erythrinus',       -- Pageot
    'Epinephelus marginatus'     -- Mérou brun
  );

UPDATE species SET regions = ARRAY['atl_n','north_sea']
  WHERE latin_name IN ('Eutrigla gurnardus','Trisopterus minutus');

UPDATE species SET regions = ARRAY['atl_n','north_sea','baltic','arctic']
  WHERE latin_name = 'Clupea harengus';

UPDATE species SET regions = ARRAY['atl_n','north_sea','baltic','freshwater_eu']
  WHERE latin_name = 'Osmerus eperlanus';

UPDATE species SET regions = ARRAY['atl_n','med','indian']
  WHERE latin_name = 'Zeus faber';


-- ================================================================
-- VÉRIFICATION FINALE
-- ================================================================
SELECT id, name, english_name,
       french_aliases, english_aliases,
       regions, water_type
FROM species
ORDER BY id;
