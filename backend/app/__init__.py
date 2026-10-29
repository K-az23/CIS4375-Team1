from flask import Flask, jsonify
from flask_cors import CORS
from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError

# Brings all model classes so SQLAlchemy will register their mappings
# and resolve the relationships between the models
from . import models as models
from .config import Config
from .extensions import db
from .routes import register_blueprints


def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)
    CORS(app, origins=[app.config["CLIENT_URL"]])
    db.init_app(app)
    register_blueprints(app)

    @app.get("/api/health")
    def health():
        return jsonify(status="ok")

    @app.get("/api/health/db")
    def health_db():
        try:
            db.session.execute(text("SELECT 1"))
            return jsonify(database="connected")
        except SQLAlchemyError as e:
            detail = str(e) if app.debug else "Database unavailable"
            return jsonify(database="error", detail=detail), 500

    return app