def register_blueprints(app):
    # Imported here rather than at the top of the file to avoid circular
    # imports, since route files import models that import the app's db.
    from .service import service_bp

    app.register_blueprint(service_bp, url_prefix="/api/services")