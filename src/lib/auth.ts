export interface User {
  name: string;
  email: string;
  password: string;
  monthlyBudget: number;
  currency: '₹' | '$';
}

export interface Transaction {
  id: string;
  amount: number;
  type: 'income' | 'expense';
  category: string;
  categoryEmoji: string;
  categoryColor: string;
  merchant: string;
  note?: string;
  date: string;
  timestamp: number;
}

const REGISTRY_KEY = 'spendwise_registry';
const ACTIVE_USER_KEY = 'spendwise_active_user';

function getRegistry(): Record<string, User> {
  const raw = localStorage.getItem(REGISTRY_KEY);
  return raw ? JSON.parse(raw) : {};
}

function saveRegistry(registry: Record<string, User>) {
  localStorage.setItem(REGISTRY_KEY, JSON.stringify(registry));
}

export function signUp(name: string, email: string, password: string, monthlyBudget: number): { success: boolean; error?: string } {
  const registry = getRegistry();
  if (registry[email]) return { success: false, error: 'Account already exists' };
  registry[email] = { name, email, password, monthlyBudget, currency: '₹' };
  saveRegistry(registry);
  localStorage.setItem(ACTIVE_USER_KEY, email);
  return { success: true };
}

export function signIn(email: string, password: string): { success: boolean; error?: string } {
  const registry = getRegistry();
  const user = registry[email];
  if (!user) return { success: false, error: 'Account not found' };
  if (user.password !== password) return { success: false, error: 'Incorrect password' };
  localStorage.setItem(ACTIVE_USER_KEY, email);
  return { success: true };
}

export function signOut() {
  localStorage.removeItem(ACTIVE_USER_KEY);
}

export function getActiveUser(): User | null {
  const email = localStorage.getItem(ACTIVE_USER_KEY);
  if (!email) return null;
  const registry = getRegistry();
  return registry[email] || null;
}

export function updateBudget(budget: number) {
  const email = localStorage.getItem(ACTIVE_USER_KEY);
  if (!email) return;
  const registry = getRegistry();
  if (registry[email]) {
    registry[email].monthlyBudget = budget;
    saveRegistry(registry);
  }
}

export function getCurrency(): '₹' | '$' {
  const user = getActiveUser();
  return user?.currency || '₹';
}

export function setCurrency(currency: '₹' | '$') {
  const email = localStorage.getItem(ACTIVE_USER_KEY);
  if (!email) return;
  const registry = getRegistry();
  if (registry[email]) {
    registry[email].currency = currency;
    saveRegistry(registry);
  }
}

function txKey(email: string) {
  return `spendwise_tx_${email}`;
}

function deletedTxKey(email: string) {
  return `spendwise_deleted_tx_${email}`;
}

export interface DeletedTransaction extends Transaction {
  deletedAt: number;
}

export function getTransactions(): Transaction[] {
  const email = localStorage.getItem(ACTIVE_USER_KEY);
  if (!email) return [];
  const raw = localStorage.getItem(txKey(email));
  return raw ? JSON.parse(raw) : [];
}

export function getDeletedTransactions(): DeletedTransaction[] {
  const email = localStorage.getItem(ACTIVE_USER_KEY);
  if (!email) return [];
  const raw = localStorage.getItem(deletedTxKey(email));
  if (!raw) return [];
  const all: DeletedTransaction[] = JSON.parse(raw);
  const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
  const valid = all.filter(t => t.deletedAt > thirtyDaysAgo);
  // Auto-purge expired
  if (valid.length !== all.length) {
    localStorage.setItem(deletedTxKey(email), JSON.stringify(valid));
  }
  return valid;
}

export function addTransaction(tx: Omit<Transaction, 'id' | 'timestamp'>): Transaction {
  const email = localStorage.getItem(ACTIVE_USER_KEY)!;
  const transactions = getTransactions();
  const newTx: Transaction = {
    ...tx,
    id: crypto.randomUUID(),
    timestamp: Date.now(),
  };
  transactions.unshift(newTx);
  localStorage.setItem(txKey(email), JSON.stringify(transactions));
  return newTx;
}

