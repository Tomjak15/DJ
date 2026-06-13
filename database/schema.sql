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

CREATE TABLE IF NOT EXISTS conversations (
  id UUID PRIMARY KEY,
  conversation_type VARCHAR(16) NOT NULL,
  name VARCHAR(80),
  channel_key VARCHAR(160),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE conversations ADD COLUMN IF NOT EXISTS channel_key VARCHAR(160);
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE;

DO $$
BEGIN
  ALTER TABLE conversations DROP CONSTRAINT IF EXISTS conversations_conversation_type_check;
  ALTER TABLE conversations
    ADD CONSTRAINT conversations_conversation_type_check
    CHECK (conversation_type IN ('direct', 'group', 'channel', 'alarm'));
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS conversations_channel_key_unique
  ON conversations (channel_key)
  WHERE channel_key IS NOT NULL;

CREATE TABLE IF NOT EXISTS conversation_members (
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_read_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (conversation_id, user_id)
);

CREATE INDEX IF NOT EXISTS conversation_members_user_idx
  ON conversation_members (user_id);

CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY,
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  body TEXT NOT NULL CHECK (char_length(body) BETWEEN 1 AND 4000),
  reply_to UUID REFERENCES messages(id) ON DELETE SET NULL,
  urgent BOOLEAN NOT NULL DEFAULT FALSE,
  requires_ack BOOLEAN NOT NULL DEFAULT FALSE,
  pinned BOOLEAN NOT NULL DEFAULT FALSE,
  classification VARCHAR(24) NOT NULL DEFAULT 'jawne',
  attachment_name VARCHAR(180),
  attachment_data TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE messages ADD COLUMN IF NOT EXISTS reply_to UUID REFERENCES messages(id) ON DELETE SET NULL;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS urgent BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS requires_ack BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS pinned BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS classification VARCHAR(24) NOT NULL DEFAULT 'jawne';
ALTER TABLE messages ADD COLUMN IF NOT EXISTS attachment_name VARCHAR(180);
ALTER TABLE messages ADD COLUMN IF NOT EXISTS attachment_data TEXT;

CREATE INDEX IF NOT EXISTS messages_conversation_created_idx
  ON messages (conversation_id, created_at DESC);

CREATE TABLE IF NOT EXISTS message_reactions (
  message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reaction VARCHAR(24) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (message_id, user_id)
);

CREATE TABLE IF NOT EXISTS message_acknowledgements (
  message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  acknowledged_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (message_id, user_id)
);

CREATE TABLE IF NOT EXISTS user_presence (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  status VARCHAR(24) NOT NULL DEFAULT 'online',
  active_conversation_id UUID REFERENCES conversations(id) ON DELETE SET NULL,
  typing BOOLEAN NOT NULL DEFAULT FALSE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS user_presence_updated_idx
  ON user_presence (updated_at DESC);

CREATE TABLE IF NOT EXISTS login_devices (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  device_id VARCHAR(160) NOT NULL,
  device_name VARCHAR(160) NOT NULL DEFAULT 'Nieznane urzadzenie',
  ip_address VARCHAR(80),
  user_agent TEXT,
  first_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  login_count INTEGER NOT NULL DEFAULT 1,
  UNIQUE (user_id, device_id)
);

CREATE INDEX IF NOT EXISTS login_devices_user_idx
  ON login_devices (user_id, last_seen_at DESC);

CREATE TABLE IF NOT EXISTS user_sessions (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  device_id VARCHAR(160) NOT NULL,
  device_name VARCHAR(160) NOT NULL DEFAULT 'Nieznane urzadzenie',
  ip_address VARCHAR(80),
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ,
  revoked_by UUID REFERENCES users(id) ON DELETE SET NULL,
  revoke_reason VARCHAR(240)
);

CREATE INDEX IF NOT EXISTS user_sessions_user_idx
  ON user_sessions (user_id, last_seen_at DESC);

CREATE INDEX IF NOT EXISTS user_sessions_active_idx
  ON user_sessions (expires_at DESC)
  WHERE revoked_at IS NULL;

CREATE TABLE IF NOT EXISTS database_backups (
  id UUID PRIMARY KEY,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  backup_type VARCHAR(16) NOT NULL DEFAULT 'manual',
  label VARCHAR(160) NOT NULL,
  snapshot JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS database_backups_created_idx
  ON database_backups (created_at DESC);

-- Migracja historycznych nazw rang do aktualnej hierarchii ABW.
UPDATE users
   SET rank = CASE rank
     WHEN 'Kadet II stopnia' THEN 'Kadet'
     WHEN 'Majster klepka' THEN 'Majster'
     WHEN 'Majster bagieta' THEN 'Majster sztabowy'
     WHEN 'Oficer pułkownik' THEN 'Oficer Półkownik'
     WHEN 'Generał brygad' THEN 'Generał dywizyjny'
     ELSE rank
   END,
       updated_at = NOW()
 WHERE rank IN (
   'Kadet II stopnia',
   'Majster klepka',
   'Majster bagieta',
   'Oficer pułkownik',
   'Generał brygad'
 );

UPDATE sync_records
   SET data = jsonb_set(
     data,
     '{rank}',
     to_jsonb((CASE data->>'rank'
       WHEN 'Kadet II stopnia' THEN 'Kadet'
       WHEN 'Majster klepka' THEN 'Majster'
       WHEN 'Majster bagieta' THEN 'Majster sztabowy'
       WHEN 'Oficer pułkownik' THEN 'Oficer Półkownik'
       WHEN 'Generał brygad' THEN 'Generał dywizyjny'
       ELSE data->>'rank'
     END)::TEXT),
     TRUE
   ),
       updated_at = NOW()
 WHERE record_key = 'profile'
   AND data->>'rank' IN (
     'Kadet II stopnia',
     'Majster klepka',
     'Majster bagieta',
     'Oficer pułkownik',
     'Generał brygad'
   );
