const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.join(__dirname, 'data', 'portal.db'));

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS ambassadors (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    undergrad_background TEXT DEFAULT '',
    concentration TEXT DEFAULT '',
    linkedin_url TEXT DEFAULT '',
    scheduling_link TEXT DEFAULT '',
    photo_url TEXT DEFAULT '',
    tags TEXT DEFAULT '[]',
    availability_status TEXT DEFAULT 'Active',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS requests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    request_id TEXT UNIQUE NOT NULL,
    prospect_name TEXT NOT NULL,
    prospect_email TEXT NOT NULL,
    concentration TEXT DEFAULT '',
    message TEXT DEFAULT '',
    availability_slots TEXT DEFAULT '[]',
    match_anyone INTEGER DEFAULT 0,
    preferred_ambassadors TEXT DEFAULT '[]',
    claimed_by INTEGER REFERENCES ambassadors(id),
    status TEXT DEFAULT 'Open',
    scheduled_call_datetime TEXT DEFAULT '',
    notes TEXT DEFAULT '',
    feedback_rating INTEGER,
    feedback_text TEXT DEFAULT '',
    feedback_submitted_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

module.exports = db;
