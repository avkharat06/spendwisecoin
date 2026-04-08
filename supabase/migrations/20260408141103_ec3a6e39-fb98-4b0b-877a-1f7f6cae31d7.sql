-- Add type column to custom_categories
ALTER TABLE public.custom_categories 
ADD COLUMN IF NOT EXISTS type text NOT NULL DEFAULT 'both';

-- Merge INVESTING/Investing into Investment in transactions
UPDATE public.transactions 
SET category = 'Investment', category_emoji = '📈'
WHERE LOWER(category) IN ('investing', 'investment') AND category != 'Investment';

-- Remove duplicate custom categories for investing/investment
DELETE FROM public.custom_categories 
WHERE LOWER(name) IN ('investing', 'investment');