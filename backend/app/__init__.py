import os
from flask import Flask, request, jsonify
from flask_cors import CORS
from .services.gpt_client import parse_outline_with_gpt

def create_app():
    app = Flask(__name__)
    # enable CORS for all /api/* endpoints
    CORS(app, resources={r"/api/*": {"origins": "*"}})
    
    # Load OpenAI API key; if missing, log a warning and use mock responses
    openai_key = os.getenv("OPENAI_API_KEY")
    if not openai_key:
        app.logger.warning("Missing OPENAI_API_KEY: using mock data for parse-outline endpoint.")
    
    @app.route("/api/parse-outline", methods=["POST"])
    def parse_outline():
        outline = request.json.get("outlineText", "")
        items = parse_outline_with_gpt(outline)
        return jsonify(items)

    return app
