-- Migration: Pending Tribe Invitations
-- Purpose: Track invites sent to non-HelpEm users, auto-add them when they join

-- Pending Tribe Invitations Table
-- Stores invitations sent to email/phone for users who haven't signed up yet
CREATE TABLE IF NOT EXISTS pending_tribe_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tribe_id UUID NOT NULL REFERENCES tribes(id) ON DELETE CASCADE,
  invited_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  -- Contact identifier (email or phone)
  contact_identifier VARCHAR(255) NOT NULL,
  contact_type VARCHAR(20) NOT NULL CHECK (contact_type IN ('email', 'phone')),
  
  -- Display name from contact book
  contact_name VARCHAR(255),
  
  -- Permissions for when they join
  permissions JSONB DEFAULT '{}',
  
  -- Tracking
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMP NOT NULL DEFAULT NOW() + INTERVAL '30 days',
  
  -- Status
  state VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (state IN ('pending', 'accepted', 'expired')),
  accepted_at TIMESTAMP,
  accepted_by UUID REFERENCES users(id) ON DELETE SET NULL,
  
  -- Ensure we don't send duplicate invites
  UNIQUE (tribe_id, contact_identifier)
);

-- Index for checking pending invitations when user signs up
CREATE INDEX IF NOT EXISTS idx_pending_tribe_invitations_contact 
  ON pending_tribe_invitations(contact_identifier, state);

-- Index for tribe's pending invitations
CREATE INDEX IF NOT EXISTS idx_pending_tribe_invitations_tribe 
  ON pending_tribe_invitations(tribe_id, state);

-- Index for expired invitations cleanup
CREATE INDEX IF NOT EXISTS idx_pending_tribe_invitations_expires 
  ON pending_tribe_invitations(expires_at, state);
