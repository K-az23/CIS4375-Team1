import os
from flask import Flask, jsonify
from flask_cors import CORS
from dotenv import load_dotenv


def create_app():
    load_dotenv()
    app = Flask(__name__)
    CORS(app, origins=[os.getenv("CLIENT_URL", "http://localhost:5173")])

    @app.get("/api/health")
    def health():
        return jsonify(status="ok")

    return app