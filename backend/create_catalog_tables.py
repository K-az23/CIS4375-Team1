"""Create the two catalog tables after review with the database owner."""
import sys

from app import create_app
from app.extensions import db
from app.models.catalog_item import CatalogItem, CatalogOrder

if __name__ == '__main__':
    if '--apply' not in sys.argv:
        print('Review the catalog tables, then use --apply against the intended database.')
        raise SystemExit(0)
    app = create_app()
    with app.app_context():
        CatalogItem.__table__.create(db.engine, checkfirst=True)
        CatalogOrder.__table__.create(db.engine, checkfirst=True)
    print('Catalog tables are ready. Existing tables were not changed.')
