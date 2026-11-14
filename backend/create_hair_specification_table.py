"""Create the saved-choice table after review with the database owner."""
import sys

from app import create_app
from app.extensions import db
from app.models.hair_specification import HairSpecification

if __name__ == '__main__':
    if '--apply' not in sys.argv:
        print('Review the saved-choice table, then use --apply against the intended database.')
        raise SystemExit(0)
    app = create_app()
    with app.app_context():
        HairSpecification.__table__.create(db.engine, checkfirst=True)
    print('Saved-choice table is ready. Existing tables were not changed.')
