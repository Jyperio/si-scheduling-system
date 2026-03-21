# SI Session Booking & Availability Management

A premium, full-stack scheduling platform designed for Supplemental Instructors (SIs) and their students. Students can effortlessly book help sessions from predefined, open time slots, while SIs can seamlessly manage their availability and monitor upcoming sessions. 

The application is secured with a robust **Role-Based Access Control (RBAC)** authentication system.

## Authentication & User Roles
The platform now distinguishes users via email/password authentication (using JWT and bcrypt). During signup, you can select your role:
- **Student Role**: Students can view all unbooked availability slots, book sessions, and browse their own personal scheduled bookings. They can cancel their own bookings, which cleanly re-opens the slot.
- **Supplemental Instructor (SI) Role**: SIs are granted admin-level dashboard access. SIs are responsible for generating open availability blocks (`10:00 - 11:00`), deleting open blocks they no longer want to host, reviewing the master list of all student bookings, and marking sessions as completed or canceled. 

### Security & Permission Separation
Security is enforced strictly on the backend. It's not just UI visibility toggles: custom Express middleware (`authenticate` and `authorizeRole`) parse JWT Bearer tokens to guarantee students cannot hit `POST /api/availability` to create fake slots, and similarly ensure students cannot view other peoples' bookings via `GET /api/bookings`.

## Features
- **Slot-based Availability:** SIs create specific available time slots.
- **Student Booking Flow:** Students reserve slots by providing their course, topic, and contact info.
- **Conflict Prevention:** Backend validation avoids overlapping availability slots.
- **Authentication:** Standard email/password flow keeping session data secure via JWT.
- **Premium UI:** A modern, mobile-first CSS architecture with clean typography, rounded cards, and visual status badges.

## Setup Instructions

### 1. Backend Setup
```bash
cd backend
npm install
npm run seed  # Generates database schema, and seeds one SI user and one Student user
npm start     # Runs API on http://localhost:5001
```
*Note: The seed script instantly provisions `si@university.edu` and `student@university.edu` with the password `password123`.*

### 2. Frontend Setup
```bash
cd frontend
npm install
npm run dev   # Runs React app on http://localhost:5173
```

## Future Improvements
- Add password reset capabilities via email.
- Enable email confirmations and calendar invites via NodeMailer / ICal generation.
- Support recurring weekly availability generation.
