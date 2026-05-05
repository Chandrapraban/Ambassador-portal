const express = require('express');
const jwt = require('jsonwebtoken');
const msal = require('@azure/msal-node');
const db = require('../db');

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'duke-mem-secret-change-in-prod';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'Duke2024!';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';
const REDIRECT_URI = process.env.AZURE_REDIRECT_URI || 'http://localhost:3001/api/auth/callback';

const SSO_CONFIGURED = !!(process.env.AZURE_CLIENT_ID && process.env.AZURE_CLIENT_SECRET && process.env.AZURE_TENANT_ID);

let cca = null;
if (SSO_CONFIGURED) {
  cca = new msal.ConfidentialClientApplication({
    auth: {
      clientId: process.env.AZURE_CLIENT_ID,
      clientSecret: process.env.AZURE_CLIENT_SECRET,
      authority: `https://login.microsoftonline.com/${process.env.AZURE_TENANT_ID}`,
    },
  });
}

function sign(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}

// SSO: redirect to Microsoft login
router.get('/sso', async (req, res) => {
  if (!cca) {
    return res.redirect(`${FRONTEND_URL}/login?error=sso_not_configured`);
  }
  try {
    const authUrl = await cca.getAuthCodeUrl({
      scopes: ['openid', 'profile', 'email'],
      redirectUri: REDIRECT_URI,
    });
    res.redirect(authUrl);
  } catch (err) {
    console.error('SSO redirect error:', err);
    res.redirect(`${FRONTEND_URL}/login?error=sso_failed`);
  }
});

// SSO: OAuth callback from Microsoft
router.get('/callback', async (req, res) => {
  if (!cca) {
    return res.redirect(`${FRONTEND_URL}/login?error=sso_not_configured`);
  }
  const { code, error } = req.query;
  if (error) {
    return res.redirect(`${FRONTEND_URL}/login?error=sso_denied`);
  }
  try {
    const result = await cca.acquireTokenByCode({
      code,
      scopes: ['openid', 'profile', 'email'],
      redirectUri: REDIRECT_URI,
    });

    // Microsoft returns UPN as username (e.g. netid@duke.edu)
    const email = result.account.username;
    const ambassador = db.prepare('SELECT * FROM ambassadors WHERE LOWER(email) = LOWER(?)').get(email);

    if (!ambassador) {
      return res.redirect(`${FRONTEND_URL}/login?error=not_registered`);
    }

    const token = sign({ role: 'ambassador', ambassadorId: ambassador.id, email: ambassador.email });
    res.redirect(`${FRONTEND_URL}/auth/callback?token=${token}`);
  } catch (err) {
    console.error('SSO callback error:', err);
    res.redirect(`${FRONTEND_URL}/login?error=sso_failed`);
  }
});

// Check if SSO is configured (used by frontend to show/hide button)
router.get('/sso-status', (req, res) => {
  res.json({ enabled: SSO_CONFIGURED });
});

// Admin password login (unchanged)
router.post('/login', (req, res) => {
  const { password } = req.body;
  if (password !== ADMIN_PASSWORD) {
    return res.status(401).json({ error: 'Invalid password' });
  }
  const token = sign({ role: 'admin' });
  res.json({ token, role: 'admin' });
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
