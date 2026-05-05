# Duke MEM Ambassador Connect Portal — Dev Context

## What this is
A local full-stack web app connecting Duke MEM prospective students with current student ambassadors. Built for the Duke MEM program to replace a manual coordination workflow.

## Stack
- **Frontend:** React + Vite (port 5173) — `client/`
- **Backend:** Node.js + Express (port 3001) — `server/`
- **Database:** SQLite — `server/data/portal.db` (gitignored, created on first run)
- **Auth:** Duke SSO via Microsoft Azure AD (ambassador login) + hardcoded password (admin login)
- **Photo uploads:** stored in `server/uploads/` (gitignored)

## How to run
```bash
npm run dev          # starts both server + client concurrently
npm run install:all  # install all deps after a fresh clone
```

## Routes
| Path | Access | Description |
|---|---|---|
| `/` | Public | 3-step prospect intake form |
| `/confirmation` | Public | Shows REQ-XXXX after submission |
| `/login` | Public | Ambassador SSO + Admin password |
| `/auth/callback` | Public | OAuth redirect handler (post Duke SSO) |
| `/ambassador` | Ambassador only | Request board, My Requests, Profile tabs |
| `/admin` | Admin only | Overview, Request Mgmt, Ambassador Mgmt, Analytics |
| `/accept-claim/:id` | Public | Prospect accepts assigned ambassador |
| `/wait-preferred/:id` | Public | Prospect releases request back to board |
| `/feedback/:id` | Public | Post-call 1–5 star feedback form |

## API endpoints
- `POST /api/auth/login` — admin password login
- `GET  /api/auth/sso` — redirects to Microsoft Azure AD login
- `GET  /api/auth/callback` — OAuth callback, issues JWT, redirects frontend
- `GET  /api/auth/sso-status` — returns `{ enabled: bool }` based on env vars
- `GET  /api/auth/me` — returns current user from JWT
- `GET  /api/ambassadors` — public list (used by prospect form)
- `GET/PUT /api/ambassadors/me` — ambassador edits own profile
- `POST /api/ambassadors/me/photo` — photo upload (multer, stored in server/uploads/)
- `POST/PUT/DELETE /api/ambassadors/:id` — admin CRUD
- `POST /api/requests` — public, creates request (generates REQ-XXXX)
- `GET  /api/requests` — auth; ambassadors see Open+Waiting, admin sees all
- `GET  /api/requests/mine` — ambassador's claimed requests
- `GET  /api/requests/analytics` — admin only, powers analytics charts
- `GET  /api/requests/:requestId` — public single request lookup
- `POST /api/requests/:requestId/claim` — ambassador claims request
- `PUT  /api/requests/:requestId` — update status/notes/schedule
- `POST /api/requests/:requestId/accept-claim` — prospect accepts
- `POST /api/requests/:requestId/wait-preferred` — prospect waits, releases back to board
- `POST /api/requests/:requestId/feedback` — prospect submits feedback

## Database tables
**ambassadors:** id, name, email (unique), undergrad_background, concentration, linkedin_url, scheduling_link, photo_url, tags (JSON array), availability_status (Active/Busy/On Break)

**requests:** id, request_id (REQ-XXXX), prospect_name, prospect_email, concentration, message, availability_slots (JSON: [{date, times[]}]), match_anyone, preferred_ambassadors (JSON array of ambassador IDs — **order = priority rank**), claimed_by (FK), status, scheduled_call_datetime, notes, feedback_rating (1-5), feedback_text

## Status flow
`Open` → `Claimed` → `Call Scheduled` → `Call Completed` → `Follow-up Needed`
Special: `Waiting for Preferred` (prospect rejected non-preferred ambassador)

## Auth details
- **Ambassador:** Duke SSO via Azure AD. After OAuth, email matched against ambassadors table. JWT issued (7d expiry), stored in localStorage.
- **Admin:** Password only (`Duke2024!` default, override with `ADMIN_PASSWORD` env var).
- JWT secret: `JWT_SECRET` env var (defaults to dev string — change in prod).

## SSO setup (not yet active — needs Duke OIT)
Create `server/.env` (see `.env.example`):
```
AZURE_CLIENT_ID=...from Duke OIT...
AZURE_CLIENT_SECRET=...from Duke OIT...
AZURE_TENANT_ID=...from Duke OIT...
AZURE_REDIRECT_URI=http://localhost:3001/api/auth/callback
```
Request from Duke OIT: Azure AD app registration with callback URL above.

## Key behaviours
- Request board auto-refreshes every 15 seconds
- `preferred_ambassadors` array order = priority (index 0 = #1 Priority)
- Soft cap warning shown when ambassador has 3+ active requests (overridable)
- Urgency badge shown on requests older than 48 hours
- Ambassador photos stored in `server/uploads/`, served as static files

## GitHub
- Repo: https://github.com/Chandrapraban/Ambassador-portal
- Collaborator: rishabhvenkat510 (write access)

## What's not built yet
- Email notifications (deliberately removed — can add later with Resend/SendGrid)
- Production deployment config
- Real Duke SSO credentials (pending Duke OIT)
- Seed script for the 14 ambassadors (add via Admin → Ambassador Management for now)
