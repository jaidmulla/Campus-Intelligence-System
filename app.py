from flask import Flask, render_template, request, jsonify, session
from flask_cors import CORS
from database import init_db, get_db
from werkzeug.security import generate_password_hash, check_password_hash
import json

# ---------------- CONFIGURATION ----------------
app = Flask(__name__)
app.secret_key = "super_secret_key_nexus_v2"
CORS(app, supports_credentials=True)

# ---------------- ROUTES ----------------
@app.route("/")
def index():
    return render_template('index.html')

@app.route("/api/session", methods=["GET"])
def check_session():
    if "user_id" in session:
        return jsonify({
            "success": True, 
            "user": {
                "id": session["user_id"],
                "username": session["username"],
                "role": session["role"],
                "full_name": session["full_name"]
            }
        })
    return jsonify({"success": False})

@app.route("/api/login", methods=["POST"])
def login():
    data = request.get_json()
    conn = get_db()
    user = conn.execute("SELECT * FROM users WHERE username=?", (data["username"],)).fetchone()
    conn.close()

    if user and check_password_hash(user["password"], data["password"]):
        session["user_id"] = user["id"]
        session["username"] = user["username"]
        session["role"] = user["role"]
        session["full_name"] = user["full_name"]
        return jsonify({
            "success": True, 
            "user": {
                "id": user["id"],
                "username": user["username"],
                "role": user["role"],
                "full_name": user["full_name"]
            }
        })
    return jsonify({"success": False, "error": "Invalid credentials"}), 401

@app.route("/api/logout", methods=["POST"])
def logout():
    session.clear()
    return jsonify({"success": True})

@app.route("/api/stats", methods=["GET"])
def stats():
    if "user_id" not in session: 
        return jsonify({"error": "Auth required"}), 401
    conn = get_db()
    total = conn.execute("SELECT COUNT(*) FROM feedback").fetchone()[0]
    pending = conn.execute("SELECT COUNT(*) FROM feedback WHERE status='pending'").fetchone()[0]
    resolved = conn.execute("SELECT COUNT(*) FROM feedback WHERE status='resolved'").fetchone()[0]
    processing = conn.execute("SELECT COUNT(*) FROM feedback WHERE status='processing'").fetchone()[0]
    conn.close()
    return jsonify({"total": total, "pending": pending, "resolved": resolved, "processing": processing})

@app.route("/api/feedback", methods=["GET", "POST"])
def feedback():
    if "user_id" not in session: 
        return jsonify({"error": "Auth required"}), 401
    conn = get_db()

    if request.method == "POST":
        d = request.get_json()
        conn.execute("INSERT INTO feedback (user_id, category, subject, message, priority) VALUES (?,?,?,?,?)",
                     (session["user_id"], d["category"], d["subject"], d["message"], d["priority"]))
        conn.commit()
        conn.close()
        return jsonify({"success": True})

    query = "SELECT f.*, u.full_name as author_role FROM feedback f JOIN users u ON f.user_id = u.id"
    args = []
    
    if session["role"] == "student":
        query += " WHERE f.user_id = ?"
        args.append(session["user_id"])
    
    query += " ORDER BY f.created_at DESC"
    
    rows = conn.execute(query, args).fetchall()
    data = []
    for r in rows:
        item = dict(r)
        if session["role"] != "admin" and session["role"] != "dean" and item["user_id"] != session["user_id"]:
             item["author_role"] = "Anonymous Student"
        data.append(item)
             
    conn.close()
    return jsonify(data)

@app.route("/api/feedback/<int:fid>", methods=["GET", "PUT"])
def feedback_item(fid):
    if "user_id" not in session: 
        return jsonify({"error": "Auth required"}), 401
    conn = get_db()

    if request.method == "PUT":
        d = request.get_json()
        if session["role"] == "faculty":
            task = conn.execute("SELECT assigned_to FROM feedback WHERE id=?", (fid,)).fetchone()
            if not task or task["assigned_to"] != session["full_name"]:
                conn.close()
                return jsonify({"error": "Not assigned to you"}), 403
            conn.execute("UPDATE feedback SET status=?, updated_at=CURRENT_TIMESTAMP WHERE id=?", (d["status"], fid))
        else:
            conn.execute("UPDATE feedback SET status=?, priority=?, assigned_to=?, updated_at=CURRENT_TIMESTAMP WHERE id=?",
                         (d["status"], d["priority"], d["assigned_to"], fid))
        conn.commit()
        conn.close()
        return jsonify({"success": True})

    item = conn.execute("SELECT f.*, u.full_name as author_role FROM feedback f JOIN users u ON f.user_id = u.id WHERE f.id=?", (fid,)).fetchone()
    comments = conn.execute("SELECT * FROM comments WHERE feedback_id=? ORDER BY created_at", (fid,)).fetchall()
    
    conn.close()
    if not item: 
        return jsonify({"error": "Not found"}), 404
    
    res = dict(item)
    res["comments"] = [dict(c) for c in comments]
    return jsonify(res)

