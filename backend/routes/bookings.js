const express = require('express');
const router = express.Router();
const { dbPromise } = require('../database');
const { authenticate, authorizeRole } = require('../middleware/authMiddleware');

// GET all bookings (SI sees all, Student sees their own)
router.get('/', authenticate, async (req, res) => {
  try {
    const db = await dbPromise;
    
    let query = `
      SELECT b.*, s.date, s.start_time, s.end_time, u.name as student_name, u.email as student_email
      FROM bookings b
      JOIN availability_slots s ON b.slot_id = s.id
      JOIN users u ON b.student_id = u.id
    `;
    let params = [];

    if (req.user.role === 'student') {
       query += " WHERE b.student_id = ?";
       params.push(req.user.id);
    } else {
       // Assuming SI only sees their slots
       query += " WHERE s.si_id = ?";
       params.push(req.user.id);
    }
    
    query += " ORDER BY s.date, s.start_time";

    const bookings = await db.all(query, params);
    res.json(bookings);
  } catch (error) {
    res.status(500).json({ error: "Failed to retrieve bookings." });
  }
});

// POST new booking (Student only)
router.post('/', authenticate, authorizeRole('student'), async (req, res) => {
  try {
    const { slot_id, course, topic, notes } = req.body;
    
    if (!slot_id || !course || !topic) {
      return res.status(400).json({ error: "Missing required fields." });
    }

    const db = await dbPromise;
    await db.exec('BEGIN TRANSACTION');
    
    try {
      // Check slot availability
      const slot = await db.get("SELECT is_booked FROM availability_slots WHERE id = ?", [slot_id]);
      if (!slot) {
        throw new Error("Slot not found.");
      }
      if (slot.is_booked) {
        return res.status(409).json({ error: "Slot is already booked." });
      }
      
      // Update slot to booked
      await db.run("UPDATE availability_slots SET is_booked = 1 WHERE id = ?", [slot_id]);
      
      // Insert booking
      const result = await db.run(
        "INSERT INTO bookings (slot_id, student_id, course, topic, notes, status) VALUES (?, ?, ?, ?, ?, 'scheduled')",
        [slot_id, req.user.id, course, topic, notes || '']
      );
      
      await db.exec('COMMIT');
      res.status(201).json({ id: result.lastID, slot_id, student_id: req.user.id, course, topic, status: 'scheduled' });
    } catch (innerError) {
      await db.exec('ROLLBACK');
      throw innerError;
    }
    
  } catch (error) {
    if (error.message === "Slot not found.") {
       return res.status(404).json({ error: error.message });
    }
    res.status(500).json({ error: "Failed to create booking." });
  }
});

// PUT update status and cancel
router.put('/:id/status', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    
    if (!['scheduled', 'completed', 'canceled'].includes(status)) {
      return res.status(400).json({ error: "Invalid status." });
    }

    // Role restraints
    if (req.user.role === 'student' && status !== 'canceled') {
      return res.status(403).json({ error: "Students can only cancel their own bookings." });
    }

    const db = await dbPromise;
    await db.exec('BEGIN TRANSACTION');
    
    try {
      const booking = await db.get("SELECT slot_id, student_id, status FROM bookings WHERE id = ?", [id]);
      if (!booking) {
        throw new Error("Booking not found.");
      }
      
      if (req.user.role === 'student' && booking.student_id !== req.user.id) {
        throw new Error("Unauthorized.");
      }
      
      // Update status
      await db.run("UPDATE bookings SET status = ? WHERE id = ?", [status, id]);
      
      // Free slot if canceled
      if (status === 'canceled' && booking.status !== 'canceled') {
         await db.run("UPDATE availability_slots SET is_booked = 0 WHERE id = ?", [booking.slot_id]);
      } else if (booking.status === 'canceled' && status !== 'canceled') {
         const slot = await db.get("SELECT is_booked FROM availability_slots WHERE id = ?", [booking.slot_id]);
         if (slot.is_booked) throw new Error("Cannot reopen booking; slot is already taken.");
         await db.run("UPDATE availability_slots SET is_booked = 1 WHERE id = ?", [booking.slot_id]);
      }
      
      await db.exec('COMMIT');
      res.json({ message: "Status updated successfully." });
    } catch (innerError) {
      await db.exec('ROLLBACK');
      throw innerError;
    }
  } catch (error) {
    if (error.message === "Booking not found.") return res.status(404).json({ error: error.message });
    if (error.message === "Unauthorized.") return res.status(403).json({ error: error.message });
    if (error.message.includes("Cannot reopen")) return res.status(409).json({ error: error.message });
    res.status(500).json({ error: "Failed to update booking status." });
  }
});

module.exports = router;
