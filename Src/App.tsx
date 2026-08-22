/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect } from 'react';
import { 
  PieChart, Pie, Cell, Legend, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, ReferenceLine
} from 'recharts';
import { 
  LayoutDashboard, 
  ReceiptText, 
  TrendingUp, 
  Plus, 
  Filter,
  ArrowUpRight,
  ArrowDownRight,
  DollarSign,
  Tag,
  Calendar,
  X,
  Check,
  ChevronRight,
  Trash2,
  Pencil,
  Lock,
  User,
  LogOut,
  Link as LinkIcon,
  ShieldCheck,
  CreditCard,
  AlertTriangle,
  Lightbulb,
  Zap,
  Clock,
  Mail,
  Twitter,
  Apple
} from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

import { GoogleGenAI, Type } from "@google/genai";

// Utility for Tailwind classes
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Types
type TransactionType = 'INCOME' | 'EXPENSE';

interface Transaction {
  id: number;
  amount: number;
  description: string;
  date: string;
  category: string;
  type: TransactionType;
  accountId: number;
  source?: 'PLAID' | 'MANUAL';
}

interface Account {
  id: number;
  name: string;
  type: 'Bank' | 'Cash' | 'Credit Card' | 'Savings';
  balance: number;
  color: string;
}

interface UserProfile {
  id: string;
  name: string;
  email: string;
  image: string;
}

// Constants
const CURRENCIES = [
  { code: 'USD', symbol: '$', name: 'US Dollar' },
  { code: 'EUR', symbol: '€', name: 'Euro' },
  { code: 'GBP', symbol: '£', name: 'British Pound' },
  { code: 'INR', symbol: '₹', name: 'Indian Rupee' },
  { code: 'JPY', symbol: '¥', name: 'Japanese Yen' },
  { code: 'AED', symbol: 'د.إ', name: 'UAE Dirham' },
];

const INCOME_CATEGORIES = ["Salary", "Freelance", "Dividends", "Gifts"];
const EXPENSE_CATEGORIES = [
  "Food & Dining",
  "Transport",
  "Bills & Recharges",
  "Transfers",
  "Medical",
  "Travel",
  "Repayments",
  "Personal",
  "Services",
  "Insurance",
  "Entertainment",
  "Gaming",
  "Small Shops",
  "Rent",
  "Logistics",
  "Subscription",
  "Investment",
  "Fitness",
  "Pet",
  "Miscellaneous",
  "Shopping",
  "Groceries"
];
const ALL_CATEGORIES = [...INCOME_CATEGORIES, ...EXPENSE_CATEGORIES];