@app.route("/api/feedback/<int:fid>/comments", methods=["POST"])
def add_comment(fid):
    if "user_id" not in session: 
        return jsonify({"error": "Auth required"}), 401
    d = request.get_json()
    conn = get_db()
    conn.execute("INSERT INTO comments (feedback_id, user_id, full_name, comment) VALUES (?,?,?,?)",
                 (fid, session["user_id"], session["full_name"], d["comment"]))
    conn.commit()
    conn.close()
    return jsonify({"success": True})

# --- FACULTY MANAGEMENT ---
@app.route("/api/users/faculty", methods=["GET"])
def get_faculty_list():
    if "user_id" not in session: 
        return jsonify({"error": "Unauthorized"}), 401
    conn = get_db()
    users = conn.execute("SELECT id, full_name, email, phone FROM users WHERE role='faculty'").fetchall()
    conn.close()
    return jsonify([dict(u) for u in users])

@app.route("/api/users/add-faculty", methods=["POST"])
def add_faculty_api():
    if "user_id" not in session or session["role"] != "dean": 
        return jsonify({"error": "Unauthorized"}), 403
    d = request.get_json()
    conn = get_db()
    try:
        conn.execute("INSERT INTO users (username, password, role, full_name, email, phone) VALUES (?,?,?,?,?,?)",
                     (d["username"], generate_password_hash(d["password"]), "faculty", d["full_name"], d.get("email"), d.get("phone")))
        conn.commit()
        return jsonify({"success": True})
    except sqlite3.IntegrityError:
        return jsonify({"error": "Username taken"}), 400
    finally:
        conn.close()

@app.route("/api/faculty-stats", methods=["GET"])
def faculty_stats_api():
    if "user_id" not in session or session["role"] != "dean": 
        return jsonify({"error": "Unauthorized"}), 403
    conn = get_db()
    users = conn.execute("SELECT id, full_name, username, email, phone FROM users WHERE role='faculty'").fetchall()
    stats = []
    for u in users:
        total = conn.execute("SELECT COUNT(*) FROM feedback WHERE assigned_to=?", (u["full_name"],)).fetchone()[0]
        resolved = conn.execute("SELECT COUNT(*) FROM feedback WHERE assigned_to=? AND status='resolved'", (u["full_name"],)).fetchone()[0]
        stats.append({
            "id": u["id"],
            "name": u["full_name"],
            "username": u["username"],
            "email": u["email"],
            "phone": u["phone"],
            "total_assigned": total,
            "resolved": resolved,
            "pending": total - resolved
        })
    conn.close()
    return jsonify(stats)

@app.route("/api/users/<int:uid>", methods=["DELETE"])
def delete_user_api(uid):
    if "user_id" not in session or session["role"] != "dean": 
        return jsonify({"error": "Unauthorized"}), 403
    conn = get_db()
    name_row = conn.execute("SELECT full_name FROM users WHERE id=?", (uid,)).fetchone()
    if name_row:
        name = name_row["full_name"]
        conn.execute("UPDATE feedback SET assigned_to=NULL WHERE assigned_to=?", (name,))
        conn.execute("DELETE FROM users WHERE id=?", (uid,))
        conn.commit()
    conn.close()
    return jsonify({"success": True})

@app.route("/api/faculty/tasks", methods=["GET"])
def my_tasks_api():
    if "user_id" not in session or session["role"] != "faculty": 
        return jsonify({"error": "Unauthorized"}), 403
    conn = get_db()
    tasks = conn.execute("SELECT * FROM feedback WHERE assigned_to=? AND status!='resolved' ORDER BY priority='high' DESC", (session["full_name"],)).fetchall()
    conn.close()
    return jsonify([dict(t) for t in tasks])

if __name__ == "__main__":
    init_db()
    print("Starting Flask server on http://localhost:5001")
    app.run(debug=True, port=5001)
    