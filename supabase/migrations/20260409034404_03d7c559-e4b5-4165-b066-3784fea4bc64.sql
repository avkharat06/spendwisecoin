CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON public.transactions (user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_user_date ON public.transactions (user_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_user_payment ON public.transactions (user_id, payment_method);
CREATE INDEX IF NOT EXISTS idx_transactions_user_deleted ON public.transactions (user_id, is_deleted);
CREATE INDEX IF NOT EXISTS idx_custom_categories_user_id ON public.custom_categories (user_id);