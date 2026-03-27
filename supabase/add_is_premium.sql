-- ================================================================
-- MIGRATION : Ajout du statut premium dans la table profiles
-- À exécuter dans : Supabase Dashboard → SQL Editor
-- ================================================================

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS is_premium boolean NOT NULL DEFAULT false;

-- Index pour les requêtes analytiques (ex: compter les users premium)
CREATE INDEX IF NOT EXISTS profiles_is_premium_idx ON profiles (is_premium);

-- Commentaire
COMMENT ON COLUMN profiles.is_premium IS
  'Synchronisé par le webhook RevenueCat. True si l''utilisateur a un entitlement "premium" actif.';
