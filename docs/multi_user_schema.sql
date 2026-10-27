-- SQL Schema for FinanceFlow Pro (Multi-User & Bank Integrated)

-- Users Table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255),
    password_hash VARCHAR(255), -- For credentials provider
    image_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Bank Accounts (Plaid Items)
CREATE TABLE bank_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    plaid_access_token VARCHAR(255) NOT NULL,
    plaid_item_id VARCHAR(255) NOT NULL,
    institution_name VARCHAR(255),
    account_name VARCHAR(255),
    account_type VARCHAR(50),
    balance DECIMAL(15, 2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Categories Table (User-specific or Global)
CREATE TABLE categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE, -- NULL for global/default categories
    name VARCHAR(100) NOT NULL,
    type VARCHAR(10) NOT NULL CHECK (type IN ('INCOME', 'EXPENSE')),
    color VARCHAR(7) DEFAULT '#141414',
    UNIQUE(user_id, name)
);

-- Transactions Table
CREATE TABLE transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    bank_account_id UUID REFERENCES bank_accounts(id) ON DELETE SET NULL, -- NULL for manual cash transactions
    category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
    plaid_transaction_id VARCHAR(255) UNIQUE, -- NULL for manual transactions
    amount DECIMAL(15, 2) NOT NULL,
    description TEXT NOT NULL,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    type VARCHAR(10) NOT NULL CHECK (type IN ('INCOME', 'EXPENSE')),
    is_pending BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Pre-seed Global Categories
INSERT INTO categories (user_id, name, type) VALUES
(NULL, 'Salary', 'INCOME'),
(NULL, 'Freelance', 'INCOME'),
(NULL, 'Dividends', 'INCOME'),
(NULL, 'Gifts', 'INCOME'),
(NULL, 'Food & Dining', 'EXPENSE'),
(NULL, 'Transport', 'EXPENSE'),
(NULL, 'Bills & Recharges', 'EXPENSE'),
(NULL, 'Transfers', 'EXPENSE'),
(NULL, 'Medical', 'EXPENSE'),
(NULL, 'Travel', 'EXPENSE'),
(NULL, 'Repayments', 'EXPENSE'),
(NULL, 'Personal', 'EXPENSE'),
(NULL, 'Services', 'EXPENSE'),
(NULL, 'Insurance', 'EXPENSE'),
(NULL, 'Entertainment', 'EXPENSE'),
(NULL, 'Gaming', 'EXPENSE'),
(NULL, 'Small Shops', 'EXPENSE'),
(NULL, 'Rent', 'EXPENSE'),
(NULL, 'Logistics', 'EXPENSE'),
(NULL, 'Subscription', 'EXPENSE'),
(NULL, 'Investment', 'EXPENSE'),
(NULL, 'Fitness', 'EXPENSE'),
(NULL, 'Pet', 'EXPENSE'),
(NULL, 'Miscellaneous', 'EXPENSE'),
(NULL, 'Shopping', 'EXPENSE'),
(NULL, 'Groceries', 'EXPENSE');
