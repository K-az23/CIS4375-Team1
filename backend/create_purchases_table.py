"""Create the supplier purchasing table after review with the database owner."""
import sys

from app import create_app
from app.extensions import db
from app.models.purchase import Purchase

if __name__ == '__main__':
    if '--apply' not in sys.argv:
        print('Review the new purchases table, then use --apply against the intended database.')
        raise SystemExit(0)
    app = create_app()
    with app.app_context():
        Purchase.__table__.create(bind=db.engine, checkfirst=True)
    print('Purchases table is ready. Existing tables were not changed.')
