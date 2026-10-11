-- Additive candidate migration. Apply only to an explicitly approved database branch.
-- Kept outside Netlify's automatic migrations path until the project DB is inspected.
CREATE TABLE IF NOT EXISTS waambat_admin_accounts (
  id uuid PRIMARY KEY,
  username text UNIQUE NOT NULL CHECK (username ~ '^[a-z0-9-]{3,40}$'),
  password_hash text NOT NULL,
  role text NOT NULL CHECK (role = 'admin'),
  disabled boolean NOT NULL DEFAULT false,
  auth_version integer NOT NULL DEFAULT 1 CHECK (auth_version > 0),
  failures integer NOT NULL DEFAULT 0 CHECK (failures >= 0),
  locked_until timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
