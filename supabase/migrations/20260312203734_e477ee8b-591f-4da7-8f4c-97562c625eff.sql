ALTER TABLE public.users DROP CONSTRAINT username_alphanumeric;
ALTER TABLE public.users ADD CONSTRAINT username_alphanumeric CHECK (username ~ '^[a-zA-Z0-9 _-]+$');