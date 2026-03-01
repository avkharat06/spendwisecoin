export interface User {
  name: string;
  email: string;
  password: string;
  monthlyBudget: number;
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
  registry[email] = { name, email, password, monthlyBudget };
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

function txKey(email: string) {
  return `spendwise_tx_${email}`;
}

export function getTransactions(): Transaction[] {
  const email = localStorage.getItem(ACTIVE_USER_KEY);
  if (!email) return [];
  const raw = localStorage.getItem(txKey(email));
  return raw ? JSON.parse(raw) : [];
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
  return deleted;
}

export function restoreTransactions(txs: Transaction[]) {
  const email = localStorage.getItem(ACTIVE_USER_KEY)!;
  const transactions = getTransactions();
  transactions.push(...txs);
  transactions.sort((a, b) => b.timestamp - a.timestamp);
  localStorage.setItem(txKey(email), JSON.stringify(transactions));
}

export const CATEGORIES = [
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
