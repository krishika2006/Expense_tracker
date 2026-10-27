import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import Database from 'better-sqlite3';
import { z } from 'zod';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataFile = path.resolve(__dirname, process.env.DATABASE_FILE || '../data/financeflow.sqlite');
fs.mkdirSync(path.dirname(dataFile), { recursive: true });
const db = new Database(dataFile);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');
db.exec(`
CREATE TABLE IF NOT EXISTS users(id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, email TEXT NOT NULL UNIQUE COLLATE NOCASE, password_hash TEXT NOT NULL, currency TEXT NOT NULL DEFAULT 'USD', created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS accounts(id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE, name TEXT NOT NULL, type TEXT NOT NULL DEFAULT 'Bank', opening_balance REAL NOT NULL DEFAULT 0, color TEXT NOT NULL DEFAULT '#141414', currency TEXT NOT NULL DEFAULT 'USD', created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS transactions(id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE, account_id INTEGER REFERENCES accounts(id) ON DELETE SET NULL, amount REAL NOT NULL CHECK(amount > 0), description TEXT NOT NULL, date TEXT NOT NULL, category TEXT NOT NULL, type TEXT NOT NULL CHECK(type IN ('INCOME','EXPENSE')), source TEXT NOT NULL DEFAULT 'MANUAL', created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS budgets(id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE, category TEXT NOT NULL, amount REAL NOT NULL CHECK(amount >= 0), month INTEGER NOT NULL, year INTEGER NOT NULL, UNIQUE(user_id, category, month, year));
CREATE INDEX IF NOT EXISTS idx_transactions_user_date ON transactions(user_id, date);
CREATE INDEX IF NOT EXISTS idx_accounts_user ON accounts(user_id);
`);

const app = express();
app.use(helmet());
app.use(cors({ origin: (process.env.FRONTEND_URL || 'http://localhost:3000').split(',').map(x => x.trim()), credentials: true }));
app.use(express.json({ limit: '1mb' }));
app.use('/api/auth', rateLimit({ windowMs: 15 * 60 * 1000, limit: 40, standardHeaders: true, legacyHeaders: false }));
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET || JWT_SECRET.length < 32) console.warn('WARNING: Set JWT_SECRET to a random secret of at least 32 characters in backend/.env');
const secret = JWT_SECRET || 'development-only-secret-change-before-deployment-123456';
const fail = (res, status, message) => res.status(status).json({ success: false, error: message });
const auth = (req, res, next) => {
  const token = (req.headers.authorization || '').startsWith('Bearer ') ? req.headers.authorization.slice(7) : null;
  if (!token) return fail(res, 401, 'Authentication required');
  try { req.user = jwt.verify(token, secret); next(); } catch { return fail(res, 401, 'Invalid or expired token'); }
};
const asyncRoute = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
const positiveAmount = z.number().finite().positive().max(1_000_000_000);
const transactionSchema = z.object({ amount: positiveAmount, description: z.string().trim().min(1).max(250), date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), category: z.string().trim().min(1).max(100), type: z.enum(['INCOME','EXPENSE']), accountId: z.number().int().positive().nullable().optional(), source: z.enum(['MANUAL','PLAID']).optional() });
const accountSchema = z.object({ name: z.string().trim().min(1).max(100), type: z.enum(['Bank','Cash','Credit Card','Savings']), balance: z.number().finite().min(-1_000_000_000).max(1_000_000_000).optional(), color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(), currency: z.string().length(3).optional() });
const safeUser = u => ({ id: String(u.id), name: u.name, email: u.email, image: '', currency: u.currency });
const transactionForClient = t => ({ ...t, id: Number(t.id), amount: Number(t.amount), accountId: t.account_id == null ? null : Number(t.account_id), account_id: undefined });
const accountForClient = a => ({ id: Number(a.id), name: a.name, type: a.type, balance: Number(a.opening_balance), color: a.color, currency: a.currency });

app.get('/api/health', (_req, res) => res.json({ success: true, status: 'ok', service: 'FinanceFlow API' }));

