-- Add verification code fields to student_parent_links table
ALTER TABLE student_parent_links 
ADD COLUMN IF NOT EXISTS verification_code TEXT,
ADD COLUMN IF NOT EXISTS code_expires_at TIMESTAMP WITH TIME ZONE;

-- Add index for faster code lookups
CREATE INDEX IF NOT EXISTS idx_student_parent_links_verification_code 
ON student_parent_links(verification_code) 
WHERE verification_code IS NOT NULL;