export default function App() {
  const [user, setUser] = useState<UserProfile | null>(() => {
    const saved = localStorage.getItem('ff_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [view, setView] = useState<'dashboard' | 'transactions' | 'analytics' | 'accounts'>('dashboard');
  const [currency, setCurrency] = useState(() => {
    const saved = localStorage.getItem('ff_currency');
    return saved ? JSON.parse(saved) : CURRENCIES[0];
  });
  const [transactions, setTransactions] = useState<Transaction[]>(() => {
    const saved = localStorage.getItem('ff_transactions');
    return saved ? JSON.parse(saved) : [];
  });
  const [accounts, setAccounts] = useState<Account[]>(() => {
    const saved = localStorage.getItem('ff_accounts');
    return saved ? JSON.parse(saved) : [];
  });
  const [isAdding, setIsAdding] = useState(false);

  // Persistence Effects
  useEffect(() => {
    localStorage.setItem('ff_user', JSON.stringify(user));
  }, [user]);

  useEffect(() => {
    localStorage.setItem('ff_currency', JSON.stringify(currency));
  }, [currency]);

  useEffect(() => {
    localStorage.setItem('ff_transactions', JSON.stringify(transactions));
  }, [transactions]);

  useEffect(() => {
    localStorage.setItem('ff_accounts', JSON.stringify(accounts));
  }, [accounts]);

  // Derived Account Balances
  const accountsWithBalances = useMemo(() => {
    return accounts.map(acc => {
      const accTransactions = transactions.filter(t => t.accountId === acc.id);
      const balance = accTransactions.reduce((sum, t) => {
        return t.type === 'INCOME' ? sum + t.amount : sum - t.amount;
      }, acc.balance);
      return { ...acc, currentBalance: balance };
    });
  }, [accounts, transactions]);

  // Derived Cash Flow Data for Graphs
  const cashFlowData = useMemo(() => {
    const dataMap: Record<string, { date: string; income: number; expense: number }> = {};
    
    // Sort transactions by date
    const sorted = [...transactions].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    
    sorted.forEach(t => {
      const date = t.date.substring(5); // MM-DD
      if (!dataMap[date]) {
        dataMap[date] = { date, income: 0, expense: 0 };
      }
      if (t.type === 'INCOME') {
        dataMap[date].income += t.amount;
      } else {
        dataMap[date].expense += t.amount;
      }
    });
    
    const result = Object.values(dataMap);
    // If empty, provide a placeholder for the graph to look okay
    if (result.length === 0) {
      return [{ date: 'No Data', income: 0, expense: 0 }];
    }
    return result;
  }, [transactions]);

  // Stats
  const stats = useMemo(() => {
    const totalBalance = accountsWithBalances.reduce((acc, curr) => acc + curr.currentBalance, 0);
    const monthlyIncome = transactions.filter(t => t.type === 'INCOME').reduce((acc, curr) => acc + curr.amount, 0);
    const monthlyExpense = transactions.filter(t => t.type === 'EXPENSE').reduce((acc, curr) => acc + curr.amount, 0);
    return { totalBalance, monthlyIncome, monthlyExpense };
  }, [transactions, accountsWithBalances]);

  const addTransaction = (newTx: Omit<Transaction, 'id'>) => {
    const tx = { ...newTx, id: Date.now(), source: 'MANUAL' as const };
    setTransactions([tx, ...transactions]);
    setIsAdding(false);
  };

  const updateTransaction = (updatedTx: Transaction) => {
    setTransactions(transactions.map(t => t.id === updatedTx.id ? updatedTx : t));
  };

  const deleteTransaction = (id: number) => {
    setTransactions(transactions.filter(t => t.id !== id));
  };

  const addAccount = (newAcc: Omit<Account, 'id'>) => {
    const acc = { ...newAcc, id: Date.now() };
    setAccounts([...accounts, acc]);
  };

  const updateAccount = (updatedAcc: Account) => {
    setAccounts(accounts.map(acc => acc.id === updatedAcc.id ? updatedAcc : acc));
  };

  const deleteAccount = (id: number) => {
    if (accounts.length <= 1) {
      alert("You must have at least one account.");
      return;
    }
    if (confirm("Are you sure? This will also delete all transactions associated with this account.")) {
      setAccounts(accounts.filter(acc => acc.id !== id));
      setTransactions(transactions.filter(t => t.accountId !== id));
    }
  };

  const handleLogin = (userData?: any) => {
    const newUser = userData || {
      id: 'user_123',
      name: 'Anshul',
      email: 'anshul03007@gmail.com',
      image: 'https://picsum.photos/seed/anshul/100/100'
    };
    setUser(newUser);
    // Add default accounts only if none exist
    if (accounts.length === 0) {
      setAccounts([
        { id: 1, name: 'Main Bank', type: 'Bank', balance: 0, color: '#3B82F6' },
        { id: 2, name: 'Cash', type: 'Cash', balance: 0, color: '#10B981' }
      ]);
    }
  };

  if (!user) {
    return <LoginView onLogin={handleLogin} />;
  }

  return (
    <div className="min-h-screen bg-[#F8F9FA] text-[#1A1A1A] font-sans selection:bg-[#1A1A1A] selection:text-white">
      {/* Sidebar */}
      <nav className="fixed left-0 top-0 h-full w-64 border-r border-gray-200 bg-white p-6 hidden md:block shadow-sm">
        <div className="mb-12 flex items-center gap-2">
          <div className="h-8 w-8 bg-blue-600 rounded-lg flex items-center justify-center shadow-lg shadow-blue-200">
            <DollarSign className="text-white h-5 w-5" />
          </div>
          <h1 className="text-xl font-bold tracking-tight text-gray-900">FinanceFlow</h1>
        </div>
        
        <div className="space-y-1">
          <button onClick={() => setView('dashboard')} className={cn("w-full flex items-center gap-3 px-4 py-3 text-sm rounded-xl transition-all", view === 'dashboard' ? "bg-blue-50 text-blue-700 font-bold" : "text-gray-500 hover:bg-gray-50")}>
            <LayoutDashboard size={18} />
            <span className="tracking-tight">Dashboard</span>
          </button>
          <button onClick={() => setView('transactions')} className={cn("w-full flex items-center gap-3 px-4 py-3 text-sm rounded-xl transition-all", view === 'transactions' ? "bg-blue-50 text-blue-700 font-bold" : "text-gray-500 hover:bg-gray-50")}>
            <ReceiptText size={18} />
            <span className="tracking-tight">Transactions</span>
          </button>
          <button onClick={() => setView('analytics')} className={cn("w-full flex items-center gap-3 px-4 py-3 text-sm rounded-xl transition-all", view === 'analytics' ? "bg-blue-50 text-blue-700 font-bold" : "text-gray-500 hover:bg-gray-50")}>
            <TrendingUp size={18} />
            <span className="tracking-tight">Analytics</span>
          </button>
          <button onClick={() => setView('accounts')} className={cn("w-full flex items-center gap-3 px-4 py-3 text-sm rounded-xl transition-all", view === 'accounts' ? "bg-blue-50 text-blue-700 font-bold" : "text-gray-500 hover:bg-gray-50")}>
            <CreditCard size={18} />
            <span className="tracking-tight">Accounts</span>
          </button>
        </div>

        <div className="mt-8 px-4">
          <label className="block text-[10px] uppercase font-bold text-gray-400 tracking-widest mb-3">Currency</label>
          <select 
            className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-xs font-medium focus:ring-2 focus:ring-blue-500 outline-none cursor-pointer"
            value={currency.code}
            onChange={(e) => setCurrency(CURRENCIES.find(c => c.code === e.target.value) || CURRENCIES[0])}
          >
            {CURRENCIES.map(c => (
              <option key={c.code} value={c.code}>{c.symbol} {c.code}</option>
            ))}
          </select>
        </div>

        <div className="absolute bottom-8 left-6 right-6">
          <div className="flex items-center gap-3 p-3 rounded-xl border border-gray-100 bg-gray-50 mb-4">
            <img src={user.image} alt={user.name} className="h-9 w-9 rounded-full border-2 border-white shadow-sm" referrerPolicy="no-referrer" />
            <div className="overflow-hidden">
              <p className="text-xs font-bold text-gray-900 truncate">{user.name}</p>
              <p className="text-[10px] text-gray-500 truncate">{user.email}</p>
            </div>
          </div>
          <button 
            onClick={() => setUser(null)}
            className="w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
          >
            <LogOut size={18} />
            <span className="font-medium">Sign Out</span>
          </button>
        </div>
      </nav>

      {/* Main Content */}
      <main className="md:ml-64 p-8">
        {view === 'dashboard' ? (
          <DashboardView 
            stats={stats} 
            transactions={transactions} 
            cashFlowData={cashFlowData}
            accounts={accountsWithBalances}
            onAddClick={() => { setView('transactions'); setIsAdding(true); }} 
            currency={currency}
          />
        ) : view === 'transactions' ? (
          <TransactionsView 
            transactions={transactions} 
            accounts={accounts}
            isAdding={isAdding} 
            setIsAdding={setIsAdding} 
            onAdd={addTransaction}
            onUpdate={updateTransaction}
            onDelete={deleteTransaction}
            currency={currency}
          />
        ) : view === 'accounts' ? (
          <AccountsView 
            accounts={accountsWithBalances} 
            onAddAccount={addAccount}
            onUpdateAccount={updateAccount}
            onDeleteAccount={deleteAccount}
            currency={currency}
          />
        ) : (
          <AnalyticsView transactions={transactions} stats={stats} currency={currency} />
        )}
      </main>
    </div>
  );
}

// --- Views ---

function LoginView({ onLogin }: { onLogin: (userData?: any) => void }) {
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onLogin({
      name: name || 'New User',
      email: email || 'user@example.com',
      image: `https://picsum.photos/seed/${email || 'user'}/100/100`
    });
  };

  return (
    <div className="min-h-screen bg-[#F8F9FA] flex items-center justify-center p-4 selection:bg-blue-600 selection:text-white">
      <div className="w-full max-w-md">
        <div className="mb-10 flex flex-col items-center gap-4">
          <div className="h-16 w-16 bg-blue-600 rounded-2xl flex items-center justify-center shadow-xl shadow-blue-100">
            <DollarSign className="text-white h-10 w-10" />
          </div>
          <h1 className="text-4xl font-black tracking-tight text-gray-900">FinanceFlow</h1>
          <p className="text-xs font-bold uppercase tracking-widest text-blue-600">Secure Personal Ledger</p>
        </div>

        <div className="bg-white p-10 rounded-[40px] shadow-2xl shadow-gray-200 border border-gray-100">
          <div className="flex gap-8 mb-8 border-b border-gray-100">
            <button 
              onClick={() => setMode('login')}
              className={cn(
                "pb-4 text-sm font-bold uppercase tracking-widest transition-all relative",
                mode === 'login' ? "text-blue-600" : "text-gray-400 hover:text-gray-600"
              )}
            >
              Login
              {mode === 'login' && <div className="absolute bottom-0 left-0 right-0 h-1 bg-blue-600 rounded-full" />}
            </button>
            <button 
              onClick={() => setMode('signup')}
              className={cn(
                "pb-4 text-sm font-bold uppercase tracking-widest transition-all relative",
                mode === 'signup' ? "text-blue-600" : "text-gray-400 hover:text-gray-600"
              )}
            >
              Sign Up
              {mode === 'signup' && <div className="absolute bottom-0 left-0 right-0 h-1 bg-blue-600 rounded-full" />}
            </button>
          </div>

          <h2 className="text-2xl font-bold text-gray-900 mb-8">
            {mode === 'login' ? 'Welcome Back' : 'Create Account'}
          </h2>
          
          <form onSubmit={handleSubmit} className="space-y-4 mb-8">
            {mode === 'signup' && (
              <div className="relative">
                <User size={18} className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400" />
                <input 
                  required
                  type="text" 
                  placeholder="Full Name"
                  className="w-full bg-gray-50 border border-gray-200 rounded-2xl pl-12 pr-6 py-4 text-sm font-bold text-gray-900 focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none transition-all"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
            )}
            <div className="relative">
              <Mail size={18} className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input 
                required
                type="email" 
                placeholder="Email Address"
                className="w-full bg-gray-50 border border-gray-200 rounded-2xl pl-12 pr-6 py-4 text-sm font-bold text-gray-900 focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none transition-all"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="relative">
              <Lock size={18} className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input 
                required
                type="password" 
                placeholder="Password"
                className="w-full bg-gray-50 border border-gray-200 rounded-2xl pl-12 pr-6 py-4 text-sm font-bold text-gray-900 focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none transition-all"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <button 
              type="submit"
              className="w-full py-4 bg-blue-600 text-white rounded-2xl text-sm font-bold uppercase tracking-widest hover:bg-blue-700 transition-all shadow-lg shadow-blue-100"
            >
              {mode === 'login' ? 'Sign In' : 'Get Started'}
            </button>
          </form>

          <div className="relative mb-8">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-100"></div></div>
            <div className="relative flex justify-center text-[10px] uppercase font-bold tracking-widest text-gray-400 bg-white px-4">Or continue with</div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <button 
              onClick={() => onLogin()}
              className="flex items-center justify-center gap-3 py-3 bg-white border border-gray-100 rounded-xl hover:border-blue-600 hover:bg-blue-50 transition-all group"
            >
              <img src="https://www.google.com/favicon.ico" alt="Google" className="h-4 w-4 grayscale group-hover:grayscale-0 transition-all" />
              <span className="text-[10px] font-bold text-gray-500 group-hover:text-blue-600 uppercase tracking-widest">Google</span>
            </button>
            <button 
              onClick={() => onLogin()}
              className="flex items-center justify-center gap-3 py-3 bg-white border border-gray-100 rounded-xl hover:border-blue-600 hover:bg-blue-50 transition-all group"
            >
              <img src="https://github.com/favicon.ico" alt="GitHub" className="h-4 w-4 grayscale group-hover:grayscale-0 transition-all" />
              <span className="text-[10px] font-bold text-gray-500 group-hover:text-blue-600 uppercase tracking-widest">GitHub</span>
            </button>
            <button 
              onClick={() => onLogin()}
              className="flex items-center justify-center gap-3 py-3 bg-white border border-gray-100 rounded-xl hover:border-blue-600 hover:bg-blue-50 transition-all group"
            >
              <Apple size={16} className="text-gray-400 group-hover:text-black transition-colors" />
              <span className="text-[10px] font-bold text-gray-500 group-hover:text-gray-900 uppercase tracking-widest">Apple</span>
            </button>
            <button 
              onClick={() => onLogin()}
              className="flex items-center justify-center gap-3 py-3 bg-white border border-gray-100 rounded-xl hover:border-blue-600 hover:bg-blue-50 transition-all group"
            >
              <Twitter size={16} className="text-gray-400 group-hover:text-blue-400 transition-colors" />
              <span className="text-[10px] font-bold text-gray-500 group-hover:text-blue-400 uppercase tracking-widest">Twitter</span>
            </button>
          </div>

          <div className="mt-10 pt-8 border-t border-gray-100">
            <div className="flex items-center justify-center gap-2 text-[10px] font-bold uppercase tracking-widest text-gray-400">
              <ShieldCheck size={14} className="text-emerald-500" />
              <span>Bank-level 256-bit encryption</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function AnalyticsView({ transactions, stats, currency }: any) {
  // Dynamic Advice Alerts based on data
  const alerts = useMemo(() => {
    const list = [];
    if (stats.monthlyExpense > stats.monthlyIncome && stats.monthlyIncome > 0) {
      list.push({ 
        id: 1, 
        type: 'critical', 
        title: 'Negative Cash Flow', 
        message: `Your monthly expenses (${currency.symbol}${stats.monthlyExpense}) exceed your income (${currency.symbol}${stats.monthlyIncome}). Consider reducing non-essential spending.`, 
        icon: <Zap className="text-red-500" /> 
      });
    }
    
    // Check for high spending categories
    const categories: Record<string, number> = {};
    transactions.filter((t: any) => t.type === 'EXPENSE').forEach((t: any) => {
      categories[t.category] = (categories[t.category] || 0) + t.amount;
    });
    
    const topCategory = Object.entries(categories).sort((a, b) => b[1] - a[1])[0];
    if (topCategory) {
      list.push({ 
        id: 2, 
        type: 'warning', 
        title: 'Top Spending Category', 
        message: `You've spent ${currency.symbol}${topCategory[1]} on ${topCategory[0]} this period. This is your highest expense area.`, 
        icon: <AlertTriangle className="text-amber-500" /> 
      });
    }

    if (list.length === 0) {
      list.push({ 
        id: 3, 
        type: 'advice', 
        title: 'System Ready', 
        message: "Start adding more transactions to receive personalized financial insights and smart alerts.", 
        icon: <Lightbulb className="text-blue-500" /> 
      });
    }
    
    return list;
  }, [transactions, stats, currency]);

  // Budget vs Actual Data (using some default budgets for demo)
  const flaggedData = useMemo(() => {
    const categories: Record<string, number> = {};
    transactions.filter((t: any) => t.type === 'EXPENSE').forEach((t: any) => {
      categories[t.category] = (categories[t.category] || 0) + t.amount;
    });

    const defaultBudgets: Record<string, number> = {
      'Rent': 1200,
      'Groceries': 400,
      'Food & Dining': 300,
      'Transport': 150,
      'Entertainment': 100
    };

    return Object.keys(categories).slice(0, 5).map(cat => ({
      category: cat,
      budget: defaultBudgets[cat] || 200,
      actual: categories[cat]
    }));
  }, [transactions]);

  // Burn Rate Projection based on actual data
  const burnRateData = useMemo(() => {
    if (transactions.length === 0) return [];
    
    const monthlySpend = stats.monthlyExpense || 1; // avoid div by zero
    const data = [];
    const months = ['Current', 'Month 1', 'Month 2', 'Month 3', 'Month 4'];
    
    let currentBalance = stats.totalBalance;
    for (let i = 0; i < 5; i++) {
      data.push({ month: months[i], balance: Math.max(0, currentBalance) });
      currentBalance -= monthlySpend;
    }
    return data;
  }, [transactions, stats]);

  const runway = useMemo(() => {
    if (stats.monthlyExpense === 0) return '∞';
    const months = stats.totalBalance / stats.monthlyExpense;
    return months > 0 ? months.toFixed(1) : '0.0';
  }, [stats]);

  return (
    <div className="animate-in fade-in duration-500">
      <header className="mb-12">
        <p className="text-xs uppercase tracking-widest text-blue-600 font-bold mb-1">Intelligence Engine</p>
        <h2 className="text-4xl font-black tracking-tight text-gray-900">Smart Analytics</h2>
      </header>

      {transactions.length === 0 ? (
        <div className="py-24 text-center border border-dashed border-gray-200 rounded-[40px] bg-white">
          <div className="h-20 w-20 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-6">
            <TrendingUp size={40} className="text-blue-200" />
          </div>
          <h4 className="text-xl font-bold text-gray-900 mb-2">Insufficient Data for Analytics</h4>
          <p className="text-gray-400 text-sm max-w-xs mx-auto">Add at least one transaction to unlock smart insights and projections.</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">
            {/* Advice Alerts */}
            <div className="lg:col-span-1 space-y-4">
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">Advice & Alerts</h3>
              {alerts.map(alert => (
                <div key={alert.id} className="border border-gray-100 bg-white p-6 rounded-3xl shadow-sm relative group overflow-hidden">
                  <div className="flex gap-4 items-start relative z-10">
                    <div className="mt-1">{alert.icon}</div>
                    <div>
                      <h4 className="text-xs font-bold uppercase tracking-widest text-gray-900 mb-1">{alert.title}</h4>
                      <p className="text-xs text-gray-500 leading-relaxed font-medium">{alert.message}</p>
                    </div>
                  </div>
                  <div className={cn(
                    "absolute left-0 top-0 bottom-0 w-1.5 transition-all group-hover:w-2.5",
                    alert.type === 'warning' ? "bg-amber-500" : alert.type === 'critical' ? "bg-red-500" : "bg-blue-500"
                  )} />
                </div>
              ))}
            </div>

            {/* Flagged Expenses Chart */}
            <div className="lg:col-span-2 border border-gray-100 p-8 bg-white rounded-3xl shadow-sm">
              <div className="flex justify-between items-center mb-8">
                <h3 className="text-lg font-bold text-gray-900">Budget vs. Actual</h3>
                <div className="flex gap-4 text-[10px] font-bold uppercase tracking-widest">
                  <div className="flex items-center gap-1.5"><div className="h-2.5 w-2.5 bg-gray-100 rounded-full" /> Budget</div>
                  <div className="flex items-center gap-1.5"><div className="h-2.5 w-2.5 bg-blue-500 rounded-full" /> Actual</div>
                </div>
              </div>
              <div className="h-[350px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={flaggedData} layout="vertical" margin={{ left: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#E5E7EB" />
                    <XAxis type="number" hide />
                    <YAxis dataKey="category" type="category" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#6B7280', fontWeight: 600 }} />
                    <Tooltip 
                      cursor={{ fill: '#F3F4F6', radius: 8 }}
                      contentStyle={{ backgroundColor: '#FFF', borderRadius: '16px', border: '1px solid #F3F4F6', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', fontSize: '12px', fontWeight: 'bold' }} 
                      formatter={(value) => [`${currency.symbol}${value}`, '']}
                    />
                    <Bar dataKey="budget" fill="#F3F4F6" radius={[0, 8, 8, 0]} barSize={24} />
                    <Bar dataKey="actual" radius={[0, 8, 8, 0]} barSize={24}>
                      {flaggedData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.actual > entry.budget ? '#ef4444' : '#3B82F6'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Burn Rate Projection */}
          <div className="border border-gray-100 p-8 bg-white rounded-3xl shadow-sm">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
              <div>
                <h3 className="text-lg font-bold text-gray-900 mb-1">Burn Rate Projection</h3>
                <p className="text-sm text-gray-500 font-medium">Estimated runway based on average monthly spend of {currency.symbol}{stats.monthlyExpense.toLocaleString()}</p>
              </div>
              <div className="px-8 py-5 bg-blue-600 text-white rounded-2xl shadow-lg shadow-blue-100">
                <p className="text-[10px] uppercase font-bold tracking-widest opacity-80 mb-1">Estimated Runway</p>
                <p className="text-3xl font-black tracking-tight">{runway} Months</p>
              </div>
            </div>
            
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={burnRateData}>
                  <defs>
                    <linearGradient id="colorBalanceBurn" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                  <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#6B7280', fontWeight: 500 }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#6B7280', fontWeight: 500 }} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#FFF', borderRadius: '16px', border: '1px solid #F3F4F6', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', fontSize: '12px', fontWeight: 'bold' }} 
                    formatter={(value) => [`${currency.symbol}${value}`, '']} 
                  />
                  <Area type="monotone" dataKey="balance" stroke="#3B82F6" fillOpacity={1} fill="url(#colorBalanceBurn)" strokeWidth={3} />
                  <ReferenceLine y={0} stroke="#ef4444" strokeDasharray="3 3" label={{ position: 'right', value: 'ZERO', fill: '#ef4444', fontSize: 11, fontWeight: 'bold' }} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function DashboardView({ stats, transactions, cashFlowData, accounts, onAddClick, currency }: any) {
  const expenseData = useMemo(() => {
    const categories: Record<string, number> = {};
    transactions.filter((t: any) => t.type === 'EXPENSE').forEach((t: any) => {
      categories[t.category] = (categories[t.category] || 0) + t.amount;
    });
    const colors = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4'];
    return Object.entries(categories).map(([name, value], i) => ({
      name, value, color: colors[i % colors.length]
    }));
  }, [transactions]);

  const recentTransactions = useMemo(() => {
    return transactions.slice(0, 5);
  }, [transactions]);

  return (
    <div className="animate-in fade-in duration-500">
      <header className="mb-12 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-widest text-blue-600 font-bold mb-1">Financial Overview</p>
          <h2 className="text-4xl font-black tracking-tight text-gray-900">Dashboard</h2>
        </div>
        <div className="flex gap-4">
          <button 
            onClick={onAddClick}
            className="bg-blue-600 text-white px-8 py-4 rounded-2xl flex items-center gap-2 hover:bg-blue-700 transition-all shadow-lg shadow-blue-200 uppercase text-xs font-bold tracking-widest"
          >
            <Plus size={18} />
            Add Transaction
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
        <StatCard label="Total Balance" value={`${currency.symbol}${stats.totalBalance.toLocaleString()}`} icon={<DollarSign className="text-blue-600" />} />
        <StatCard label="Monthly Income" value={`${currency.symbol}${stats.monthlyIncome.toLocaleString()}`} icon={<ArrowUpRight className="text-emerald-600" />} />
        <StatCard label="Monthly Expenses" value={`${currency.symbol}${stats.monthlyExpense.toLocaleString()}`} icon={<ArrowDownRight className="text-red-600" />} />
      </div>

      {/* Accounts Quick View */}
      <div className="mb-12">
        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-6">Your Accounts</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {accounts.map((acc: any) => (
            <div key={acc.id} className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm hover:shadow-md transition-all group">
              <div className="flex justify-between items-start mb-4">
                <div className="p-2 rounded-xl bg-gray-50 group-hover:bg-blue-50 transition-colors">
                  <CreditCard size={18} style={{ color: acc.color }} />
                </div>
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{acc.type}</span>
              </div>
              <p className="text-sm font-bold text-gray-900 mb-1">{acc.name}</p>
              <p className="text-xl font-black tracking-tight text-gray-900">{currency.symbol}{acc.currentBalance.toLocaleString()}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
        <div className="border border-gray-100 p-8 bg-white rounded-3xl shadow-sm">
          <h3 className="text-lg font-bold text-gray-900 mb-6">Cash Flow</h3>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={cashFlowData}>
                <defs>
                  <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10B981" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorExpense" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#EF4444" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#EF4444" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#6B7280', fontWeight: 500 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#6B7280', fontWeight: 500 }} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#FFF', borderRadius: '16px', border: '1px solid #F3F4F6', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', fontSize: '12px', fontWeight: 'bold' }} 
                  formatter={(value) => [`${currency.symbol}${value}`, '']} 
                />
                <Area type="monotone" dataKey="income" stroke="#10B981" fillOpacity={1} fill="url(#colorIncome)" strokeWidth={3} />
                <Area type="monotone" dataKey="expense" stroke="#EF4444" fillOpacity={1} fill="url(#colorExpense)" strokeWidth={3} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="border border-gray-100 p-8 bg-white rounded-3xl shadow-sm">
          <h3 className="text-lg font-bold text-gray-900 mb-6">Expense Distribution</h3>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={expenseData} cx="50%" cy="50%" innerRadius={70} outerRadius={100} paddingAngle={8} dataKey="value">
                  {expenseData.map((entry: any, index: number) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                </Pie>
                <Tooltip 
                  contentStyle={{ backgroundColor: '#FFF', borderRadius: '16px', border: '1px solid #F3F4F6', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', fontSize: '12px', fontWeight: 'bold' }} 
                  formatter={(value) => [`${currency.symbol}${value}`, '']} 
                />
                <Legend verticalAlign="bottom" height={36} iconType="circle" formatter={(value) => <span className="text-xs font-bold text-gray-600">{value}</span>} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Recent Transactions Preview */}
      <div className="border border-gray-100 bg-white rounded-3xl shadow-sm overflow-hidden">
        <div className="p-8 border-b border-gray-100 flex items-center justify-between">
          <h3 className="text-lg font-bold text-gray-900">Recent Transactions</h3>
          <button onClick={() => onAddClick()} className="text-blue-600 text-sm font-bold hover:underline">View All</button>
        </div>
        <div className="p-4">
          {recentTransactions.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-gray-400 text-sm">No transactions yet. Add your first one!</p>
            </div>
          ) : (
            <div className="space-y-2">
              {recentTransactions.map((t: any) => (
                <div key={t.id} className="flex items-center justify-between p-4 hover:bg-gray-50 rounded-2xl transition-colors">
                  <div className="flex items-center gap-4">
                    <div className={cn(
                      "h-10 w-10 rounded-xl flex items-center justify-center",
                      t.type === 'INCOME' ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-600"
                    )}>
                      {t.type === 'INCOME' ? <ArrowUpRight size={20} /> : <ArrowDownRight size={20} />}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-gray-900">{t.description}</p>
                      <p className="text-[10px] text-gray-500 font-medium uppercase tracking-wider">{t.category} • {t.date}</p>
                    </div>
                  </div>
                  <p className={cn(
                    "text-sm font-bold",
                    t.type === 'INCOME' ? "text-emerald-600" : "text-red-600"
                  )}>
                    {t.type === 'INCOME' ? '+' : '-'}{currency.symbol}{t.amount.toLocaleString()}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function TransactionsView({ transactions, accounts, isAdding, setIsAdding, onAdd, onUpdate, onDelete, currency }: any) {
  const [filterCategory, setFilterCategory] = useState('All');
  const [filterAccount, setFilterAccount] = useState('All');
  const [editingTransaction, setEditingTransaction] = useState<any>(null);

  const filtered = useMemo(() => {
    let result = transactions;
    if (filterCategory !== 'All') {
      result = result.filter((t: any) => t.category === filterCategory);
    }
    if (filterAccount !== 'All') {
      result = result.filter((t: any) => t.accountId === Number(filterAccount));
    }
    return result;
  }, [transactions, filterCategory, filterAccount]);

  return (
    <div className="animate-in slide-in-from-bottom-4 duration-500">
      <header className="mb-12 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-widest text-blue-600 font-bold mb-1">Ledger</p>
          <h2 className="text-4xl font-black tracking-tight text-gray-900">Transactions</h2>
        </div>
        {!isAdding && !editingTransaction && (
          <button 
            onClick={() => setIsAdding(true)}
            className="bg-blue-600 text-white px-8 py-4 rounded-2xl flex items-center gap-2 hover:bg-blue-700 transition-all shadow-lg shadow-blue-200 uppercase text-xs font-bold tracking-widest"
          >
            <Plus size={18} />
            New Entry
          </button>
        )}
      </header>

      {(isAdding || editingTransaction) && (
        <div className="mb-12 border border-gray-100 bg-white p-10 rounded-[40px] shadow-2xl shadow-gray-100 animate-in zoom-in-95 duration-300">
          <div className="flex justify-between items-center mb-10">
            <h3 className="text-2xl font-bold text-gray-900">{editingTransaction ? 'Edit Transaction' : 'Add New Transaction'}</h3>
            <button onClick={() => { setIsAdding(false); setEditingTransaction(null); }} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
              <X size={24} className="text-gray-400" />
            </button>
          </div>
          <TransactionForm 
            accounts={accounts} 
            initialData={editingTransaction}
            onSubmit={(tx: any) => {
              if (editingTransaction) {
                onUpdate({ ...tx, id: editingTransaction.id });
              } else {
                onAdd(tx);
              }
              setIsAdding(false);
              setEditingTransaction(null);
            }} 
            onCancel={() => { setIsAdding(false); setEditingTransaction(null); }} 
            currency={currency} 
          />
        </div>
      )}

      <div className="border border-gray-100 bg-white rounded-3xl shadow-sm overflow-hidden">
        <div className="p-8 border-b border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <h3 className="text-lg font-bold text-gray-900">Transaction History</h3>
            <span className="text-[10px] font-bold bg-blue-50 text-blue-600 px-3 py-1 rounded-full uppercase tracking-wider">{filtered.length} Entries</span>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-3 bg-gray-50 px-4 py-2 rounded-xl border border-gray-100">
              <CreditCard size={16} className="text-gray-400" />
              <select 
                className="bg-transparent border-none text-xs font-bold text-gray-600 uppercase tracking-widest focus:ring-0 cursor-pointer outline-none"
                value={filterAccount}
                onChange={(e) => setFilterAccount(e.target.value)}
              >
                <option value="All">All Accounts</option>
                {accounts.map((acc: any) => <option key={acc.id} value={acc.id}>{acc.name}</option>)}
              </select>
            </div>
            <div className="flex items-center gap-3 bg-gray-50 px-4 py-2 rounded-xl border border-gray-100">
              <Filter size={16} className="text-gray-400" />
              <select 
                className="bg-transparent border-none text-xs font-bold text-gray-600 uppercase tracking-widest focus:ring-0 cursor-pointer outline-none"
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
              >
                <option value="All">All Categories</option>
                {ALL_CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
              </select>
            </div>
          </div>
        </div>
        
        <div className="overflow-x-auto">
          {filtered.length === 0 ? (
            <div className="py-24 text-center">
              <div className="h-20 w-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-6">
                <ReceiptText size={40} className="text-gray-200" />
              </div>
              <h4 className="text-xl font-bold text-gray-900 mb-2">No transactions found</h4>
              <p className="text-gray-400 text-sm max-w-xs mx-auto">Start tracking your finances by adding your first transaction entry.</p>
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50/50">
                  <th className="p-6 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Date</th>
                  <th className="p-6 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Description</th>
                  <th className="p-6 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Account</th>
                  <th className="p-6 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Category</th>
                  <th className="p-6 text-[10px] font-bold text-gray-400 uppercase tracking-widest text-right">Amount</th>
                  <th className="p-6 text-[10px] font-bold text-gray-400 uppercase tracking-widest text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((t: any) => (
                  <tr key={t.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors group">
                    <td className="p-6 text-xs font-bold text-gray-500">{t.date}</td>
                    <td className="p-6 text-sm font-bold text-gray-900">{t.description}</td>
                    <td className="p-6">
                      <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded-md uppercase tracking-widest">
                        {accounts.find((a: any) => a.id === t.accountId)?.name || 'Unknown'}
                      </span>
                    </td>
                    <td className="p-6">
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{t.category}</span>
                    </td>
                    <td className={cn(
                      "p-6 text-sm text-right font-black",
                      t.type === 'INCOME' ? "text-emerald-600" : "text-red-600"
                    )}>
                      {t.type === 'INCOME' ? '+' : '-'}{currency.symbol}{t.amount.toLocaleString()}
                    </td>
                    <td className="p-6 text-right">
                      <div className="flex justify-end gap-2">
                        <button 
                          onClick={() => setEditingTransaction(t)}
                          className="p-2 text-gray-300 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                        >
                          <Pencil size={18} />
                        </button>
                        <button 
                          onClick={() => onDelete(t.id)}
                          className="p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

// --- Components ---

function TransactionForm({ accounts, onSubmit, onCancel, currency, initialData }: any) {
  const [isScanning, setIsScanning] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    amount: initialData?.amount?.toString() || '',
    description: initialData?.description || '',
    date: initialData?.date || new Date().toISOString().split('T')[0],
    category: initialData?.category || EXPENSE_CATEGORIES[0],
    type: (initialData?.type || 'EXPENSE') as TransactionType,
    accountId: initialData?.accountId || accounts[0]?.id || 0
  });

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsScanning(true);
    try {
      const reader = new FileReader();
      reader.onload = async () => {
        const base64Data = (reader.result as string).split(',')[1];
        const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });
        
        const prompt = `Extract transaction details from this ${file.type.includes('pdf') ? 'PDF' : 'image'}. 
        Return ONLY a JSON object with: amount (number), description (string), date (YYYY-MM-DD), and category (one of: ${EXPENSE_CATEGORIES.join(', ')}).
        If you cannot find a field, leave it null.`;

        const response = await ai.models.generateContent({
          model: "gemini-3-flash-preview",
          contents: [
            {
              parts: [
                { inlineData: { data: base64Data, mimeType: file.type } },
                { text: prompt }
              ]
            }
          ],
          config: {
            responseMimeType: "application/json",
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                amount: { type: Type.NUMBER },
                description: { type: Type.STRING },
                date: { type: Type.STRING },
                category: { type: Type.STRING }
              }
            }
          }
        });

        const result = JSON.parse(response.text || '{}');
        setFormData(prev => ({
          ...prev,
          amount: result.amount?.toString() || prev.amount,
          description: result.description || prev.description,
          date: result.date || prev.date,
          category: EXPENSE_CATEGORIES.includes(result.category) ? result.category : prev.category,
          type: 'EXPENSE'
        }));
        setIsScanning(false);
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error("AI Scan failed:", error);
      setScanError("Failed to scan document. Please enter manually.");
      setIsScanning(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      ...formData,
      amount: parseFloat(formData.amount)
    });
  };

  return (
    <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-12">
      <div className="space-y-8">
        <div>
          <label className="block text-xs uppercase font-bold text-gray-400 tracking-widest mb-4">Transaction Type</label>
          <div className="flex gap-4 p-1 bg-gray-100 rounded-2xl">
            <button 
              type="button"
              onClick={() => setFormData({ ...formData, type: 'EXPENSE', category: EXPENSE_CATEGORIES[0] })}
              className={cn(
                "flex-1 py-3 rounded-xl text-xs font-bold uppercase tracking-widest transition-all",
                formData.type === 'EXPENSE' ? "bg-white text-red-600 shadow-sm" : "text-gray-500 hover:text-gray-700"
              )}
            >
              Expense
            </button>
            <button 
              type="button"
              onClick={() => setFormData({ ...formData, type: 'INCOME', category: INCOME_CATEGORIES[0] })}
              className={cn(
                "flex-1 py-3 rounded-xl text-xs font-bold uppercase tracking-widest transition-all",
                formData.type === 'INCOME' ? "bg-white text-emerald-600 shadow-sm" : "text-gray-500 hover:text-gray-700"
              )}
            >
              Income
            </button>
          </div>
        </div>

        <div>
          <label className="block text-xs uppercase font-bold text-gray-400 tracking-widest mb-4">Quick Scan</label>
          <div className="relative">
            <input 
              type="file" 
              accept="image/*,application/pdf"
              onChange={handleFileUpload}
              className="hidden" 
              id="ai-upload"
              disabled={isScanning}
            />
            <label 
              htmlFor="ai-upload"
              className={cn(
                "w-full flex items-center justify-center gap-3 py-6 border-2 border-dashed border-gray-200 rounded-2xl cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-all text-xs font-bold uppercase tracking-widest text-gray-500 hover:text-blue-600",
                isScanning && "opacity-50 cursor-not-allowed"
              )}
            >
              {isScanning ? (
                <>
                  <div className="h-4 w-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                  AI Scanning...
                </>
              ) : (
                <>
                  <Zap size={18} />
                  Scan Receipt
                </>
              )}
            </label>
          </div>
          {scanError && (
            <p className="mt-2 text-[10px] font-bold text-red-500 uppercase tracking-widest flex items-center gap-1">
              <AlertTriangle size={12} />
              {scanError}
            </p>
          )}
        </div>

        <div>
          <label className="block text-xs uppercase font-bold text-gray-400 tracking-widest mb-4">Account</label>
          <div className="relative">
            <CreditCard size={18} className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400" />
            <select 
              className="w-full bg-gray-50 border border-gray-200 rounded-2xl pl-12 pr-10 py-4 text-sm font-bold text-gray-900 focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none appearance-none cursor-pointer transition-all"
              value={formData.accountId}
              onChange={(e) => setFormData({ ...formData, accountId: Number(e.target.value) })}
            >
              {accounts.map((acc: any) => (
                <option key={acc.id} value={acc.id}>{acc.name}</option>
              ))}
            </select>
            <ChevronRight size={18} className="absolute right-5 top-1/2 -translate-y-1/2 text-gray-400 rotate-90 pointer-events-none" />
          </div>
        </div>

        <div>
          <label className="block text-xs uppercase font-bold text-gray-400 tracking-widest mb-4">Amount ({currency.symbol})</label>
          <div className="relative group">
            <span className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400 font-bold">{currency.symbol}</span>
            <input 
              required
              type="number" 
              step="0.01"
              className="w-full bg-gray-50 border border-gray-200 rounded-2xl pl-12 pr-6 py-4 text-lg font-bold text-gray-900 focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none transition-all"
              placeholder="0.00"
              value={formData.amount}
              onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
            />
          </div>
        </div>
      </div>

      <div className="space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-xs uppercase font-bold text-gray-400 tracking-widest mb-4">Date</label>
            <div className="relative">
              <Calendar size={18} className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input 
                required
                type="date" 
                className="w-full bg-gray-50 border border-gray-200 rounded-2xl pl-12 pr-6 py-4 text-sm font-bold text-gray-900 focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none transition-all"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs uppercase font-bold text-gray-400 tracking-widest mb-4">Category</label>
            <div className="relative">
              <Tag size={18} className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400" />
              <select 
                className="w-full bg-gray-50 border border-gray-200 rounded-2xl pl-12 pr-10 py-4 text-sm font-bold text-gray-900 focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none appearance-none cursor-pointer transition-all"
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              >
                {(formData.type === 'INCOME' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES).map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
              <ChevronRight size={18} className="absolute right-5 top-1/2 -translate-y-1/2 text-gray-400 rotate-90 pointer-events-none" />
            </div>
          </div>
        </div>

        <div>
          <label className="block text-xs uppercase font-bold text-gray-400 tracking-widest mb-4">Description</label>
          <textarea 
            required
            className="w-full bg-gray-50 border border-gray-200 rounded-2xl p-6 text-sm font-medium text-gray-900 focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none h-[140px] resize-none transition-all"
            placeholder="What was this for?"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          />
        </div>

        <div className="flex gap-4 pt-4">
          <button 
            type="button"
            onClick={onCancel}
            className="flex-1 py-4 border border-gray-200 rounded-2xl text-xs font-bold uppercase tracking-widest text-gray-500 hover:bg-gray-50 transition-all"
          >
            Cancel
          </button>
          <button 
            type="submit"
            className="flex-1 py-4 bg-blue-600 text-white rounded-2xl text-xs font-bold uppercase tracking-widest hover:bg-blue-700 transition-all shadow-lg shadow-blue-100 flex items-center justify-center gap-2"
          >
            <Check size={18} />
            {initialData ? 'Update Entry' : 'Save Entry'}
          </button>
        </div>
      </div>
    </form>
  );
}

function StatCard({ label, value, trend, icon }: { label: string, value: string, trend?: string, icon: React.ReactNode }) {
  return (
    <div className="border border-gray-100 p-8 bg-white rounded-3xl shadow-sm relative overflow-hidden group hover:shadow-md transition-all">
      <div className="flex justify-between items-start mb-4">
        <p className="text-xs uppercase font-bold text-gray-400 tracking-widest">{label}</p>
        <div className="p-2 bg-gray-50 rounded-xl group-hover:bg-blue-50 transition-colors">
          {icon}
        </div>
      </div>
      <div className="flex items-baseline gap-2">
        <h3 className="text-3xl font-black tracking-tight text-gray-900">{value}</h3>
        {trend && (
          <span className={cn(
            "text-xs font-bold px-2 py-0.5 rounded-full",
            trend.startsWith('+') ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-600"
          )}>
            {trend}
          </span>
        )}
      </div>
    </div>
  );
}

function AccountsView({ accounts, onAddAccount, onUpdateAccount, onDeleteAccount, currency }: any) {
  const [isAdding, setIsAdding] = useState(false);
  const [editingAccount, setEditingAccount] = useState<any>(null);

  return (
    <div className="animate-in fade-in duration-500">
      <header className="mb-12 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-widest text-blue-600 font-bold mb-1">Asset Management</p>
          <h2 className="text-4xl font-black tracking-tight text-gray-900">Accounts</h2>
        </div>
        <button 
          onClick={() => { setEditingAccount(null); setIsAdding(true); }}
          className="bg-blue-600 text-white px-8 py-4 rounded-2xl flex items-center gap-2 hover:bg-blue-700 transition-all shadow-lg shadow-blue-200 uppercase text-xs font-bold tracking-widest"
        >
          <Plus size={18} />
          Add Account
        </button>
      </header>

      {(isAdding || editingAccount) && (
        <div className="mb-12 border border-gray-100 bg-white p-10 rounded-[40px] shadow-2xl shadow-gray-100 animate-in zoom-in-95 duration-300">
          <div className="flex justify-between items-center mb-10">
            <h3 className="text-2xl font-bold text-gray-900">{editingAccount ? 'Edit Account' : 'Create New Account'}</h3>
            <button onClick={() => { setIsAdding(false); setEditingAccount(null); }} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
              <X size={24} className="text-gray-400" />
            </button>
          </div>
          <AccountForm 
            initialData={editingAccount}
            onSubmit={(acc: any) => { 
              if (editingAccount) {
                onUpdateAccount({ ...acc, id: editingAccount.id });
              } else {
                onAddAccount(acc);
              }
              setIsAdding(false); 
              setEditingAccount(null);
            }} 
            onCancel={() => { setIsAdding(false); setEditingAccount(null); }} 
          />
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {accounts.map((acc: any) => (
          <div key={acc.id} className="bg-white p-8 rounded-[40px] border border-gray-100 shadow-sm hover:shadow-xl transition-all group relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-gray-50 rounded-full -mr-16 -mt-16 group-hover:bg-blue-50 transition-colors" />
            <div className="relative z-10">
              <div className="flex justify-between items-start mb-8">
                <div className="p-4 rounded-2xl bg-gray-50 group-hover:bg-white group-hover:shadow-lg transition-all">
                  <CreditCard size={24} style={{ color: acc.color }} />
                </div>
                <div className="flex gap-2">
                  <button 
                    onClick={() => setEditingAccount(acc)}
                    className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                  >
                    <Pencil size={16} />
                  </button>
                  <button 
                    onClick={() => onDeleteAccount(acc.id)}
                    className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
              <div className="mb-6">
                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest bg-gray-50 px-3 py-1 rounded-full">{acc.type}</span>
                <h3 className="text-xl font-bold text-gray-900 mt-2 mb-1">{acc.name}</h3>
                <p className="text-3xl font-black tracking-tight text-gray-900">{currency.symbol}{acc.currentBalance.toLocaleString()}</p>
              </div>
              
              <div className="pt-6 border-t border-gray-50 flex items-center justify-between">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Initial Balance</p>
                <p className="text-xs font-bold text-gray-600">{currency.symbol}{acc.balance.toLocaleString()}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function AccountForm({ onSubmit, onCancel, initialData }: any) {
  const [formData, setFormData] = useState({
    name: initialData?.name || '',
    type: initialData?.type || 'Bank',
    balance: initialData?.balance?.toString() || '',
    color: initialData?.color || '#3B82F6'
  });

  const colors = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4', '#141414'];

  return (
    <form onSubmit={(e) => { e.preventDefault(); onSubmit({ ...formData, balance: parseFloat(formData.balance || '0') }); }} className="grid grid-cols-1 md:grid-cols-2 gap-12">
      <div className="space-y-8">
        <div>
          <label className="block text-xs uppercase font-bold text-gray-400 tracking-widest mb-4">Account Name</label>
          <input 
            required
            type="text" 
            className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-6 py-4 text-sm font-bold text-gray-900 focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none transition-all"
            placeholder="e.g. HDFC Savings"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          />
        </div>

        <div>
          <label className="block text-xs uppercase font-bold text-gray-400 tracking-widest mb-4">Account Type</label>
          <div className="relative">
            <select 
              className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-6 py-4 text-sm font-bold text-gray-900 focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none appearance-none cursor-pointer transition-all"
              value={formData.type}
              onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
            >
              <option value="Bank">Bank Account</option>
              <option value="Cash">Cash</option>
              <option value="Credit Card">Credit Card</option>
              <option value="Savings">Savings</option>
            </select>
            <ChevronRight size={18} className="absolute right-5 top-1/2 -translate-y-1/2 text-gray-400 rotate-90 pointer-events-none" />
          </div>
        </div>
      </div>

      <div className="space-y-8">
        <div>
          <label className="block text-xs uppercase font-bold text-gray-400 tracking-widest mb-4">Initial Balance</label>
          <input 
            required
            type="number" 
            className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-6 py-4 text-sm font-bold text-gray-900 focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none transition-all"
            placeholder="0.00"
            value={formData.balance}
            onChange={(e) => setFormData({ ...formData, balance: e.target.value })}
          />
        </div>

        <div>
          <label className="block text-xs uppercase font-bold text-gray-400 tracking-widest mb-4">Theme Color</label>
          <div className="flex flex-wrap gap-3">
            {colors.map(c => (
              <button 
                key={c}
                type="button"
                onClick={() => setFormData({ ...formData, color: c })}
                className={cn(
                  "h-10 w-10 rounded-full border-4 transition-all",
                  formData.color === c ? "border-white shadow-lg scale-110" : "border-transparent opacity-60 hover:opacity-100"
                )}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
        </div>

        <div className="flex gap-4 pt-4">
          <button 
            type="button"
            onClick={onCancel}
            className="flex-1 py-4 border border-gray-200 rounded-2xl text-xs font-bold uppercase tracking-widest text-gray-500 hover:bg-gray-50 transition-all"
          >
            Cancel
          </button>
          <button 
            type="submit"
            className="flex-1 py-4 bg-blue-600 text-white rounded-2xl text-xs font-bold uppercase tracking-widest hover:bg-blue-700 transition-all shadow-lg shadow-blue-100"
          >
            {initialData ? 'Update Account' : 'Create Account'}
          </button>
        </div>
      </div>
    </form>
  );
}

