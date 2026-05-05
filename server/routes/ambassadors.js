const express = require('express');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const db = require('../db');
const { JWT_SECRET } = require('./auth');

const router = express.Router();

const uploadsDir = process.env.DATA_DIR
  ? path.join(process.env.DATA_DIR, 'uploads')
  : path.join(__dirname, '../uploads');
fs.mkdirSync(uploadsDir, { recursive: true });

const storage = multer.diskStorage({
  destination: uploadsDir,
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `ambassador-${Date.now()}${ext}`);
  },
});
const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } });

function getUser(req) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return null;
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch {
    return null;
  }
}

function requireAuth(req, res, next) {
  const user = getUser(req);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });
  req.user = user;
  next();
}

function requireAdmin(req, res, next) {
  requireAuth(req, res, () => {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Forbidden' });
    next();
  });
}

function parseAmbassador(row) {
  if (!row) return null;
  return { ...row, tags: JSON.parse(row.tags || '[]') };
}

// Public: list all ambassadors (for prospect form)
router.get('/', (req, res) => {
  const rows = db.prepare('SELECT * FROM ambassadors ORDER BY name ASC').all();
  res.json(rows.map(parseAmbassador));
});

// Ambassador: get own profile
router.get('/me', requireAuth, (req, res) => {
  if (req.user.role !== 'ambassador') return res.status(403).json({ error: 'Forbidden' });
  const row = db.prepare('SELECT * FROM ambassadors WHERE id = ?').get(req.user.ambassadorId);
  res.json(parseAmbassador(row));
});

// Ambassador: update own profile
router.put('/me', requireAuth, (req, res) => {
  if (req.user.role !== 'ambassador') return res.status(403).json({ error: 'Forbidden' });
  const { name, undergrad_background, concentration, linkedin_url, scheduling_link, tags, availability_status } = req.body;
  db.prepare(`
    UPDATE ambassadors SET
      name = COALESCE(?, name),
      undergrad_background = COALESCE(?, undergrad_background),
      concentration = COALESCE(?, concentration),
      linkedin_url = COALESCE(?, linkedin_url),
      scheduling_link = COALESCE(?, scheduling_link),
      tags = COALESCE(?, tags),
      availability_status = COALESCE(?, availability_status),
      updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(name, undergrad_background, concentration, linkedin_url, scheduling_link,
    tags ? JSON.stringify(tags) : null, availability_status, req.user.ambassadorId);
  const row = db.prepare('SELECT * FROM ambassadors WHERE id = ?').get(req.user.ambassadorId);
  res.json(parseAmbassador(row));
});

// Ambassador: upload photo
router.post('/me/photo', requireAuth, upload.single('photo'), (req, res) => {
  if (req.user.role !== 'ambassador') return res.status(403).json({ error: 'Forbidden' });
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  const photoUrl = `/uploads/${req.file.filename}`;
  db.prepare('UPDATE ambassadors SET photo_url = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
    .run(photoUrl, req.user.ambassadorId);
  res.json({ photo_url: photoUrl });
});

// Admin: create ambassador
router.post('/', requireAdmin, (req, res) => {
  const { name, email, undergrad_background, concentration, linkedin_url, scheduling_link, tags, availability_status } = req.body;
  if (!name || !email) return res.status(400).json({ error: 'Name and email required' });
  try {
    const result = db.prepare(`
      INSERT INTO ambassadors (name, email, undergrad_background, concentration, linkedin_url, scheduling_link, tags, availability_status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(name, email, undergrad_background || '', concentration || '', linkedin_url || '',
      scheduling_link || '', JSON.stringify(tags || []), availability_status || 'Active');
    const row = db.prepare('SELECT * FROM ambassadors WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json(parseAmbassador(row));
  } catch (err) {
    if (err.message.includes('UNIQUE')) return res.status(409).json({ error: 'Email already exists' });
    throw err;
  }
});

// Admin: update any ambassador
router.put('/:id', requireAdmin, (req, res) => {
  const { name, email, undergrad_background, concentration, linkedin_url, scheduling_link, tags, availability_status } = req.body;
  db.prepare(`
    UPDATE ambassadors SET
      name = COALESCE(?, name),
      email = COALESCE(?, email),
      undergrad_background = COALESCE(?, undergrad_background),
      concentration = COALESCE(?, concentration),
      linkedin_url = COALESCE(?, linkedin_url),
      scheduling_link = COALESCE(?, scheduling_link),
      tags = COALESCE(?, tags),
      availability_status = COALESCE(?, availability_status),
      updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(name, email, undergrad_background, concentration, linkedin_url, scheduling_link,
    tags ? JSON.stringify(tags) : null, availability_status, req.params.id);
  const row = db.prepare('SELECT * FROM ambassadors WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Not found' });
  res.json(parseAmbassador(row));
});

// Admin: delete ambassador
router.delete('/:id', requireAdmin, (req, res) => {
  db.prepare('DELETE FROM ambassadors WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

module.exports = router;
