"""Run once against the intended team database before using the new appointment fields."""
import sys
from app import create_app
from app.extensions import db
from app.utils.appointment_schema import upgrade_appointments

if __name__ == '__main__':
    if '--apply' not in sys.argv:
        print('Review this upgrade with the database owner, then run with --apply against the intended database.')
        raise SystemExit(0)
    app = create_app()
    with app.app_context():
        upgrade_appointments(db.engine)
    print('Appointment schema upgrade finished.')
