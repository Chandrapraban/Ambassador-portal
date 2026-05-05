const express = require('express');
const cors = require('cors');
const path = require('path');

const db = require('./db');
const { startScheduler } = require('./scheduler');
const authRoutes = require('./routes/auth');
const ambassadorRoutes = require('./routes/ambassadors');
const requestRoutes = require('./routes/requests');

const app = express();
const PORT = process.env.PORT || 3001;
const isProd = process.env.NODE_ENV === 'production';

// In development the Vite dev server is on a different port, so CORS is needed.
// In production the Express server serves the built React app directly.
if (!isProd) {
  app.use(cors({ origin: 'http://localhost:5173', credentials: true }));
}

app.use(express.json());

// Serve uploaded photos from the data volume (path matches DATA_DIR env var)
const uploadsDir = process.env.DATA_DIR
  ? path.join(process.env.DATA_DIR, 'uploads')
  : path.join(__dirname, 'uploads');
app.use('/uploads', express.static(uploadsDir));

app.use('/api/auth', authRoutes);
app.use('/api/ambassadors', ambassadorRoutes);
app.use('/api/requests', requestRoutes);

// In production: serve the built React app for every non-API route
if (isProd) {
  const clientDist = path.join(__dirname, '../client/dist');
  app.use(express.static(clientDist));
  app.get('*', (req, res) => res.sendFile(path.join(clientDist, 'index.html')));
}

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: err.message || 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  startScheduler();
});