export function deleteTransactions(ids: string[]): Transaction[] {
  const email = localStorage.getItem(ACTIVE_USER_KEY)!;
  let transactions = getTransactions();
  const deleted = transactions.filter(t => ids.includes(t.id));
  transactions = transactions.filter(t => !ids.includes(t.id));
  localStorage.setItem(txKey(email), JSON.stringify(transactions));
  // Store in deleted history
  const deletedHistory = getDeletedTransactions();
  const now = Date.now();
  deleted.forEach(t => deletedHistory.unshift({ ...t, deletedAt: now }));
  localStorage.setItem(deletedTxKey(email), JSON.stringify(deletedHistory));
  return deleted;
}

export function restoreTransactions(txs: Transaction[]) {
  const email = localStorage.getItem(ACTIVE_USER_KEY)!;
  const transactions = getTransactions();
  transactions.push(...txs);
  transactions.sort((a, b) => b.timestamp - a.timestamp);
  localStorage.setItem(txKey(email), JSON.stringify(transactions));
  // Remove from deleted history
  const ids = new Set(txs.map(t => t.id));
  const deletedHistory = getDeletedTransactions().filter(t => !ids.has(t.id));
  localStorage.setItem(deletedTxKey(email), JSON.stringify(deletedHistory));
}

export function permanentlyDeleteFromHistory(ids: string[]) {
  const email = localStorage.getItem(ACTIVE_USER_KEY)!;
  const idSet = new Set(ids);
  const deletedHistory = getDeletedTransactions().filter(t => !idSet.has(t.id));
  localStorage.setItem(deletedTxKey(email), JSON.stringify(deletedHistory));
}

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

export const CATEGORIES = DEFAULT_CATEGORIES;

const CUSTOM_CAT_KEY = 'spendwise_custom_categories';

export interface Category {
  name: string;
  emoji: string;
  color: string;
}

export function getCustomCategories(): Category[] {
  const email = localStorage.getItem(ACTIVE_USER_KEY);
  if (!email) return [];
  const raw = localStorage.getItem(`${CUSTOM_CAT_KEY}_${email}`);
  return raw ? JSON.parse(raw) : [];
}

export function addCustomCategory(cat: Category) {
  const email = localStorage.getItem(ACTIVE_USER_KEY)!;
  const cats = getCustomCategories();
  cats.push(cat);
  localStorage.setItem(`${CUSTOM_CAT_KEY}_${email}`, JSON.stringify(cats));
}

export function deleteCustomCategory(name: string) {
  const email = localStorage.getItem(ACTIVE_USER_KEY)!;
  const cats = getCustomCategories().filter(c => c.name !== name);
  localStorage.setItem(`${CUSTOM_CAT_KEY}_${email}`, JSON.stringify(cats));
}

export function getAllCategories(): Category[] {
  return [...DEFAULT_CATEGORIES, ...getCustomCategories()];
}

// Preferences
const PREFS_KEY = 'spendwise_prefs';

export interface UserPrefs {
  showRecentActivity: boolean;
  budgetEnabled: boolean;
}

export function getPrefs(): UserPrefs {
  const email = localStorage.getItem(ACTIVE_USER_KEY);
  if (!email) return { showRecentActivity: true, budgetEnabled: true };
  const raw = localStorage.getItem(`${PREFS_KEY}_${email}`);
  return raw ? JSON.parse(raw) : { showRecentActivity: true, budgetEnabled: true };
}

export function setPrefs(prefs: Partial<UserPrefs>) {
  const email = localStorage.getItem(ACTIVE_USER_KEY);
  if (!email) return;
  const current = getPrefs();
  localStorage.setItem(`${PREFS_KEY}_${email}`, JSON.stringify({ ...current, ...prefs }));
}

export function validatePassword(password: string): { valid: boolean; error?: string } {
  const letters = (password.match(/[a-zA-Z]/g) || []).length;
  const numbers = (password.match(/[0-9]/g) || []).length;
  const specials = (password.match(/[^a-zA-Z0-9]/g) || []).length;
  if (letters < 3) return { valid: false, error: 'Password must contain at least 3 letters' };
  if (numbers < 3) return { valid: false, error: 'Password must contain at least 3 numbers' };
  if (specials < 1) return { valid: false, error: 'Password must contain at least 1 special character' };
  return { valid: true };
}
