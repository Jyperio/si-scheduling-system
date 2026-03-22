const express = require('express');
const cors = require('cors');
const path = require('path');
const { setupDatabase } = require('./database');
const authRoutes = require('./routes/auth');
const availabilityRoutes = require('./routes/availability');
const bookingRoutes = require('./routes/bookings');

const app = express();
const PORT = process.env.PORT || 5001;

app.use(cors());
app.use(express.json());

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'SI Scheduling API is live' });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/availability', availabilityRoutes);
app.use('/api/bookings', bookingRoutes);

// Serve frontend in production
app.use(express.static(path.join(__dirname, '../frontend/dist')));
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/dist/index.html'));
});

// Database initialization & Server start
setupDatabase().then(() => {
  app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
  });
}).catch(err => {
  console.error('Failed to start server:', err);
});
