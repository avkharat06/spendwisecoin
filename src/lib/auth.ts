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

// Seed sample data for testing
export function seedSampleData() {
  const email = localStorage.getItem(ACTIVE_USER_KEY);
  if (!email) return;
  const existing = getTransactions();
  if (existing.length > 0) return; // Don't overwrite

  const now = new Date();
  const today = now.toISOString().split('T')[0];
  const yesterday = new Date(now.getTime() - 86400000).toISOString().split('T')[0];
  const twoDaysAgo = new Date(now.getTime() - 2 * 86400000).toISOString().split('T')[0];
  const threeDaysAgo = new Date(now.getTime() - 3 * 86400000).toISOString().split('T')[0];

  const samples: Transaction[] = [
    { id: crypto.randomUUID(), amount: 350, type: 'expense', category: 'Food', categoryEmoji: '🍔', categoryColor: '#F59E0B', merchant: 'Swiggy Order', date: today, timestamp: now.getTime() - 3600000 },
    { id: crypto.randomUUID(), amount: 45000, type: 'income', category: 'Salary', categoryEmoji: '💰', categoryColor: '#10B981', merchant: 'Monthly Salary', date: today, timestamp: now.getTime() - 7200000 },
    { id: crypto.randomUUID(), amount: 120, type: 'expense', category: 'Transport', categoryEmoji: '🚗', categoryColor: '#3B82F6', merchant: 'Uber Ride', date: today, timestamp: now.getTime() - 10800000 },
    { id: crypto.randomUUID(), amount: 2500, type: 'expense', category: 'Shopping', categoryEmoji: '🛍️', categoryColor: '#EC4899', merchant: 'Amazon', date: yesterday, timestamp: now.getTime() - 86400000 },
    { id: crypto.randomUUID(), amount: 799, type: 'expense', category: 'Entertainment', categoryEmoji: '🎮', categoryColor: '#8B5CF6', merchant: 'Netflix', date: yesterday, timestamp: now.getTime() - 90000000 },
    { id: crypto.randomUUID(), amount: 1500, type: 'expense', category: 'Bills', categoryEmoji: '📱', categoryColor: '#EF4444', merchant: 'Jio Recharge', date: yesterday, timestamp: now.getTime() - 100000000 },
    { id: crypto.randomUUID(), amount: 5000, type: 'income', category: 'Freelance', categoryEmoji: '💻', categoryColor: '#06B6D4', merchant: 'Client Payment', date: twoDaysAgo, timestamp: now.getTime() - 172800000 },
    { id: crypto.randomUUID(), amount: 450, type: 'expense', category: 'Health', categoryEmoji: '💊', categoryColor: '#10B981', merchant: 'Apollo Pharmacy', date: twoDaysAgo, timestamp: now.getTime() - 180000000 },
    { id: crypto.randomUUID(), amount: 200, type: 'expense', category: 'Food', categoryEmoji: '🍔', categoryColor: '#F59E0B', merchant: 'Chai Point', date: threeDaysAgo, timestamp: now.getTime() - 259200000 },
    { id: crypto.randomUUID(), amount: 10000, type: 'income', category: 'Investment', categoryEmoji: '📈', categoryColor: '#F97316', merchant: 'Dividend', date: threeDaysAgo, timestamp: now.getTime() - 270000000 },
    { id: crypto.randomUUID(), amount: 180, type: 'expense', category: 'Transport', categoryEmoji: '🚗', categoryColor: '#3B82F6', merchant: 'Metro Card', date: threeDaysAgo, timestamp: now.getTime() - 280000000 },
    { id: crypto.randomUUID(), amount: 3200, type: 'expense', category: 'Shopping', categoryEmoji: '🛍️', categoryColor: '#EC4899', merchant: 'Myntra', date: threeDaysAgo, timestamp: now.getTime() - 290000000 },
  ];

  localStorage.setItem(txKey(email), JSON.stringify(samples));
}
