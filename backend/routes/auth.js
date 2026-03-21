const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { dbPromise } = require('../database');
const { JWT_SECRET, authenticate } = require('../middleware/authMiddleware');

router.post('/signup', async (req, res) => {
  try {
    const { name, email, password, role } = req.body;
    if (!name || !email || !password || !role) {
      return res.status(400).json({ error: "Missing required fields." });
    }
    if (role !== 'student' && role !== 'si') {
      return res.status(400).json({ error: "Invalid role." });
    }

    const db = dbPromise;
    const existingRes = await db.query("SELECT id FROM users WHERE email = $1", [email]);
    const existing = existingRes.rows[0];
    if (existing) {
      return res.status(409).json({ error: "Email already in use." });
    }

    const hash = await bcrypt.hash(password, 10);
    const result = await db.query(
      "INSERT INTO users (name, email, password_hash, role) VALUES ($1, $2, $3, $4) RETURNING id",
      [name, email, hash, role]
    );

    const newId = result.rows[0].id;
    const token = jwt.sign({ id: newId, role }, JWT_SECRET, { expiresIn: '24h' });
    res.status(201).json({ token, user: { id: newId, name, email, role } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Signup failed." });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: "Missing required fields." });
    }

    const db = dbPromise;
    const userRes = await db.query("SELECT * FROM users WHERE email = $1", [email]);
    const user = userRes.rows[0];
    if (!user) {
      return res.status(401).json({ error: "Invalid credentials." });
    }

    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) {
      return res.status(401).json({ error: "Invalid credentials." });
    }

    const token = jwt.sign({ id: user.id, role: user.role }, JWT_SECRET, { expiresIn: '24h' });
    res.json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Login failed." });
  }
});

router.get('/me', authenticate, async (req, res) => {
  try {
    const db = dbPromise;
    const userRes = await db.query("SELECT id, name, email, role FROM users WHERE id = $1", [req.user.id]);
    const user = userRes.rows[0];
    if (!user) return res.status(404).json({ error: "User not found." });
    res.json({ user });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch user profile." });
  }
});

module.exports = router;
