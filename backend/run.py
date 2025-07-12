# run.py
from app import create_app
from flask import request, jsonify
from werkzeug.utils import secure_filename
from flask_cors import CORS

# PDF & Word parsers
from pdfminer.high_level import extract_text_to_fp
from docx import Document
from io import StringIO
import traceback

app = create_app()
CORS(app, resources={r"/api/*": {"origins": "*"}})

@app.route("/api/extract-outline", methods=["POST"])
def extract_outline():
    if 'file' not in request.files:
        return jsonify({"error": "No file uploaded"}), 400

    file = request.files['file']
    filename = secure_filename(file.filename)
    ext = filename.rsplit('.', 1)[-1].lower()

    try:
        if ext == 'pdf':
            # Read PDF from the uploaded stream into text
            output = StringIO()
            # file.stream is a file-like for pdfminer
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
        return jsonify({
            "error": str(e),
            "trace": traceback.format_exc()
        }), 500

if __name__ == "__main__":
    # Debug mode on so you see errors in the console
    app.run(port=5000, debug=True)
