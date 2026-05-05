const express = require('express');
const cors = require('cors');
const path = require('path');

const db = require('./db');
const authRoutes = require('./routes/auth');
const ambassadorRoutes = require('./routes/ambassadors');
const requestRoutes = require('./routes/requests');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({ origin: 'http://localhost:5173', credentials: true }));
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.use('/api/auth', authRoutes);
app.use('/api/ambassadors', ambassadorRoutes);
app.use('/api/requests', requestRoutes);

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: err.message || 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
