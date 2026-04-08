import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth-context';

// ── Helpers ──
function toTitleCase(str: string): string {
  return str.trim().replace(/\w\S*/g, t => t.charAt(0).toUpperCase() + t.slice(1).toLowerCase());
}

// ── Profile ──
export function useProfile() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['profile', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user!.id)
        .maybeSingle();
      if (error) throw error;
      if (data) return data;

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
      show_running_balance?: boolean;
      avatar_url?: string;
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
      payment_method?: string;
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
      quantity?: number;
      payment_method?: string;
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
export const DEFAULT_EXPENSE_CATEGORIES = [
  { name: 'Food', emoji: '🍔', color: '#F59E0B', type: 'expense' as const },
  { name: 'Transport', emoji: '🚗', color: '#3B82F6', type: 'expense' as const },
  { name: 'Shopping', emoji: '🛍️', color: '#EC4899', type: 'expense' as const },
  { name: 'Bills', emoji: '📱', color: '#EF4444', type: 'expense' as const },
  { name: 'Health', emoji: '💊', color: '#10B981', type: 'expense' as const },
  { name: 'Entertainment', emoji: '🎮', color: '#8B5CF6', type: 'expense' as const },
  { name: 'Investment', emoji: '📈', color: '#F97316', type: 'both' as const },
  { name: 'Other', emoji: '📦', color: '#6B7280', type: 'both' as const },
];

export const DEFAULT_INCOME_CATEGORIES = [
  { name: 'Salary', emoji: '💰', color: '#10B981', type: 'income' as const },
  { name: 'Freelance', emoji: '💻', color: '#06B6D4', type: 'income' as const },
  { name: 'Investment', emoji: '📈', color: '#F97316', type: 'both' as const },
  { name: 'Loan', emoji: '🏦', color: '#3B82F6', type: 'income' as const },
  { name: 'Business', emoji: '💼', color: '#8B5CF6', type: 'income' as const },
  { name: 'Rental', emoji: '🏠', color: '#EC4899', type: 'income' as const },
  { name: 'Gift', emoji: '🎁', color: '#F43F5E', type: 'both' as const },
  { name: 'Refund', emoji: '🔄', color: '#14B8A6', type: 'income' as const },
  { name: 'Other', emoji: '📦', color: '#6B7280', type: 'both' as const },
];

// All unique defaults (deduplicated by name)
export const DEFAULT_CATEGORIES = (() => {
  const seen = new Set<string>();
  const result: typeof DEFAULT_EXPENSE_CATEGORIES = [];
  [...DEFAULT_EXPENSE_CATEGORIES, ...DEFAULT_INCOME_CATEGORIES].forEach(c => {
    if (!seen.has(c.name)) { seen.add(c.name); result.push(c); }
  });
  return result;
})();

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
    ...(custom ?? []).map(c => ({ name: c.name, emoji: c.emoji, color: c.color, type: (c as any).type || 'both' })),
  ];
}

export function useCategoriesByType(type: 'expense' | 'income') {
  const { data: custom } = useCustomCategories();
  const defaults = type === 'expense' ? DEFAULT_EXPENSE_CATEGORIES : DEFAULT_INCOME_CATEGORIES;
  
  // Also include 'both' type defaults from the other list
  const allDefaults = DEFAULT_CATEGORIES.filter(c => c.type === type || c.type === 'both');
  
  // Deduplicate by name
  const seen = new Set<string>();
  const result: { name: string; emoji: string; color: string }[] = [];
  allDefaults.forEach(c => {
    if (!seen.has(c.name)) { seen.add(c.name); result.push(c); }
  });
  
  // Add custom categories matching type
  (custom ?? []).forEach(c => {
    const catType = (c as any).type || 'both';
    if (catType === type || catType === 'both') {
      if (!seen.has(c.name)) { seen.add(c.name); result.push({ name: c.name, emoji: c.emoji, color: c.color }); }
    }
  });
  
  return result;
}

export function useAddCustomCategory() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (cat: { name: string; emoji: string; color: string; type?: string }) => {
      const { error } = await supabase.from('custom_categories').insert({
        name: toTitleCase(cat.name),
        emoji: cat.emoji,
        color: cat.color,
        user_id: user!.id,
        type: cat.type || 'both',
      } as any);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['custom-categories'] }),
  });
}

export function useUpdateCustomCategory() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, oldName, ...updates }: { id: string; oldName?: string; name?: string; emoji?: string; color?: string; type?: string }) => {
      const newName = updates.name ? toTitleCase(updates.name) : undefined;
      
      // Update category
      const { error } = await supabase
        .from('custom_categories')
        .update({ ...updates, name: newName ?? updates.name } as any)
        .eq('id', id)
        .eq('user_id', user!.id);
      if (error) throw error;
      
      // If name changed, update all transactions with old name
      if (oldName && newName && oldName !== newName) {
        const updateData: any = { category: newName };
        if (updates.emoji) updateData.category_emoji = updates.emoji;
        if (updates.color) updateData.category_color = updates.color;
        
        const { error: txError } = await supabase
          .from('transactions')
          .update(updateData)
          .eq('user_id', user!.id)
          .eq('category', oldName);
        if (txError) throw txError;
      } else if (updates.emoji || updates.color) {
        // Even if name didn't change, update emoji/color on transactions
        const catName = newName || oldName;
        if (catName) {
          const updateData: any = {};
          if (updates.emoji) updateData.category_emoji = updates.emoji;
          if (updates.color) updateData.category_color = updates.color;
          
          const { error: txError } = await supabase
            .from('transactions')
            .update(updateData)
            .eq('user_id', user!.id)
            .eq('category', catName);
          if (txError) throw txError;
        }
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['custom-categories'] });
      qc.invalidateQueries({ queryKey: ['transactions'] });
    },
  });
}

export function useIncrementStatementDownloads() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { data: profile } = await supabase
        .from('profiles')
        .select('statement_downloads')
        .eq('user_id', user!.id)
        .single();
      const current = (profile as any)?.statement_downloads ?? 0;
      const { error } = await supabase
        .from('profiles')
        .update({ statement_downloads: current + 1 } as any)
        .eq('user_id', user!.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['profile'] }),
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
