-- Shared admission across server instances, including unknown/locked/disabled usernames.
-- Native additive migration for the user-authorized existing Netlify test site.
CREATE TABLE IF NOT EXISTS waambat_password_admission (
  key text PRIMARY KEY CHECK (key = 'password'),
  window_started timestamptz NOT NULL DEFAULT now(),
  attempts integer NOT NULL DEFAULT 0 CHECK (attempts >= 0 AND attempts <= 12),
  lease_id uuid,
  lease_until timestamptz,
  CHECK ((lease_id IS NULL) = (lease_until IS NULL))
);
INSERT INTO waambat_password_admission (key) VALUES ('password')
ON CONFLICT (key) DO NOTHING;
