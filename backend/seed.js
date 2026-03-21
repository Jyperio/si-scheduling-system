const bcrypt = require('bcryptjs');
const { dbPromise, setupDatabase } = require('./database');

async function seed() {
  const db = await setupDatabase();
  
  // Clear tables
  await db.query("DELETE FROM bookings");
  await db.query("DELETE FROM availability_slots");
  await db.query("DELETE FROM users");

  // Create Users
  const hash = await bcrypt.hash('password123', 10);
  
  const siUserRes = await db.query(
    "INSERT INTO users (name, email, password_hash, role) VALUES ($1, $2, $3, 'si') RETURNING id",
    ["Dr. Smith (SI)", "si@university.edu", hash]
  );
  const siUser = { id: siUserRes.rows[0].id };
  
  const studentUserRes = await db.query(
    "INSERT INTO users (name, email, password_hash, role) VALUES ($1, $2, $3, 'student') RETURNING id",
    ["Alice Student", "student@university.edu", hash]
  );
  const studentUser = { id: studentUserRes.rows[0].id };
  
  const today = new Date().toISOString().split('T')[0];
  const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];

  // Seed Availability Slots
  const slot1Res = await db.query(
    "INSERT INTO availability_slots (si_id, date, start_time, end_time, is_booked) VALUES ($1, $2, $3, $4, true) RETURNING id",
    [siUser.id, today, "10:00", "11:00"]
  );
  const slot1 = { id: slot1Res.rows[0].id };

  await db.query(
    "INSERT INTO availability_slots (si_id, date, start_time, end_time, is_booked) VALUES ($1, $2, $3, $4, false)",
    [siUser.id, today, "13:00", "14:00"]
  );
  await db.query(
    "INSERT INTO availability_slots (si_id, date, start_time, end_time, is_booked) VALUES ($1, $2, $3, $4, false)",
    [siUser.id, tomorrow, "15:00", "16:00"]
  );

  // Seed Booking for Slot 1
  await db.query(
    "INSERT INTO bookings (slot_id, student_id, course, topic, notes, status) VALUES ($1, $2, $3, $4, $5, 'scheduled')",
    [slot1.id, studentUser.id, "CS 101", "Pointers and Memory", "I am stuck on homework 3"]
  );

  console.log("Database seeded with authentication and roles users.");
}

seed().catch(console.error);
