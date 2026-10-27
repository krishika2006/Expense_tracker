import { Router } from 'express';
import mongoose from 'mongoose';
import Expense from '../models/Expense.js';
import requireAuth from '../middleware/auth.js';

const router = Router();
router.use(requireAuth);

function validExpenseBody(body) {
  const amount = Number(body.amount);
  return Boolean(
    body.title?.trim() &&
    Number.isFinite(amount) &&
    amount > 0 &&
    body.category?.trim() &&
    (!body.type || ['expense', 'income'].includes(body.type)) &&
    (!body.date || !Number.isNaN(new Date(body.date).getTime()))
  );
}

// GET /api/expenses?type=expense&category=Food&from=2026-01-01&to=2026-12-31
router.get('/', async (req, res, next) => {
  try {
    const filter = { user: req.userId };
    if (req.query.type && ['expense', 'income'].includes(req.query.type)) filter.type = req.query.type;
    if (req.query.category) filter.category = req.query.category;
    if (req.query.from || req.query.to) {
      filter.date = {};
      if (req.query.from) filter.date.$gte = new Date(req.query.from);
      if (req.query.to) {
        const to = new Date(req.query.to);
        to.setHours(23, 59, 59, 999);
        filter.date.$lte = to;
      }
    }

    const expenses = await Expense.find(filter).sort({ date: -1, createdAt: -1 });
    res.json({ expenses });
  } catch (error) {
    next(error);
  }
});

// GET /api/expenses/summary
router.get('/summary', async (req, res, next) => {
  try {
    const rows = await Expense.aggregate([
      { $match: { user: new mongoose.Types.ObjectId(req.userId) } },
      { $group: {
        _id: '$type',
        total: { $sum: '$amount' },
        count: { $sum: 1 }
      } }
    ]);
    const byType = Object.fromEntries(rows.map((row) => [row._id, row]));
    const expenseTotal = byType.expense?.total || 0;
    const incomeTotal = byType.income?.total || 0;

    const categories = await Expense.aggregate([
      { $match: { user: new mongoose.Types.ObjectId(req.userId), type: 'expense' } },
      { $group: { _id: '$category', total: { $sum: '$amount' } } },
      { $sort: { total: -1 } }
    ]);

    res.json({
      income: incomeTotal,
      expenses: expenseTotal,
      balance: incomeTotal - expenseTotal,
      transactionCount: rows.reduce((sum, row) => sum + row.count, 0),
      categoryBreakdown: categories.map((item) => ({ category: item._id, amount: item.total }))
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/expenses
router.post('/', async (req, res, next) => {
  try {
    if (!validExpenseBody(req.body)) {
      return res.status(400).json({
        message: 'Provide a title, positive amount, category, valid type and valid date.'
      });
    }
    const expense = await Expense.create({
      user: req.userId,
      title: req.body.title.trim(),
      amount: Number(req.body.amount),
      category: req.body.category.trim(),
      type: req.body.type || 'expense',
      date: req.body.date ? new Date(req.body.date) : new Date(),
      note: req.body.note || ''
    });
    res.status(201).json({ message: 'Transaction added.', expense });
  } catch (error) {
    next(error);
  }
});

// PUT /api/expenses/:id
router.put('/:id', async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: 'Invalid transaction ID.' });
    }
    if (!validExpenseBody(req.body)) {
      return res.status(400).json({ message: 'Please provide valid transaction details.' });
    }

    const expense = await Expense.findOneAndUpdate(
      { _id: req.params.id, user: req.userId },
      {
        title: req.body.title.trim(),
        amount: Number(req.body.amount),
        category: req.body.category.trim(),
        type: req.body.type || 'expense',
        date: req.body.date ? new Date(req.body.date) : new Date(),
        note: req.body.note || ''
      },
      { new: true, runValidators: true }
    );
    if (!expense) return res.status(404).json({ message: 'Transaction not found.' });
    res.json({ message: 'Transaction updated.', expense });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/expenses/:id
router.delete('/:id', async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: 'Invalid transaction ID.' });
    }
    const expense = await Expense.findOneAndDelete({ _id: req.params.id, user: req.userId });
    if (!expense) return res.status(404).json({ message: 'Transaction not found.' });
    res.json({ message: 'Transaction deleted successfully.' });
  } catch (error) {
    next(error);
  }
});

export default router;
