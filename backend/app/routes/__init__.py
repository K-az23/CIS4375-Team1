def register_blueprints(app):
    # Import the routes here so the app can finish setting itself up first.
    from .admin import admin_user_bp
    from .appointment import (
        admin_appointment_bp,
        appointment_bp,
        order_appointment_bp,
    )
    from .auth import auth_bp
    from .catalog import admin_catalog_bp, catalog_bp
    from .contact import contact_bp
    from .hairpiece_order import (
        admin_hairpiece_order_bp,
        hairpiece_order_bp,
    )
    from .inventory import inventory_bp
    from .item_category import item_category_bp
    from .payment import (
        admin_payment_bp,
        payment_bp,
        stripe_webhook_bp,
    )
    from .report import report_bp
    from .service import admin_service_bp, service_bp
    from .service_material import service_material_bp
    from .tracking_routes import purchasing_bp
    from .user import user_bp

    # Connect login, contact, and customer account routes.
    app.register_blueprint(auth_bp, url_prefix="/api/auth")
    app.register_blueprint(contact_bp, url_prefix="/api/contact")
    app.register_blueprint(user_bp, url_prefix="/api/users")
    app.register_blueprint(admin_user_bp, url_prefix="/api/admin/users")

    # Connect services, catalog products, and service materials.
    app.register_blueprint(service_bp, url_prefix="/api/services")
    app.register_blueprint(admin_service_bp, url_prefix="/api/admin/services")
    app.register_blueprint(catalog_bp, url_prefix="/api/catalog")
    app.register_blueprint(admin_catalog_bp, url_prefix="/api/admin/catalog")
    app.register_blueprint(service_material_bp, url_prefix="/api/admin/services")

    # Connect appointments and the orders linked to them.
    app.register_blueprint(appointment_bp, url_prefix="/api/appointments")
    app.register_blueprint(
        admin_appointment_bp,
        url_prefix="/api/admin/appointments",
    )
    app.register_blueprint(
        order_appointment_bp,
        url_prefix="/api/hairpiece-orders",
    )
    app.register_blueprint(hairpiece_order_bp, url_prefix="/api/hairpiece-orders")
    app.register_blueprint(
        admin_hairpiece_order_bp,
        url_prefix="/api/admin/hairpiece-orders",
    )

    # Connect payments and the Stripe event receiver.
    app.register_blueprint(payment_bp, url_prefix="/api/payments")
    app.register_blueprint(admin_payment_bp, url_prefix="/api/admin/payments")
    app.register_blueprint(stripe_webhook_bp, url_prefix="/api/webhooks")

    # Connect inventory, purchasing, and reports.
    app.register_blueprint(
        item_category_bp,
        url_prefix="/api/admin/item-categories",
    )
    app.register_blueprint(
        inventory_bp,
        url_prefix="/api/admin/inventory-items",
    )
    app.register_blueprint(purchasing_bp)
    app.register_blueprint(report_bp, url_prefix="/api/admin/reports")