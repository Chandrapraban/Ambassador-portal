const db = require('./db');

// Thresholds (swap comments to switch to production values)
const PREFERRED_WINDOW_MIN = 5;    // prod: 24 * 60
const ESCALATION_MIN = 10;         // prod: 48 * 60

function runEscalationJob() {
  // Step 1: 'Waiting for Preferred' → 'Open' after preferred window expires
  const opened = db.prepare(`
    UPDATE requests
    SET status = 'Open', updated_at = CURRENT_TIMESTAMP
    WHERE status = 'Waiting for Preferred'
      AND created_at <= datetime('now', ?)
  `).run(`-${PREFERRED_WINDOW_MIN} minutes`);

  if (opened.changes > 0) {
    console.log(`[Scheduler] ${opened.changes} ticket(s) preferred window expired → now Open to all ambassadors`);
  }

  // Step 2: Any unclaimed ticket → 'Escalated' after escalation window
  const escalated = db.prepare(`
    UPDATE requests
    SET status = 'Escalated', updated_at = CURRENT_TIMESTAMP
    WHERE status IN ('Open', 'Waiting for Preferred')
      AND created_at <= datetime('now', ?)
  `).run(`-${ESCALATION_MIN} minutes`);

  if (escalated.changes > 0) {
    console.log(`[Scheduler] ${escalated.changes} ticket(s) escalated to admin`);
  }
}

function startScheduler() {
  console.log(`[Scheduler] Started — preferred window: ${PREFERRED_WINDOW_MIN} min, escalation: ${ESCALATION_MIN} min`);
  runEscalationJob();
  setInterval(runEscalationJob, 60 * 1000);
}

module.exports = { startScheduler };
