-- Add display_name column to tribe_members table
ALTER TABLE tribe_members ADD COLUMN IF NOT EXISTS display_name VARCHAR(255);

-- Backfill from pending_tribe_invitations where possible
UPDATE tribe_members tm
SET display_name = pti.contact_name
FROM pending_tribe_invitations pti
JOIN users u ON u.id = tm.user_id
WHERE pti.contact_identifier = u.apple_user_id
  AND pti.contact_name IS NOT NULL
  AND tm.display_name IS NULL;
