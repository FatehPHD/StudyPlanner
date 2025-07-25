# run.py - Entry point for Flask backend server
from app import create_app
from flask import request, jsonify
from werkzeug.utils import secure_filename
from flask_cors import CORS
from pdfminer.high_level import extract_text_to_fp
from docx import Document
from io import StringIO
import traceback

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
            # Extract text from PDF
            output = StringIO()
            extract_text_to_fp(file.stream, output)
            text = output.getvalue()
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
    app.run(host='0.0.0.0', port=5000, debug=True)
