# load .env into os.environ (requires python-dotenv)
from dotenv import load_dotenv
load_dotenv()

import os
from flask import Flask, request, jsonify
from flask_cors import CORS
from .services.gpt_client import parse_outline_with_gpt

def create_app():
    app = Flask(__name__)

    # enable CORS on all /api/* routes
    CORS(app, resources={r"/api/*": {"origins": "*"}})

    # Check for API key
    openai_key = os.getenv("OPENAI_API_KEY")
    if not openai_key:
        app.logger.warning(
            "Missing OPENAI_API_KEY: using mock data for parse-outline endpoint."
        )

    @app.route("/api/parse-outline", methods=["POST"])
    def parse_outline():
        outline = request.json.get("outlineText", "")
        items = parse_outline_with_gpt(outline)
        return jsonify(items)

    return app
