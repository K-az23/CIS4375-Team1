def register_blueprints(app):
    # Imported here rather than at the top of the file to avoid circular
    # imports, since route files import models that import the app's db.
    from .admin import admin_user_bp
    from .appointment import admin_appointment_bp, appointment_bp
    from .auth import auth_bp
    from .contact import contact_bp
    from .catalog import catalog_bp
    from .hairpiece_order import hairpiece_order_bp, admin_hairpiece_order_bp
    from .inventory import inventory_bp
    from .item_category import item_category_bp
    from .payment import admin_payment_bp, payment_bp, stripe_webhook_bp
    from .report import report_bp
    from .service import admin_service_bp, service_bp
    from .user import user_bp

    app.register_blueprint(auth_bp, url_prefix="/api/auth")
    app.register_blueprint(user_bp, url_prefix="/api/users")
    app.register_blueprint(service_bp, url_prefix="/api/services")
    app.register_blueprint(admin_service_bp, url_prefix="/api/admin/services")
    app.register_blueprint(admin_user_bp, url_prefix="/api/admin/users",)
    app.register_blueprint(payment_bp, url_prefix="/api/payments")
    app.register_blueprint(admin_payment_bp, url_prefix="/api/admin/payments")
    app.register_blueprint(stripe_webhook_bp, url_prefix="/api/webhooks")
    app.register_blueprint(item_category_bp, url_prefix="/api/admin/item-categories")
    app.register_blueprint(inventory_bp, url_prefix="/api/admin/inventory-items")
    app.register_blueprint(contact_bp, url_prefix="/api/contact")
    app.register_blueprint(appointment_bp, url_prefix="/api/appointments")
    app.register_blueprint(admin_appointment_bp, url_prefix="/api/admin/appointments")  
    app.register_blueprint(catalog_bp, url_prefix="/api/catalog")
    app.register_blueprint(hairpiece_order_bp, url_prefix="/api/hairpiece-orders")
    app.register_blueprint(
        admin_hairpiece_order_bp, url_prefix="/api/admin/hairpiece-orders"
        )
    app.register_blueprint(report_bp, url_prefix="/api/admin/reports")
