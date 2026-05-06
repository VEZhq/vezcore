-- Fix RLS policies for user_permissions table
-- This migration adds explicit INSERT, UPDATE, and DELETE policies

-- Drop the existing generic policy
DROP POLICY IF EXISTS "Admins can manage all permissions" ON user_permissions;

-- Create explicit policies for each operation
CREATE POLICY "Admins can insert permissions"
ON user_permissions FOR INSERT
WITH CHECK (
	EXISTS (
		SELECT 1 FROM profiles
		WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
	)
);

CREATE POLICY "Admins can update permissions"
ON user_permissions FOR UPDATE
USING (
	EXISTS (
		SELECT 1 FROM profiles
		WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
	)
)
WITH CHECK (
	EXISTS (
		SELECT 1 FROM profiles
		WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
	)
);

CREATE POLICY "Admins can delete permissions"
ON user_permissions FOR DELETE
USING (
	EXISTS (
		SELECT 1 FROM profiles
		WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
	)
);

-- Keep the existing SELECT policy for users viewing their own permissions
-- (already exists: "Users can view own permissions")

-- Add index for performance on granted_by lookups
CREATE INDEX IF NOT EXISTS idx_user_permissions_granted_by ON user_permissions(granted_by);

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
	NEW.updated_at = NOW();
	RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_user_permissions_updated_at
	BEFORE UPDATE ON user_permissions
	FOR EACH ROW
	EXECUTE FUNCTION update_updated_at_column();
