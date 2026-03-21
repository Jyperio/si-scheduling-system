const bcrypt = require('bcryptjs');
const { dbPromise, setupDatabase } = require('./database');

async function seed() {
  const db = await setupDatabase();
  
  // Clear tables
  await db.run("DELETE FROM bookings");
  await db.run("DELETE FROM availability_slots");
  await db.run("DELETE FROM users");

  // Create Users
  const hash = await bcrypt.hash('password123', 10);
  
  const siUser = await db.run(
    "INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, 'si')",
    ["Dr. Smith (SI)", "si@university.edu", hash]
  );
  
  const studentUser = await db.run(
    "INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, 'student')",
    ["Alice Student", "student@university.edu", hash]
  );
  
  const today = new Date().toISOString().split('T')[0];
  const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];

  // Seed Availability Slots
  const slot1 = await db.run(
    "INSERT INTO availability_slots (si_id, date, start_time, end_time, is_booked) VALUES (?, ?, ?, ?, 1)",
    [siUser.lastID, today, "10:00", "11:00"]
  );
  await db.run(
    "INSERT INTO availability_slots (si_id, date, start_time, end_time, is_booked) VALUES (?, ?, ?, ?, 0)",
    [siUser.lastID, today, "13:00", "14:00"]
  );
  await db.run(
    "INSERT INTO availability_slots (si_id, date, start_time, end_time, is_booked) VALUES (?, ?, ?, ?, 0)",
    [siUser.lastID, tomorrow, "15:00", "16:00"]
  );

  // Seed Booking for Slot 1
  await db.run(
    "INSERT INTO bookings (slot_id, student_id, course, topic, notes, status) VALUES (?, ?, ?, ?, ?, 'scheduled')",
    [slot1.lastID, studentUser.lastID, "CS 101", "Pointers and Memory", "I am stuck on homework 3"]
  );

  console.log("Database seeded with authentication and roles users.");
}

seed().catch(console.error);
