-- Create verified_emails table to store successfully verified emails
CREATE TABLE public.verified_emails (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  verified_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.verified_emails ENABLE ROW LEVEL SECURITY;

-- Allow anyone to insert verified emails
CREATE POLICY "Anyone can insert verified emails"
ON public.verified_emails
FOR INSERT
WITH CHECK (true);

-- Allow anyone to view verified emails (for admin page)
CREATE POLICY "Anyone can view verified emails"
ON public.verified_emails
FOR SELECT
USING (true);

-- Create index for faster email lookups
CREATE INDEX idx_verified_emails_email ON public.verified_emails(email);
CREATE INDEX idx_verified_emails_verified_at ON public.verified_emails(verified_at DESC);