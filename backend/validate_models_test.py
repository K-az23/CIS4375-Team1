from sqlalchemy.exc import SQLAlchemyError

from app import create_app
from app.extensions import db
from app.models import (
    Appointment,
    HairpieceOrder,
    InventoryItem,
    ItemCategory,
    Payment,
    RestockLog,
    Role,
    Service,
    ServiceItem,
    UsageLog,
    User,
)

app = create_app()

models = [
    Role,
    User,
    Service,
    ItemCategory,
    InventoryItem,
    HairpieceOrder,
    Appointment,
    Payment,
    ServiceItem,
    UsageLog,
    RestockLog,
]


with app.app_context():
    for model in models:
        try:
            # Read-only validation query.
            # This checks whether the SQLAlchemy model can successfully
            # query its corresponding database table without changing data.
            db.session.execute(
                db.select(model).limit(1)
            ).scalar_one_or_none()

            print(f"PASS: {model.__name__}")

        except SQLAlchemyError as error:
            print(f"FAIL: {model.__name__}")
            print(error)