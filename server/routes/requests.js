const express = require('express');
const jwt = require('jsonwebtoken');
const db = require('../db');
const { JWT_SECRET } = require('./auth');

const router = express.Router();

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

function generateRequestId() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let id;
  do {
    id = 'REQ-' + Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  } while (db.prepare('SELECT id FROM requests WHERE request_id = ?').get(id));
  return id;
}

function parseRequest(row) {
  if (!row) return null;
  return {
    ...row,
    availability_slots: JSON.parse(row.availability_slots || '[]'),
    preferred_ambassadors: JSON.parse(row.preferred_ambassadors || '[]'),
    match_anyone: Boolean(row.match_anyone),
  };
}

// Public: create request
router.post('/', (req, res) => {
  const { prospect_name, prospect_email, concentration, message, availability_slots, match_anyone, preferred_ambassadors } = req.body;
  if (!prospect_name || !prospect_email) {
    return res.status(400).json({ error: 'Name and email required' });
  }
  const requestId = generateRequestId();
  db.prepare(`
    INSERT INTO requests (request_id, prospect_name, prospect_email, concentration, message, availability_slots, match_anyone, preferred_ambassadors)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    requestId, prospect_name, prospect_email,
    concentration || '', message || '',
    JSON.stringify(availability_slots || []),
    match_anyone ? 1 : 0,
    JSON.stringify(preferred_ambassadors || [])
  );
  const row = db.prepare('SELECT * FROM requests WHERE request_id = ?').get(requestId);
  res.status(201).json(parseRequest(row));
});

// Protected: list requests
router.get('/', requireAuth, (req, res) => {
  let rows;
  if (req.user.role === 'admin') {
    const { status, concentration } = req.query;
    let query = 'SELECT r.*, a.name as ambassador_name FROM requests r LEFT JOIN ambassadors a ON r.claimed_by = a.id';
    const conditions = [];
    const params = [];
    if (status) { conditions.push('r.status = ?'); params.push(status); }
    if (concentration) { conditions.push('r.concentration = ?'); params.push(concentration); }
    if (conditions.length) query += ' WHERE ' + conditions.join(' AND ');
    query += ' ORDER BY r.created_at DESC';
    rows = db.prepare(query).all(...params);
  } else {
    // Ambassador sees open + waiting-for-preferred requests on board
    rows = db.prepare(`
      SELECT r.*, a.name as ambassador_name FROM requests r
      LEFT JOIN ambassadors a ON r.claimed_by = a.id
      WHERE r.status IN ('Open', 'Waiting for Preferred')
      ORDER BY r.created_at ASC
    `).all();
  }
  res.json(rows.map(parseRequest));
});

// Protected: get my claimed requests (ambassador)
router.get('/mine', requireAuth, (req, res) => {
  if (req.user.role !== 'ambassador') return res.status(403).json({ error: 'Forbidden' });
  const rows = db.prepare(`
    SELECT * FROM requests WHERE claimed_by = ?
    ORDER BY updated_at DESC
  `).all(req.user.ambassadorId);
  res.json(rows.map(parseRequest));
});

// Admin: analytics data
router.get('/analytics', requireAuth, (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Forbidden' });

  const statusCounts = db.prepare(`
    SELECT status, COUNT(*) as count FROM requests GROUP BY status
  `).all();

  const concentrationCounts = db.prepare(`
    SELECT concentration, COUNT(*) as count FROM requests
    WHERE concentration != '' GROUP BY concentration ORDER BY count DESC
  `).all();

  const ambassadorLoad = db.prepare(`
    SELECT a.name, COUNT(r.id) as total,
      SUM(CASE WHEN r.status IN ('Claimed','Call Scheduled','Follow-up Needed') THEN 1 ELSE 0 END) as active,
      SUM(CASE WHEN r.status = 'Call Completed' THEN 1 ELSE 0 END) as completed
    FROM ambassadors a
    LEFT JOIN requests r ON a.id = r.claimed_by
    GROUP BY a.id ORDER BY total DESC
  `).all();

  const feedbackStats = db.prepare(`
    SELECT feedback_rating, COUNT(*) as count FROM requests
    WHERE feedback_rating IS NOT NULL GROUP BY feedback_rating ORDER BY feedback_rating
  `).all();

  const avgRating = db.prepare(`
    SELECT AVG(feedback_rating) as avg FROM requests WHERE feedback_rating IS NOT NULL
  `).get();

  const volumeByDay = db.prepare(`
    SELECT DATE(created_at) as date, COUNT(*) as count
    FROM requests
    WHERE created_at >= DATE('now', '-30 days')
    GROUP BY DATE(created_at) ORDER BY date
  `).all();

  const totals = db.prepare(`
    SELECT
      COUNT(*) as total,
      SUM(CASE WHEN status = 'Open' THEN 1 ELSE 0 END) as open,
      SUM(CASE WHEN status = 'Claimed' THEN 1 ELSE 0 END) as claimed,
      SUM(CASE WHEN status = 'Call Scheduled' THEN 1 ELSE 0 END) as scheduled,
      SUM(CASE WHEN status = 'Call Completed' THEN 1 ELSE 0 END) as completed,
      SUM(CASE WHEN status = 'Follow-up Needed' THEN 1 ELSE 0 END) as followup,
      SUM(CASE WHEN status = 'Waiting for Preferred' THEN 1 ELSE 0 END) as waiting
    FROM requests
  `).get();

  res.json({ statusCounts, concentrationCounts, ambassadorLoad, feedbackStats, avgRating: avgRating.avg, volumeByDay, totals });
});

// Public: get single request (by request_id string)
router.get('/:requestId', (req, res) => {
  const row = db.prepare(`
    SELECT r.*, a.name as ambassador_name, a.email as ambassador_email,
           a.scheduling_link as ambassador_scheduling_link
    FROM requests r LEFT JOIN ambassadors a ON r.claimed_by = a.id
    WHERE r.request_id = ?
  `).get(req.params.requestId);
  if (!row) return res.status(404).json({ error: 'Request not found' });
  res.json(parseRequest(row));
});

// Ambassador: claim a request
router.post('/:requestId/claim', requireAuth, (req, res) => {
  if (req.user.role !== 'ambassador') return res.status(403).json({ error: 'Forbidden' });

  const row = db.prepare('SELECT * FROM requests WHERE request_id = ?').get(req.params.requestId);
  if (!row) return res.status(404).json({ error: 'Not found' });
  if (!['Open', 'Waiting for Preferred'].includes(row.status)) {
    return res.status(409).json({ error: 'Request is no longer available' });
  }

  db.prepare(`
    UPDATE requests SET claimed_by = ?, status = 'Claimed', updated_at = CURRENT_TIMESTAMP
    WHERE request_id = ?
  `).run(req.user.ambassadorId, req.params.requestId);

  const updated = db.prepare(`
    SELECT r.*, a.name as ambassador_name FROM requests r
    LEFT JOIN ambassadors a ON r.claimed_by = a.id
    WHERE r.request_id = ?
  `).get(req.params.requestId);
  res.json(parseRequest(updated));
});

// Ambassador/Admin: update request (status, notes, scheduled time)
router.put('/:requestId', requireAuth, (req, res) => {
  const row = db.prepare('SELECT * FROM requests WHERE request_id = ?').get(req.params.requestId);
  if (!row) return res.status(404).json({ error: 'Not found' });

  if (req.user.role === 'ambassador' && row.claimed_by !== req.user.ambassadorId) {
    return res.status(403).json({ error: 'Not your request' });
  }

  const { status, notes, scheduled_call_datetime, concentration, claimed_by } = req.body;

  if (req.user.role === 'admin') {
    db.prepare(`
      UPDATE requests SET
        status = COALESCE(?, status),
        notes = COALESCE(?, notes),
        scheduled_call_datetime = COALESCE(?, scheduled_call_datetime),
        concentration = COALESCE(?, concentration),
        claimed_by = COALESCE(?, claimed_by),
        updated_at = CURRENT_TIMESTAMP
      WHERE request_id = ?
    `).run(status, notes, scheduled_call_datetime, concentration, claimed_by, req.params.requestId);
  } else {
    db.prepare(`
      UPDATE requests SET
        status = COALESCE(?, status),
        notes = COALESCE(?, notes),
        scheduled_call_datetime = COALESCE(?, scheduled_call_datetime),
        updated_at = CURRENT_TIMESTAMP
      WHERE request_id = ?
    `).run(status, notes, scheduled_call_datetime, req.params.requestId);
  }

  const updated = db.prepare('SELECT * FROM requests WHERE request_id = ?').get(req.params.requestId);
  res.json(parseRequest(updated));
});

// Public: prospect accepts claim
router.post('/:requestId/accept-claim', (req, res) => {
  const row = db.prepare('SELECT * FROM requests WHERE request_id = ?').get(req.params.requestId);
  if (!row) return res.status(404).json({ error: 'Not found' });
  db.prepare(`UPDATE requests SET status = 'Claimed', updated_at = CURRENT_TIMESTAMP WHERE request_id = ?`)
    .run(req.params.requestId);
  res.json({ ok: true });
});

// Public: prospect waits for preferred ambassador
router.post('/:requestId/wait-preferred', (req, res) => {
  const row = db.prepare('SELECT * FROM requests WHERE request_id = ?').get(req.params.requestId);
  if (!row) return res.status(404).json({ error: 'Not found' });
  db.prepare(`
    UPDATE requests SET status = 'Waiting for Preferred', claimed_by = NULL, updated_at = CURRENT_TIMESTAMP
    WHERE request_id = ?
  `).run(req.params.requestId);
  res.json({ ok: true });
});

// Public: submit feedback
router.post('/:requestId/feedback', (req, res) => {
  const row = db.prepare('SELECT * FROM requests WHERE request_id = ?').get(req.params.requestId);
  if (!row) return res.status(404).json({ error: 'Not found' });
  if (row.feedback_rating !== null) {
    return res.status(409).json({ error: 'Feedback already submitted' });
  }
  const { rating, text } = req.body;
  if (!rating || rating < 1 || rating > 5) {
    return res.status(400).json({ error: 'Rating must be 1–5' });
  }
  db.prepare(`
    UPDATE requests SET feedback_rating = ?, feedback_text = ?, feedback_submitted_at = CURRENT_TIMESTAMP,
    updated_at = CURRENT_TIMESTAMP WHERE request_id = ?
  `).run(rating, text || '', req.params.requestId);
  res.json({ ok: true });
});

module.exports = router;
