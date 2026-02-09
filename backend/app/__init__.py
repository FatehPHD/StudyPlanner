# __init__.py - Flask app factory and API endpoints
from dotenv import load_dotenv
load_dotenv()
import os
from flask import Flask, request, jsonify
from flask_cors import CORS
from .services.gpt_client import parse_outline_with_gpt, analyze_outline_for_questions, pre_process_outline, ANALYSIS_PROMPT, client
import psycopg2
import psycopg2.extras
import uuid

def get_db_conn():
    # Use DATABASE_URL from environment (set by Supabase)
    return psycopg2.connect(os.environ["DATABASE_URL"], cursor_factory=psycopg2.extras.RealDictCursor)

def is_admin(user_id):
    """Check if the user is an admin by looking up profiles table."""
    with get_db_conn() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT is_admin FROM profiles WHERE user_id = %s", (user_id,))
            row = cur.fetchone()
            return row and row["is_admin"]

def create_app():
    """Create and configure the Flask app."""
    app = Flask(__name__)
    CORS(app, resources={r"/api/*": {"origins": "*"}})
    openai_key = os.getenv("OPENAI_API_KEY")
    if not openai_key:
        app.logger.warning("Missing OPENAI_API_KEY: using mock data for parse-outline endpoint.")

    @app.route("/api/debug-analyze", methods=["POST"])
    def debug_analyze():
        """Debug endpoint to see what GPT is returning."""
        outline = request.json.get("outlineText", "")
        result = analyze_outline_for_questions(outline)
        
        # Also get the raw GPT response for debugging
        if outline.strip():
            outline_text = pre_process_outline(outline)
            messages = [
                {"role": "system", "content": ANALYSIS_PROMPT},
                {"role": "user", "content": outline_text}
            ]
            resp = client.chat.completions.create(
                model="gpt-4o-mini",
                messages=messages,
                temperature=0.1
            )
            raw_response = resp.choices[0].message.content or ""
        else:
            raw_response = "No outline provided"
        
        return jsonify({
            "result": result,
            "raw_gpt_response": raw_response,
            "outline_preprocessed": outline_text if outline.strip() else ""
        })

    # --- New conversational parsing endpoints ---
    @app.route("/api/analyze-outline", methods=["POST"])
    def analyze_outline():
        """Analyze outline and return questions if needed."""
        outline = request.json.get("outlineText", "")
        result = analyze_outline_for_questions(outline)
        return jsonify(result)

    @app.route("/api/parse-outline-with-answers", methods=["POST"])
    def parse_outline_with_answers():
        """Parse outline with clarifying answers."""
        outline = request.json.get("outlineText", "")
        answers = request.json.get("answers", [])
        items = parse_outline_with_gpt(outline, answers)
        return jsonify(items)

    # --- Existing endpoints ---
    @app.route("/api/parse-outline", methods=["POST"])
    def parse_outline():
        outline = request.json.get("outlineText", "")
        items = parse_outline_with_gpt(outline)
        return jsonify(items)

    @app.route("/api/test", methods=["GET"])
    def test():
        return jsonify({"message": "Server is working!", "status": "success"})

    @app.route("/", methods=["GET"])
    def root():
        return jsonify({"message": "Flask server is running!", "endpoints": ["/api/test", "/api/parse-outline", "/api/upload-outline"]})

    @app.route("/api/upload-outline", methods=["POST"])
    def upload_outline():
        if 'file' not in request.files:
            return jsonify({'error': 'No file part'}), 400
        file = request.files['file']
        if file.filename == '':
            return jsonify({'error': 'No selected file'}), 400
        try:
            content = file.read().decode('utf-8')
        except Exception as e:
            return jsonify({'error': f'Failed to read file: {str(e)}'}), 400
        items = parse_outline_with_gpt(content)
        return jsonify(items)

    # --- Admin-only endpoints ---
    # Helper: get user_id from header (in production, use JWT auth)
    def get_user_id():
        return request.headers.get("X-User-Id")

    # User Management: List all users
    @app.route("/api/admin/users", methods=["GET"])
    def admin_list_users():
        user_id = get_user_id()
        if not is_admin(user_id):
            return jsonify({"error": "Admin access required"}), 403
        with get_db_conn() as conn:
            with conn.cursor() as cur:
                cur.execute("""
                    SELECT u.id, u.email, p.is_admin, p.created_at
                    FROM auth.users u
                    LEFT JOIN profiles p ON u.id = p.user_id
                    ORDER BY p.created_at DESC
                """)
                users = cur.fetchall()
        return jsonify(users)

    # User Management: Edit user (admin can set is_admin)
    @app.route("/api/admin/users/<uuid:user_id>", methods=["PATCH"])
    def admin_edit_user(user_id):
        admin_id = get_user_id()
        if not is_admin(admin_id):
            return jsonify({"error": "Admin access required"}), 403
        data = request.json
        with get_db_conn() as conn:
            with conn.cursor() as cur:
                cur.execute("UPDATE profiles SET is_admin = %s WHERE user_id = %s RETURNING *", (data.get("is_admin", False), str(user_id)))
                updated = cur.fetchone()
        return jsonify(updated)

    # User Management: Delete user (removes from auth and profiles)
    @app.route("/api/admin/users/<uuid:user_id>", methods=["DELETE"])
    def admin_delete_user(user_id):
        admin_id = get_user_id()
        if not is_admin(admin_id):
            return jsonify({"error": "Admin access required"}), 403
        with get_db_conn() as conn:
            with conn.cursor() as cur:
                cur.execute("DELETE FROM profiles WHERE user_id = %s", (str(user_id),))
                cur.execute("DELETE FROM auth.users WHERE id = %s", (str(user_id),))
        return jsonify({"status": "deleted"})

    # Course Management: List all courses
    @app.route("/api/admin/courses", methods=["GET"])
    def admin_list_courses():
        user_id = get_user_id()
        if not is_admin(user_id):
            return jsonify({"error": "Admin access required"}), 403
        with get_db_conn() as conn:
            with conn.cursor() as cur:
                cur.execute("SELECT * FROM courses ORDER BY inserted_at DESC")
                courses = cur.fetchall()
        return jsonify(courses)

    # Course Management: Edit course
    @app.route("/api/admin/courses/<int:course_id>", methods=["PATCH"])
    def admin_edit_course(course_id):
        admin_id = get_user_id()
        if not is_admin(admin_id):
            return jsonify({"error": "Admin access required"}), 403
        data = request.json
        with get_db_conn() as conn:
            with conn.cursor() as cur:
                cur.execute("UPDATE courses SET title = %s WHERE id = %s RETURNING *", (data.get("title"), course_id))
                updated = cur.fetchone()
        return jsonify(updated)

    # Course Management: Delete course
    @app.route("/api/admin/courses/<int:course_id>", methods=["DELETE"])
    def admin_delete_course(course_id):
        admin_id = get_user_id()
        if not is_admin(admin_id):
            return jsonify({"error": "Admin access required"}), 403
        with get_db_conn() as conn:
            with conn.cursor() as cur:
                cur.execute("DELETE FROM courses WHERE id = %s", (course_id,))
        return jsonify({"status": "deleted"})

    # Analytics: Get counts of users, courses, todos
    @app.route("/api/admin/analytics", methods=["GET"])
    def admin_analytics():
        user_id = get_user_id()
        if not is_admin(user_id):
            return jsonify({"error": "Admin access required"}), 403
        with get_db_conn() as conn:
            with conn.cursor() as cur:
                cur.execute("SELECT COUNT(*) FROM auth.users")
                user_count = cur.fetchone()["count"]
                cur.execute("SELECT COUNT(*) FROM courses")
                course_count = cur.fetchone()["count"]
                cur.execute("SELECT COUNT(*) FROM todos")
                todo_count = cur.fetchone()["count"]
        return jsonify({"users": user_count, "courses": course_count, "todos": todo_count})

    # Moderation: Placeholder endpoint
    @app.route("/api/admin/moderation", methods=["GET"])
    def admin_moderation():
        user_id = get_user_id()
        if not is_admin(user_id):
            return jsonify({"error": "Admin access required"}), 403
        # Placeholder: return empty moderation queue
        return jsonify({"reports": []})

    # Settings: Placeholder endpoint
    @app.route("/api/admin/settings", methods=["GET", "POST"])
    def admin_settings():
        user_id = get_user_id()
        if not is_admin(user_id):
            return jsonify({"error": "Admin access required"}), 403
        # Placeholder: return static settings
        if request.method == "GET":
            return jsonify({"maintenance_mode": False})
        else:
            # Accept and echo settings (not persisted)
            return jsonify(request.json)

    @app.route("/api/profiles/<user_id>", methods=["GET"])
    def get_profile(user_id):
        # Remove angle brackets if present
        user_id = user_id.strip('<>')
        try:
            with get_db_conn() as conn:
                with conn.cursor() as cur:
                    cur.execute("SELECT * FROM profiles WHERE user_id = %s", (user_id,))
                    profile = cur.fetchone()
        except Exception as e:
            return jsonify({"error": str(e)}), 500
        if not profile:
            return jsonify({"error": "Profile not found"}), 404
        # Convert to plain dict with JSON-serializable types (UUID, datetime)
        out = dict(profile)
        for k, v in list(out.items()):
            if hasattr(v, 'hex'):  # UUID
                out[k] = str(v)
            elif hasattr(v, 'isoformat'):  # datetime
                out[k] = v.isoformat() if v else None
        return jsonify(out)

    return app
