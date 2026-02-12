# run.py - Entry point for Flask backend server
from app import create_app
from flask import request, jsonify
from werkzeug.utils import secure_filename
from flask_cors import CORS
import pdfplumber
from docx import Document
import traceback

MAX_OUTLINE_PAGES = 6  # Only extract first N pages from PDFs; rest is ignored

app = create_app()
CORS(app, resources={r"/api/*": {"origins": "*"}})

@app.route("/api/extract-outline", methods=["POST"])
def extract_outline():
    """Extract text from uploaded PDF or Word file and return as plain text."""
    if 'file' not in request.files:
        return jsonify({"error": "No file uploaded"}), 400
    file = request.files['file']
    filename = secure_filename(file.filename)
    ext = filename.rsplit('.', 1)[-1].lower()
    try:
        if ext == 'pdf':
            # Extract text from PDF using pdfplumber (text + tables); only first N pages
            page_chunks = []
            with pdfplumber.open(file.stream) as pdf:
                for p in pdf.pages[:MAX_OUTLINE_PAGES]:
                    chunk = p.extract_text() or ""
                    # Also extract tables (grading schemes, schedules) and append as readable text
                    tables = p.extract_tables() or []
                    for table in tables:
                        if table:
                            rows = [" | ".join(str(c or "").strip() for c in row) for row in table if any(c for c in row)]
                            if rows:
                                chunk += "\n[Table]\n" + "\n".join(rows) + "\n"
                    page_chunks.append(chunk)
            text = "\n".join(page_chunks)

        elif ext in ('doc', 'docx'):
            # Extract text from Word document
            doc = Document(file)
            text = "\n".join(p.text for p in doc.paragraphs)
        else:
            return jsonify({"error": "Unsupported file type"}), 400
        return jsonify({"text": text})
    except Exception as e:
        traceback.print_exc()
        return jsonify({"error": str(e), "trace": traceback.format_exc()}), 500

if __name__ == "__main__":
    # Run Flask app in debug mode for development
    app.run(host='0.0.0.0', port=5001, debug=True)