app.post('/api/auth/register', (req, res) => {
  const parsed = z.object({ name: z.string().trim().min(2).max(100), email: z.string().trim().email().max(254), password: z.string().min(8).max(128) }).safeParse(req.body);
  if (!parsed.success) return fail(res, 400, parsed.error.issues[0].message);
  const { name, email, password } = parsed.data;
  if (db.prepare('SELECT id FROM users WHERE email = ?').get(email)) return fail(res, 409, 'An account with this email already exists');
  const info = db.prepare('INSERT INTO users(name,email,password_hash) VALUES(?,?,?)').run(name, email.toLowerCase(), bcrypt.hashSync(password, 12));
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(info.lastInsertRowid);
  const token = jwt.sign({ id: user.id, email: user.email }, secret, { expiresIn: '7d' });
  res.status(201).json({ success: true, token, user: safeUser(user) });
});
app.post('/api/auth/login', (req, res) => {
  const parsed = z.object({ email: z.string().trim().email(), password: z.string().min(1).max(128) }).safeParse(req.body);
  if (!parsed.success) return fail(res, 400, 'Enter a valid email and password');
  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(parsed.data.email.toLowerCase());
  if (!user || !bcrypt.compareSync(parsed.data.password, user.password_hash)) return fail(res, 401, 'Incorrect email or password');
  res.json({ success: true, token: jwt.sign({ id: user.id, email: user.email }, secret, { expiresIn: '7d' }), user: safeUser(user) });
});
app.get('/api/auth/me', auth, (req, res) => { const u = db.prepare('SELECT * FROM users WHERE id=?').get(req.user.id); if (!u) return fail(res, 401, 'User not found'); res.json({ success: true, user: safeUser(u) }); });
app.patch('/api/auth/profile', auth, (req, res) => {
  const parsed = z.object({ name: z.string().trim().min(2).max(100).optional(), currency: z.enum(['USD','EUR','GBP','INR','JPY','AED']).optional() }).safeParse(req.body);
  if (!parsed.success || !Object.keys(parsed.data || {}).length) return fail(res, 400, 'Provide a valid name or currency');
  if (parsed.data.name) db.prepare('UPDATE users SET name=? WHERE id=?').run(parsed.data.name, req.user.id);
  if (parsed.data.currency) db.prepare('UPDATE users SET currency=? WHERE id=?').run(parsed.data.currency, req.user.id);
  res.json({ success: true, user: safeUser(db.prepare('SELECT * FROM users WHERE id=?').get(req.user.id)) });
});

app.get('/api/accounts', auth, (req, res) => res.json({ success: true, accounts: db.prepare('SELECT * FROM accounts WHERE user_id=? ORDER BY id DESC').all(req.user.id).map(accountForClient) }));
app.post('/api/accounts', auth, (req, res) => {
  const p = accountSchema.safeParse(req.body); if (!p.success) return fail(res, 400, p.error.issues[0].message);
  const d = p.data; const result = db.prepare('INSERT INTO accounts(user_id,name,type,opening_balance,color,currency) VALUES(?,?,?,?,?,?)').run(req.user.id,d.name,d.type,d.balance ?? 0,d.color ?? '#141414',d.currency ?? db.prepare('SELECT currency FROM users WHERE id=?').get(req.user.id).currency);
  res.status(201).json({ success: true, account: accountForClient(db.prepare('SELECT * FROM accounts WHERE id=?').get(result.lastInsertRowid)) });
});
app.get('/api/accounts/:id', auth, (req,res) => { const a=db.prepare('SELECT * FROM accounts WHERE id=? AND user_id=?').get(Number(req.params.id),req.user.id); if(!a)return fail(res,404,'Account not found'); res.json({success:true,account:accountForClient(a)}); });
app.put('/api/accounts/:id', auth, (req,res) => { const p=accountSchema.safeParse(req.body); if(!p.success)return fail(res,400,p.error.issues[0].message); const old=db.prepare('SELECT * FROM accounts WHERE id=? AND user_id=?').get(Number(req.params.id),req.user.id); if(!old)return fail(res,404,'Account not found'); const d=p.data; db.prepare('UPDATE accounts SET name=?,type=?,opening_balance=?,color=?,currency=? WHERE id=? AND user_id=?').run(d.name,d.type,d.balance ?? old.opening_balance,d.color ?? old.color,d.currency ?? old.currency,old.id,req.user.id); res.json({success:true,account:accountForClient(db.prepare('SELECT * FROM accounts WHERE id=?').get(old.id))}); });
app.delete('/api/accounts/:id', auth, (req,res) => { const a=db.prepare('SELECT id FROM accounts WHERE id=? AND user_id=?').get(Number(req.params.id),req.user.id); if(!a)return fail(res,404,'Account not found'); const count=db.prepare('SELECT COUNT(*) n FROM transactions WHERE account_id=? AND user_id=?').get(a.id,req.user.id).n; if(count)return fail(res,409,'This account has transactions. Reassign or delete those transactions first.'); db.prepare('DELETE FROM accounts WHERE id=? AND user_id=?').run(a.id,req.user.id); res.json({success:true,message:'Account deleted'}); });

