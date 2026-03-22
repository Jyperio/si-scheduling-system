const express = require('express');
const router = express.Router();
const dbModule = require('../database');
const { authenticate, authorizeRole } = require('../middleware/authMiddleware');

function isValidTimeStr(timeStr) {
  return /^([01]\d|2[0-3]):?([0-5]\d)$/.test(timeStr);
}

// GET all availability slots (public to authenticated users)
router.get('/', authenticate, async (req, res) => {
  try {
    const db = dbModule.dbPromise;
    const { date, is_booked } = req.query;
    
    let query = `
      SELECT s.*, u.name as si_name 
      FROM availability_slots s 
      JOIN users u ON s.si_id = u.id 
      WHERE 1=1
    `;
    let params = [];
    
    if (date) {
      params.push(date);
      query += ` AND s.date = $${params.length}`;
    }
    if (is_booked !== undefined) {
      params.push(is_booked === 'true' || is_booked === '1');
      query += ` AND s.is_booked = $${params.length}`;
    }
    
    if (req.user.role === 'si') {
      params.push(req.user.id);
      query += ` AND s.si_id = $${params.length}`;
    }
    
    query += " ORDER BY s.date, s.start_time";
    
    const resSlots = await db.query(query, params);
    res.json(resSlots.rows);
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

    const db = dbModule.dbPromise;
    
    // Check overlap
    const conflictRes = await db.query(`
      SELECT id FROM availability_slots 
      WHERE date = $1 AND ($2 < end_time AND $3 > start_time) AND si_id = $4
    `, [date, start_time, end_time, req.user.id]);
    const conflict = conflictRes.rows[0];
    
    if (conflict) {
      return res.status(409).json({ error: "Time slot overlaps with an existing availability slot." });
    }
    
    const result = await db.query(
      "INSERT INTO availability_slots (si_id, date, start_time, end_time, is_booked) VALUES ($1, $2, $3, $4, false) RETURNING id",
      [req.user.id, date, start_time, end_time]
    );
    
    res.status(201).json({ id: result.rows[0].id, si_id: req.user.id, date, start_time, end_time, is_booked: false });
  } catch (error) {
    res.status(500).json({ error: "Failed to create slot." });
  }
});

// DELETE availability slot (SI only)
router.delete('/:id', authenticate, authorizeRole('si'), async (req, res) => {
  try {
    const db = dbModule.dbPromise;
    const { id } = req.params;
    
    const slotRes = await db.query("SELECT is_booked, si_id FROM availability_slots WHERE id = $1", [id]);
    const slot = slotRes.rows[0];
    if (!slot) return res.status(404).json({ error: "Slot not found" });
    if (slot.si_id !== req.user.id) return res.status(403).json({ error: "Unauthorized. Slot belongs to another SI." });
    if (slot.is_booked) return res.status(400).json({ error: "Cannot delete a booked slot. Cancel the booking first." });
    
    await db.query("DELETE FROM availability_slots WHERE id = $1", [id]);
    res.json({ message: "Slot deleted successfully." });
  } catch (error) {
    res.status(500).json({ error: "Failed to delete slot." });
  }
});

module.exports = router;
