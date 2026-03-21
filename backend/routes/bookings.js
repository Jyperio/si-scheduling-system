const express = require('express');
const router = express.Router();
const { dbPromise } = require('../database');
const { authenticate, authorizeRole } = require('../middleware/authMiddleware');

// GET all bookings (SI sees all, Student sees their own)
router.get('/', authenticate, async (req, res) => {
  try {
    const db = dbPromise;
    
    let query = `
      SELECT b.*, s.date, s.start_time, s.end_time, u.name as student_name, u.email as student_email, si.name as si_name
      FROM bookings b
      JOIN availability_slots s ON b.slot_id = s.id
      JOIN users u ON b.student_id = u.id
      JOIN users si ON s.si_id = si.id
    `;
    let params = [];

    if (req.user.role === 'student') {
       query += " WHERE b.student_id = $1";
       params.push(req.user.id);
    } else {
       // Assuming SI only sees their slots
       query += " WHERE s.si_id = $1";
       params.push(req.user.id);
    }
    
    query += " ORDER BY s.date, s.start_time";

    const resBookings = await db.query(query, params);
    res.json(resBookings.rows);
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

    const db = dbPromise;
    const client = await db.connect();
    await client.query('BEGIN');
    
    try {
      // Check slot availability
      const slotRes = await client.query("SELECT is_booked FROM availability_slots WHERE id = $1", [slot_id]);
      const slot = slotRes.rows[0];
      if (!slot) {
        throw new Error("Slot not found.");
      }
      if (slot.is_booked) {
        return res.status(409).json({ error: "Slot is already booked." });
      }
      
      // Update slot to booked
      await client.query("UPDATE availability_slots SET is_booked = true WHERE id = $1", [slot_id]);
      
      // Insert booking
      const result = await client.query(
        "INSERT INTO bookings (slot_id, student_id, course, topic, notes, status) VALUES ($1, $2, $3, $4, $5, 'scheduled') RETURNING id",
        [slot_id, req.user.id, course, topic, notes || '']
      );
      
      await client.query('COMMIT');
      res.status(201).json({ id: result.rows[0].id, slot_id, student_id: req.user.id, course, topic, status: 'scheduled' });
    } catch (innerError) {
      await client.query('ROLLBACK');
      throw innerError;
    } finally {
      client.release();
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

    const db = dbPromise;
    const client = await db.connect();
    await client.query('BEGIN');
    
    try {
      const bookRes = await client.query("SELECT slot_id, student_id, status FROM bookings WHERE id = $1", [id]);
      const booking = bookRes.rows[0];
      if (!booking) {
        throw new Error("Booking not found.");
      }
      
      if (req.user.role === 'student' && booking.student_id !== req.user.id) {
        throw new Error("Unauthorized.");
      }
      
      // Update status
      await client.query("UPDATE bookings SET status = $1 WHERE id = $2", [status, id]);
      
      // Free slot if canceled
      if (status === 'canceled' && booking.status !== 'canceled') {
         await client.query("UPDATE availability_slots SET is_booked = false WHERE id = $1", [booking.slot_id]);
      } else if (booking.status === 'canceled' && status !== 'canceled') {
         const slotRes = await client.query("SELECT is_booked FROM availability_slots WHERE id = $1", [booking.slot_id]);
         const slot = slotRes.rows[0];
         if (slot.is_booked) throw new Error("Cannot reopen booking; slot is already taken.");
         await client.query("UPDATE availability_slots SET is_booked = true WHERE id = $1", [booking.slot_id]);
      }
      
      await client.query('COMMIT');
      res.json({ message: "Status updated successfully." });
    } catch (innerError) {
      await client.query('ROLLBACK');
      throw innerError;
    } finally {
      client.release();
    }
  } catch (error) {
    if (error.message === "Booking not found.") return res.status(404).json({ error: error.message });
    if (error.message === "Unauthorized.") return res.status(403).json({ error: error.message });
    if (error.message.includes("Cannot reopen")) return res.status(409).json({ error: error.message });
    res.status(500).json({ error: "Failed to update booking status." });
  }
});

module.exports = router;
