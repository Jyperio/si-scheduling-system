const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const dns = require('dns');
const net = require('net');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

// Force IPv4 DNS resolution - Render free tier does not support IPv6
dns.setDefaultResultOrder('ipv4first');

let pool;

async function setupDatabase() {
  if (!pool) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      console.error('ERROR: DATABASE_URL environment variable is missing!');
      throw new Error('DATABASE_URL is required');
    }

    const { parse } = require('pg-connection-string');
    const config = parse(connectionString);

    config.ssl = { rejectUnauthorized: false };
    // Supabase Pooler (6543) requires disabling prepared statements
    config.prepare_threshold = 0;

    pool = new Pool(config);
  }

  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'student'
      );
      CREATE INDEX IF NOT EXISTS idx_users_email ON users (email);

      CREATE TABLE IF NOT EXISTS availability_slots (
        id SERIAL PRIMARY KEY,
        si_id INTEGER NOT NULL,
        date TEXT NOT NULL,
        start_time TEXT NOT NULL,
        end_time TEXT NOT NULL,
        is_booked BOOLEAN DEFAULT false,
        FOREIGN KEY(si_id) REFERENCES users(id) ON DELETE CASCADE
      );
      CREATE INDEX IF NOT EXISTS idx_avail_date_times ON availability_slots (date, start_time, end_time);
      
      CREATE TABLE IF NOT EXISTS bookings (
        id SERIAL PRIMARY KEY,
        slot_id INTEGER NOT NULL,
        student_id INTEGER NOT NULL,
        course TEXT NOT NULL,
        topic TEXT NOT NULL,
        notes TEXT,
        status TEXT DEFAULT 'scheduled',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(slot_id) REFERENCES availability_slots(id) ON DELETE CASCADE,
        FOREIGN KEY(student_id) REFERENCES users(id) ON DELETE CASCADE
      );
      CREATE INDEX IF NOT EXISTS idx_bookings_slot ON bookings (slot_id);
      CREATE INDEX IF NOT EXISTS idx_bookings_student ON bookings (student_id);
    `);
    console.log("Database initialized with SI Booking Auth schema.");
  } finally {
    client.release();
  }
  return pool;
}

module.exports = {
  get dbPromise() { return pool; },
  get pool() { return pool; },
  setupDatabase
};
