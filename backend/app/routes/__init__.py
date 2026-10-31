def register_blueprints(app):
    # Imported here rather than at the top of the file to avoid circular
    # imports, since route files import models that import the app's db.
    from .auth import auth_bp
    from .admin import admin_user_bp
    from .service import admin_service_bp, service_bp
    from .user import user_bp


    app.register_blueprint(auth_bp, url_prefix="/api/auth")
    app.register_blueprint(user_bp, url_prefix="/api/users")
    app.register_blueprint(service_bp, url_prefix="/api/services")
    app.register_blueprint(admin_service_bp, url_prefix="/api/admin/services")
    app.register_blueprint(admin_user_bp, url_prefix="/api/admin/users",)
