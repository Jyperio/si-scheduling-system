const express = require('express');
const router = express.Router();
const { dbPromise } = require('../database');
const { authenticate, authorizeRole } = require('../middleware/authMiddleware');

function isValidTimeStr(timeStr) {
  return /^([01]\d|2[0-3]):?([0-5]\d)$/.test(timeStr);
}

// GET all availability slots (public to authenticated users)
router.get('/', authenticate, async (req, res) => {
  try {
    const db = await dbPromise;
    const { date, is_booked } = req.query;
    
    let query = "SELECT * FROM availability_slots WHERE 1=1";
    let params = [];
    
    if (date) {
      query += " AND date = ?";
      params.push(date);
    }
    if (is_booked !== undefined) {
      query += " AND is_booked = ?";
      params.push(is_booked === 'true' || is_booked === '1' ? 1 : 0);
    }
    
    if (req.user.role === 'si') {
      query += " AND si_id = ?";
      params.push(req.user.id);
    }
    
    query += " ORDER BY date, start_time";
    
    const slots = await db.all(query, params);
    res.json(slots);
  } catch (error) {
    res.status(500).json({ error: "Failed to retrieve availability slots." });
  }
});

// POST new availability slot (SI only)
router.post('/', authenticate, authorizeRole('si'), async (req, res) => {
  try {
    const { date, start_time, end_time } = req.body;
    
    if (!date || !start_time || !end_time) {
      return res.status(400).json({ error: "Missing required fields." });
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
       return res.status(400).json({ error: "Date must be YYYY-MM-DD format." });
    }
    if (!isValidTimeStr(start_time) || !isValidTimeStr(end_time)) {
       return res.status(400).json({ error: "Times must be HH:MM format." });
    }
    if (start_time >= end_time) {
       return res.status(400).json({ error: "End time must be after start time." });
    }

    const db = await dbPromise;
    
    // Check overlap
    const conflict = await db.get(`
      SELECT id FROM availability_slots 
      WHERE date = ? AND (? < end_time AND ? > start_time) AND si_id = ?
    `, [date, start_time, end_time, req.user.id]);
    
    if (conflict) {
      return res.status(409).json({ error: "Time slot overlaps with an existing availability slot." });
    }
    
    const result = await db.run(
      "INSERT INTO availability_slots (si_id, date, start_time, end_time, is_booked) VALUES (?, ?, ?, ?, 0)",
      [req.user.id, date, start_time, end_time]
    );
    
    res.status(201).json({ id: result.lastID, si_id: req.user.id, date, start_time, end_time, is_booked: 0 });
  } catch (error) {
    res.status(500).json({ error: "Failed to create slot." });
  }
});

// DELETE availability slot (SI only)
router.delete('/:id', authenticate, authorizeRole('si'), async (req, res) => {
  try {
    const db = await dbPromise;
    const { id } = req.params;
    
    const slot = await db.get("SELECT is_booked, si_id FROM availability_slots WHERE id = ?", [id]);
    if (!slot) return res.status(404).json({ error: "Slot not found" });
    if (slot.si_id !== req.user.id) return res.status(403).json({ error: "Unauthorized. Slot belongs to another SI." });
    if (slot.is_booked) return res.status(400).json({ error: "Cannot delete a booked slot. Cancel the booking first." });
    
    await db.run("DELETE FROM availability_slots WHERE id = ?", [id]);
    res.json({ message: "Slot deleted successfully." });
  } catch (error) {
    res.status(500).json({ error: "Failed to delete slot." });
  }
});

module.exports = router;
