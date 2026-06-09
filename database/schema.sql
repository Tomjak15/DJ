-- ABW Online OS - schemat PostgreSQL.
-- Migracja jest idempotentna: mozna uruchamiac ja przed kazdym wdrozeniem.

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY,
  username VARCHAR(48) NOT NULL,
  full_name VARCHAR(120) NOT NULL,
  password_hash TEXT NOT NULL,
  role VARCHAR(16) NOT NULL DEFAULT 'agent' CHECK (role IN ('agent', 'admin')),
  rank VARCHAR(80) NOT NULL DEFAULT 'Rekrut',
  badge VARCHAR(32) NOT NULL,
  disabled BOOLEAN NOT NULL DEFAULT FALSE,
  failed_attempts INTEGER NOT NULL DEFAULT 0,
  locked_until TIMESTAMPTZ,
  exp INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Nicki sa unikalne bez wzgledu na wielkosc liter.
CREATE UNIQUE INDEX IF NOT EXISTS users_username_lower_unique
  ON users (LOWER(username));

CREATE UNIQUE INDEX IF NOT EXISTS users_badge_lower_unique
  ON users (LOWER(badge));

CREATE TABLE IF NOT EXISTS sync_records (
  id BIGSERIAL PRIMARY KEY,
  scope VARCHAR(16) NOT NULL CHECK (scope IN ('shared', 'private')),
  record_key VARCHAR(80) NOT NULL,
  owner_user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  data JSONB NOT NULL DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT sync_owner_matches_scope CHECK (
    (scope = 'shared' AND owner_user_id IS NULL)
    OR (scope = 'private' AND owner_user_id IS NOT NULL)
  )
);

-- PostgreSQL traktuje NULL-e jako rozne w zwyklym indeksie unikalnym.
-- COALESCE zapewnia dokladnie jeden rekord dla pary scope/key/owner.
CREATE UNIQUE INDEX IF NOT EXISTS sync_records_identity_unique
  ON sync_records (
    scope,
    record_key,
    COALESCE(owner_user_id, '00000000-0000-0000-0000-000000000000'::UUID)
  );

CREATE INDEX IF NOT EXISTS sync_records_updated_at_idx
  ON sync_records (updated_at DESC);

CREATE INDEX IF NOT EXISTS sync_records_owner_idx
  ON sync_records (owner_user_id);
