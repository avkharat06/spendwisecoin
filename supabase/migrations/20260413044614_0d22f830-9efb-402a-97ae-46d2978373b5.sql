
ALTER TABLE public.profiles
ADD COLUMN app_lock_enabled boolean NOT NULL DEFAULT false,
ADD COLUMN app_lock_type text NOT NULL DEFAULT 'pin',
ADD COLUMN app_lock_pin text,
ADD COLUMN app_lock_password text;
