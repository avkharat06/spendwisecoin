import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth-context';

// ── Profile ──
export function useProfile() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['profile', user?.id],
    queryFn: async () => {
      // Try to get existing profile
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user!.id)
        .maybeSingle();
      if (error) throw error;
      if (data) return data;

      // Profile doesn't exist — create one
      const displayName = user!.user_metadata?.display_name || '';
      const { data: newProfile, error: insertError } = await supabase
        .from('profiles')
        .insert({ user_id: user!.id, display_name: displayName })
        .select()
        .single();
      if (insertError) throw insertError;
      return newProfile;
    },
    enabled: !!user,
  });
}

export function useUpdateProfile() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (updates: {
      display_name?: string;
      currency?: string;
      monthly_budget?: number;
      budget_enabled?: boolean;
      show_recent_activity?: boolean;
    }) => {
      const { error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('user_id', user!.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['profile'] }),
  });
}

// ── Transactions ──
export function useTransactions() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['transactions', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', user!.id)
        .eq('is_deleted', false)
        .order('date', { ascending: false })
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!user,
  });
}

export function useDeletedTransactions() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['deleted-transactions', user?.id],
    queryFn: async () => {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', user!.id)
        .eq('is_deleted', true)
        .gte('deleted_at', thirtyDaysAgo)
        .order('deleted_at', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!user,
  });
}

export function useAddTransaction() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (tx: {
      amount: number;
      type: string;
      category: string;
      category_emoji: string;
      category_color: string;
      merchant: string;
      date: string;
      note?: string;
      quantity?: number;
    }) => {
      const { error } = await supabase.from('transactions').insert({
        ...tx,
        user_id: user!.id,
      });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['transactions'] }),
  });
}

export function useSoftDeleteTransactions() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (ids: string[]) => {
      const { data, error } = await supabase
        .from('transactions')
        .update({ is_deleted: true, deleted_at: new Date().toISOString() })
        .in('id', ids)
        .select();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['transactions'] });
      qc.invalidateQueries({ queryKey: ['deleted-transactions'] });
    },
  });
}

export function useRestoreTransactions() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (ids: string[]) => {
      const { error } = await supabase
        .from('transactions')
        .update({ is_deleted: false, deleted_at: null })
        .in('id', ids);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['transactions'] });
      qc.invalidateQueries({ queryKey: ['deleted-transactions'] });
    },
  });
}

export function useUpdateTransaction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: {
      id: string;
      amount?: number;
      type?: string;
      category?: string;
      category_emoji?: string;
      category_color?: string;
      merchant?: string;
      date?: string;
      note?: string;
    }) => {
      const { error } = await supabase
        .from('transactions')
        .update(updates)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['transactions'] }),
  });
}

export function usePermanentDeleteTransactions() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (ids: string[]) => {
      const { error } = await supabase
        .from('transactions')
        .delete()
        .in('id', ids);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['deleted-transactions'] }),
  });
}

// ── Categories ──
export const DEFAULT_CATEGORIES = [
  { name: 'Food', emoji: '🍔', color: '#F59E0B' },
  { name: 'Transport', emoji: '🚗', color: '#3B82F6' },
  { name: 'Shopping', emoji: '🛍️', color: '#EC4899' },
  { name: 'Bills', emoji: '📱', color: '#EF4444' },
  { name: 'Health', emoji: '💊', color: '#10B981' },
  { name: 'Entertainment', emoji: '🎮', color: '#8B5CF6' },
  { name: 'Salary', emoji: '💰', color: '#10B981' },
  { name: 'Freelance', emoji: '💻', color: '#06B6D4' },
  { name: 'Investment', emoji: '📈', color: '#F97316' },
  { name: 'Other', emoji: '📦', color: '#6B7280' },
];

export function useCustomCategories() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['custom-categories', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('custom_categories')
        .select('*')
        .eq('user_id', user!.id);
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!user,
  });
}

export function useAllCategories() {
  const { data: custom } = useCustomCategories();
  return [
    ...DEFAULT_CATEGORIES,
    ...(custom ?? []).map(c => ({ name: c.name, emoji: c.emoji, color: c.color })),
  ];
}

export function useAddCustomCategory() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (cat: { name: string; emoji: string; color: string }) => {
      const { error } = await supabase.from('custom_categories').insert({
        ...cat,
        user_id: user!.id,
      });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['custom-categories'] }),
  });
}

export function useDeleteCustomCategory() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (name: string) => {
      const { error } = await supabase
        .from('custom_categories')
        .delete()
        .eq('user_id', user!.id)
        .eq('name', name);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['custom-categories'] }),
  });
}
