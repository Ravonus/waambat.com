-- Explicitly requested Netlify test-site login. Runtime rejects test-only accounts
-- outside the two approved Netlify hosts and without ADMIN_TEST_LOGIN=1.
ALTER TABLE waambat_admin_accounts ADD COLUMN IF NOT EXISTS test_only boolean NOT NULL DEFAULT false;
INSERT INTO waambat_admin_accounts (id,username,password_hash,role,test_only)
SELECT 'e9ee9c9b-203e-4e1b-b438-dfe99c86ea1f','admin',
'scrypt-131072-8-1:962305b0efc93e715162990406bcf4870d6dd0bbf64ac53994e502c563bb10dc:cd7703a666d3b450ec7929438811fe06abc2fc1b097039643212564ceb5997ffad5430118414cf2cce661e390aeccd47d7a4f4bf6e18dde3ba47a8dc6430f7b1',
'admin',true WHERE NOT EXISTS (SELECT 1 FROM waambat_admin_accounts)
ON CONFLICT (username) DO NOTHING;