app.get('/api/transactions', auth, (req,res) => {
  const where=['user_id=?'], params=[req.user.id];
  if(req.query.type && ['INCOME','EXPENSE'].includes(req.query.type)){where.push('type=?');params.push(req.query.type)}
  if(req.query.category){where.push('category=?');params.push(String(req.query.category).slice(0,100))}
  if(req.query.accountId){where.push('account_id=?');params.push(Number(req.query.accountId))}
  if(req.query.from){where.push('date>=?');params.push(String(req.query.from))} if(req.query.to){where.push('date<=?');params.push(String(req.query.to))}
  if(req.query.search){where.push('description LIKE ?');params.push('%'+String(req.query.search).slice(0,100)+'%')}
  const limit=Math.min(200,Math.max(1,Number(req.query.limit)||100)), offset=Math.max(0,Number(req.query.offset)||0);
  const rows=db.prepare(`SELECT * FROM transactions WHERE ${where.join(' AND ')} ORDER BY date DESC,id DESC LIMIT ? OFFSET ?`).all(...params,limit,offset);
  res.json({success:true,transactions:rows.map(transactionForClient),pagination:{limit,offset}});
});
app.post('/api/transactions', auth, (req,res) => {
  const p=transactionSchema.safeParse(req.body); if(!p.success)return fail(res,400,p.error.issues[0].message); const d=p.data;
  if(d.accountId != null && !db.prepare('SELECT id FROM accounts WHERE id=? AND user_id=?').get(d.accountId,req.user.id))return fail(res,400,'Account not found for this user');
  const result=db.prepare('INSERT INTO transactions(user_id,account_id,amount,description,date,category,type,source) VALUES(?,?,?,?,?,?,?,?)').run(req.user.id,d.accountId ?? null,d.amount,d.description,d.date,d.category,d.type,d.source ?? 'MANUAL');
  res.status(201).json({success:true,transaction:transactionForClient(db.prepare('SELECT * FROM transactions WHERE id=?').get(result.lastInsertRowid))});
});
app.get('/api/transactions/:id', auth, (req,res)=>{const t=db.prepare('SELECT * FROM transactions WHERE id=? AND user_id=?').get(Number(req.params.id),req.user.id);if(!t)return fail(res,404,'Transaction not found');res.json({success:true,transaction:transactionForClient(t)});});
app.put('/api/transactions/:id', auth, (req,res)=>{const p=transactionSchema.safeParse(req.body);if(!p.success)return fail(res,400,p.error.issues[0].message);const old=db.prepare('SELECT id FROM transactions WHERE id=? AND user_id=?').get(Number(req.params.id),req.user.id);if(!old)return fail(res,404,'Transaction not found');const d=p.data;if(d.accountId!=null&&!db.prepare('SELECT id FROM accounts WHERE id=? AND user_id=?').get(d.accountId,req.user.id))return fail(res,400,'Account not found for this user');db.prepare('UPDATE transactions SET account_id=?,amount=?,description=?,date=?,category=?,type=?,source=? WHERE id=? AND user_id=?').run(d.accountId??null,d.amount,d.description,d.date,d.category,d.type,d.source??'MANUAL',old.id,req.user.id);res.json({success:true,transaction:transactionForClient(db.prepare('SELECT * FROM transactions WHERE id=?').get(old.id))});});
app.delete('/api/transactions/:id', auth, (req,res)=>{const r=db.prepare('DELETE FROM transactions WHERE id=? AND user_id=?').run(Number(req.params.id),req.user.id);if(!r.changes)return fail(res,404,'Transaction not found');res.json({success:true,message:'Transaction deleted'});});

