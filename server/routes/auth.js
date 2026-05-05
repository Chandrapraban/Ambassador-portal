const express = require('express');
const jwt = require('jsonwebtoken');
const db = require('../db');

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'duke-mem-secret-change-in-prod';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'Duke2024!';

function sign(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}

router.post('/login', (req, res) => {
  const { email, password, role } = req.body;

  if (role === 'admin') {
    if (password !== ADMIN_PASSWORD) {
      return res.status(401).json({ error: 'Invalid password' });
    }
    const token = sign({ role: 'admin' });
    return res.json({ token, role: 'admin' });
  }

  if (role === 'ambassador') {
    if (!email) return res.status(400).json({ error: 'Email required' });
    const ambassador = db.prepare('SELECT * FROM ambassadors WHERE LOWER(email) = LOWER(?)').get(email.trim());
    if (!ambassador) {
      return res.status(401).json({ error: 'No ambassador found with that email' });
    }
    const token = sign({ role: 'ambassador', ambassadorId: ambassador.id, email: ambassador.email });
    return res.json({ token, role: 'ambassador', ambassador });
  }

  res.status(400).json({ error: 'Invalid role' });
});

router.get('/me', (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token' });
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    if (payload.role === 'ambassador') {
      const ambassador = db.prepare('SELECT * FROM ambassadors WHERE id = ?').get(payload.ambassadorId);
      if (!ambassador) return res.status(401).json({ error: 'Ambassador not found' });
      return res.json({ role: 'ambassador', ambassador });
    }
    if (payload.role === 'admin') {
      return res.json({ role: 'admin' });
    }
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
});

module.exports = router;
module.exports.JWT_SECRET = JWT_SECRET;
