-- SQL Schema for FinanceFlow Tracker

-- Categories Table
CREATE TABLE categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    type VARCHAR(10) NOT NULL CHECK (type IN ('INCOME', 'EXPENSE')),
    is_custom BOOLEAN DEFAULT FALSE
);

-- Transactions Table
CREATE TABLE transactions (
    id SERIAL PRIMARY KEY,
    amount DECIMAL(12, 2) NOT NULL,
    description TEXT,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    category_id INTEGER REFERENCES categories(id),
    type VARCHAR(10) NOT NULL CHECK (type IN ('INCOME', 'EXPENSE')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Pre-seed Categories
INSERT INTO categories (name, type) VALUES
('Raw Materials/Inventory', 'EXPENSE'),
('Zomato/Swiggy Commissions', 'EXPENSE'),
('Utilities', 'EXPENSE'),
('Payroll', 'EXPENSE'),
('Maintenance', 'EXPENSE'),
('Dine-in Sales', 'INCOME'),
('Online Delivery Sales', 'INCOME'),
('Catering', 'INCOME');