app.get('/api/dashboard/summary', auth, (req,res)=>{
 const month=String(req.query.month||new Date().toISOString().slice(0,7)); if(!/^\d{4}-\d{2}$/.test(month))return fail(res,400,'month must use YYYY-MM');
 const userId=req.user.id; const accounts=db.prepare('SELECT * FROM accounts WHERE user_id=?').all(userId);
 const tx=db.prepare('SELECT * FROM transactions WHERE user_id=?').all(userId);
 const income=tx.filter(t=>t.type==='INCOME'&&t.date.startsWith(month)).reduce((s,t)=>s+t.amount,0);
 const expenses=tx.filter(t=>t.type==='EXPENSE'&&t.date.startsWith(month)).reduce((s,t)=>s+t.amount,0);
 const accountBalances=accounts.map(a=>({id:a.id,name:a.name,currency:a.currency,balance:a.opening_balance+tx.filter(t=>t.account_id===a.id).reduce((s,t)=>s+(t.type==='INCOME'?t.amount:-t.amount),0)}));
 const currency=db.prepare('SELECT currency FROM users WHERE id=?').get(userId).currency;
 res.json({success:true,summary:{month,currency,totalBalance:accountBalances.reduce((s,a)=>s+a.balance,0),income,expenses,netSavings:income-expenses,transactionCount:tx.length,accounts:accountBalances,recentTransactions:tx.sort((a,b)=>b.date.localeCompare(a.date)||b.id-a.id).slice(0,8).map(transactionForClient)}});
});
app.get('/api/analytics/cash-flow', auth, (req,res)=>{const from=String(req.query.from||new Date().toISOString().slice(0,7)+'-01'),to=String(req.query.to||new Date().toISOString().slice(0,10));if(!/^\d{4}-\d{2}-\d{2}$/.test(from)||!/^\d{4}-\d{2}-\d{2}$/.test(to))return fail(res,400,'Dates must use YYYY-MM-DD');const rows=db.prepare('SELECT date,type,SUM(amount) amount FROM transactions WHERE user_id=? AND date BETWEEN ? AND ? GROUP BY date,type ORDER BY date').all(req.user.id,from,to);const map={};for(const r of rows){map[r.date]??={date:r.date,income:0,expense:0};map[r.date][r.type==='INCOME'?'income':'expense']=Number(r.amount)}res.json({success:true,data:Object.values(map)});});
app.get('/api/analytics/category-breakdown', auth, (req,res)=>{const month=String(req.query.month||new Date().toISOString().slice(0,7));const rows=db.prepare("SELECT category,SUM(amount) amount FROM transactions WHERE user_id=? AND type='EXPENSE' AND substr(date,1,7)=? GROUP BY category ORDER BY amount DESC").all(req.user.id,month).map(r=>({...r,amount:Number(r.amount)}));res.json({success:true,month,data:rows});});
app.get('/api/analytics/monthly-trends', auth, (req,res)=>{const rows=db.prepare("SELECT substr(date,1,7) month,type,SUM(amount) amount FROM transactions WHERE user_id=? AND date>=date('now','-11 months','start of month') GROUP BY month,type ORDER BY month").all(req.user.id);const map={};for(const r of rows){map[r.month]??={month:r.month,income:0,expense:0};map[r.month][r.type==='INCOME'?'income':'expense']=Number(r.amount)}res.json({success:true,data:Object.values(map)});});
app.get('/api/budgets', auth, (req,res)=>{const month=Number(req.query.month)||Number(new Date().toISOString().slice(5,7)),year=Number(req.query.year)||new Date().getFullYear();const budgets=db.prepare('SELECT * FROM budgets WHERE user_id=? AND month=? AND year=? ORDER BY category').all(req.user.id,month,year);const data=budgets.map(b=>{const spent=db.prepare("SELECT COALESCE(SUM(amount),0) total FROM transactions WHERE user_id=? AND type='EXPENSE' AND category=? AND substr(date,1,7)=?").get(req.user.id,b.category,`${year}-${String(month).padStart(2,'0')}`).total;return {id:b.id,category:b.category,amount:b.amount,spent,remaining:b.amount-spent,percentUsed:b.amount?Math.round(spent/b.amount*100):0}});res.json({success:true,budgets:data});});
app.post('/api/budgets', auth, (req,res)=>{const p=z.object({category:z.string().trim().min(1).max(100),amount:z.number().finite().nonnegative().max(1e9),month:z.number().int().min(1).max(12),year:z.number().int().min(2000).max(2200)}).safeParse(req.body);if(!p.success)return fail(res,400,p.error.issues[0].message);const d=p.data;db.prepare('INSERT INTO budgets(user_id,category,amount,month,year) VALUES(?,?,?,?,?) ON CONFLICT(user_id,category,month,year) DO UPDATE SET amount=excluded.amount').run(req.user.id,d.category,d.amount,d.month,d.year);res.status(201).json({success:true,message:'Budget saved'});});
app.delete('/api/budgets/:id', auth, (req,res)=>{const r=db.prepare('DELETE FROM budgets WHERE id=? AND user_id=?').run(Number(req.params.id),req.user.id);if(!r.changes)return fail(res,404,'Budget not found');res.json({success:true,message:'Budget deleted'});});
app.post('/api/ai/spending-insights', auth, asyncRoute(async(req,res)=>{const rows=db.prepare('SELECT category,type,SUM(amount) amount,COUNT(*) count FROM transactions WHERE user_id=? AND date>=date(\'now\',\'-30 days\') GROUP BY category,type ORDER BY amount DESC').all(req.user.id);const total=rows.filter(r=>r.type==='EXPENSE').reduce((s,r)=>s+r.amount,0);if(!process.env.GEMINI_API_KEY)return res.json({success:true,source:'rule-based',insights:{summary:`Your recorded expenses in the last 30 days total ${total.toFixed(2)}.`,topExpenseCategories:rows.filter(r=>r.type==='EXPENSE').slice(0,5).map(r=>({category:r.category,amount:r.amount})),note:'Configure GEMINI_API_KEY in backend/.env to enable AI-generated insights.'}});try{const response=await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key='+encodeURIComponent(process.env.GEMINI_API_KEY),{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({contents:[{parts:[{text:'Give concise, non-professional financial spending insights based only on this aggregated transaction data. Do not claim certainty or give investment/tax advice. Data: '+JSON.stringify(rows)}]}]})});if(!response.ok)throw new Error('Gemini provider returned an error');const json=await response.json();res.json({success:true,source:'gemini',insights:{text:json.candidates?.[0]?.content?.parts?.map(p=>p.text||'').join('\n')||'No insight returned'}})}catch{res.status(502).json({success:false,error:'AI insights are temporarily unavailable'})}}));

app.use((err, _req, res, _next) => { console.error(err); res.status(500).json({ success: false, error: 'Internal server error' }); });
const port=Number(process.env.PORT)||4000;
app.listen(port,()=>console.log(`FinanceFlow API running at http://localhost:${port}`));
