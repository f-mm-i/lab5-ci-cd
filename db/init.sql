CREATE TABLE IF NOT EXISTS users (
  user_id TEXT PRIMARY KEY,
  role TEXT NOT NULL CHECK (role IN ('user','moderator')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS maps (
  map_id TEXT PRIMARY KEY,
  owner_id TEXT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  visibility TEXT NOT NULL CHECK (visibility IN ('private','public')) DEFAULT 'private',
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS elements (
  element_id TEXT PRIMARY KEY,
  map_id TEXT NOT NULL REFERENCES maps(map_id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  x DOUBLE PRECISION NOT NULL,
  y DOUBLE PRECISION NOT NULL,
  content TEXT NOT NULL DEFAULT '',
  style JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS reports (
  report_id TEXT PRIMARY KEY,
  map_id TEXT NOT NULL REFERENCES maps(map_id) ON DELETE CASCADE,
  author_id TEXT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  reason TEXT NOT NULL,
  comment TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'new',
  created_at TIMESTAMPTZ NOT NULL
);

INSERT INTO users (user_id, role) VALUES
  ('user_777', 'user'),
  ('user_999', 'user'),
  ('moderator_1', 'moderator')
ON CONFLICT (user_id) DO NOTHING;
