import sqlite3
import os
from werkzeug.security import generate_password_hash

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DB_PATH = os.path.join(BASE_DIR, "feedback.db")

def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    print(f"--- Initializing Database ---")
    conn = get_db()
    c = conn.cursor()

    # 1. Create Tables
    c.execute("""
    CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        role TEXT NOT NULL,
        full_name TEXT,
        email TEXT,
        phone TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
    """)

    # Migration: Add columns if they don't exist (safe for existing DBs)
    try:
        c.execute("ALTER TABLE users ADD COLUMN email TEXT")
        c.execute("ALTER TABLE users ADD COLUMN phone TEXT")
    except sqlite3.OperationalError:
        pass 

    c.execute("""
    CREATE TABLE IF NOT EXISTS feedback (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        category TEXT,
        subject TEXT,
        message TEXT,
        status TEXT DEFAULT 'pending',
        priority TEXT DEFAULT 'medium',
        assigned_to TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
    """)

    c.execute("""
    CREATE TABLE IF NOT EXISTS comments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        feedback_id INTEGER,
        user_id INTEGER,
        full_name TEXT,
        comment TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
    """)

    # 2. Check if Data Exists and Seed if Empty
    try:
        check = c.execute("SELECT count(*) FROM users").fetchone()[0]
        if check == 0:
            print("--- Seeding Rich Demo Data ---")
            users = [
                ("student", "student123", "student", "Student User", "student@nexus.edu", "555-0100"),
                ("dean", "dean123", "dean", "Dr. J Dean", "dean@nexus.edu", "555-0200"),
                ("faculty1", "faculty123", "faculty", "Prof. jaid ", "prof@nexus.edu", "555-0300"),
                ("admin", "admin123", "admin", "System Admin", "admin@nexus.edu", "555-0000"),
            ]

            for u, p, r, n, e, ph in users:
                c.execute("INSERT INTO users (username, password, role, full_name, email, phone) VALUES (?, ?, ?, ?, ?, ?)",
                          (u, generate_password_hash(p), r, n, e, ph))
            
            conn.commit()
            
            # Fetch IDs for relationships
            student_id = c.execute("SELECT id FROM users WHERE username='student'").fetchone()[0]
            dean_id = c.execute("SELECT id FROM users WHERE username='dean'").fetchone()[0]
            fac1_id = c.execute("SELECT id FROM users WHERE username='faculty1'").fetchone()[0]
            
            # Seed Feedback
            c.execute("""INSERT INTO feedback (user_id, category, subject, message, priority, status, assigned_to) 
                         VALUES (?, 'facility', 'Projector in Room 304 Malfunction', 
                         'The main projector keeps flickering and turning off every 5 minutes.', 
                         'high', 'processing', 'Prof. Alan Grant')""", (student_id,))
            fb1_id = c.lastrowid

            c.execute("""INSERT INTO feedback (user_id, category, subject, message, priority, status, assigned_to) 
                         VALUES (?, 'academic', 'Missing Grade for CS101 Midterm', 
                         'I submitted my midterm paper last week but the portal still shows "Not Submitted".', 
                         'medium', 'pending', NULL)""", (student_id,))

            c.execute("""INSERT INTO feedback (user_id, category, subject, message, priority, status, assigned_to) 
                         VALUES (?, 'administrative', 'Library ID Card Activation', 
                         'My ID card is not working at the library turnstile.', 
                         'low', 'resolved', 'Dr. J Dean')""", (student_id,))
            fb3_id = c.lastrowid

            # Seed Comments
            c.execute("INSERT INTO comments (feedback_id, user_id, full_name, comment) VALUES (?, ?, ?, ?)",
                      (fb1_id, dean_id, "Dr. J Dean", "Sarah, can you please prioritize this? Classes are ongoing."))
            
            c.execute("INSERT INTO comments (feedback_id, user_id, full_name, comment) VALUES (?, ?, ?, ?)",
                      (fb3_id, fac1_id, "Prof. Alan Grant", "Your card has been reactivated. Try again in 1 hour."))

    except sqlite3.OperationalError:
        print("Database structure exists, skipping seed.")

    conn.commit()
    conn.close()
    print("--- Database Ready ---")
