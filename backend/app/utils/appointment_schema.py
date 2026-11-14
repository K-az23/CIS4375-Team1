"""Small, repeatable upgrade for the appointment fields used by this integration."""
from pathlib import Path
import sqlite3
from sqlalchemy import inspect


def upgrade_appointments(engine):
    from ..models.appointments import Appointment
    from ..models.order_appointment import OrderAppointment

    inspector = inspect(engine)
    if not inspector.has_table('appointments'):
        Appointment.__table__.create(engine)
    else:
        columns = {column['name']: column for column in inspector.get_columns('appointments')}
        dialect = engine.dialect.name
        if dialect == 'sqlite' and not columns['user_id']['nullable']:
            _upgrade_old_sqlite(engine, columns)
        else:
            additions = {
                'customer_name': 'VARCHAR(200) NULL',
                'customer_email': 'VARCHAR(255) NULL',
                'customer_phone': 'VARCHAR(25) NULL',
                'setmore_synced': 'BOOLEAN NOT NULL DEFAULT 0',
                'setmore_missing': 'BOOLEAN NOT NULL DEFAULT 0',
            }
            if dialect not in ('sqlite', 'mysql'):
                raise RuntimeError('This upgrade supports SQLite and MySQL only.')
            with engine.begin() as connection:
                for name, definition in additions.items():
                    if name not in columns:
                        connection.exec_driver_sql(f'ALTER TABLE appointments ADD COLUMN {name} {definition}')
                if dialect == 'mysql' and not columns['user_id']['nullable']:
                    connection.exec_driver_sql('ALTER TABLE appointments MODIFY COLUMN user_id INTEGER NULL')
    OrderAppointment.__table__.create(engine, checkfirst=True)


def _upgrade_old_sqlite(engine, columns):
    # SQLite cannot change a required column to optional in place.
    # Back up the file, copy every row into the updated table, and keep all IDs.
    expected = {
        'setmore_booking_id', 'service_id', 'user_id', 'appointment_time', 'status',
        'cancellation_fee_charged', 'long_hair_surcharge', 'customer_name',
        'customer_email', 'customer_phone', 'setmore_synced', 'setmore_missing',
    }
    if not set(columns).issubset(expected):
        raise RuntimeError('Appointments has extra columns. Review the upgrade before running it.')

    connection = engine.raw_connection()
    raw = connection.driver_connection
    cursor = raw.cursor()
    foreign_keys = cursor.execute('PRAGMA foreign_keys').fetchone()[0]
    try:
        database = engine.url.database
        if database and database != ':memory:':
            backup = Path(database + '.before-tfc263.bak')
            if not backup.exists():
                with sqlite3.connect(str(backup)) as target:
                    raw.backup(target)
        indexes = cursor.execute("SELECT sql FROM sqlite_master WHERE tbl_name='appointments' AND type IN ('index', 'trigger') AND sql IS NOT NULL").fetchall()
        cursor.execute('PRAGMA foreign_keys=OFF')
        cursor.execute('BEGIN IMMEDIATE')
        cursor.execute('''CREATE TABLE appointments_tfc263_new (
            setmore_booking_id VARCHAR(100) PRIMARY KEY NOT NULL,
            service_id INTEGER NOT NULL REFERENCES services(service_id),
            user_id INTEGER NULL REFERENCES users(user_id),
            appointment_time DATETIME NOT NULL,
            status VARCHAR(30) NOT NULL,
            cancellation_fee_charged BOOLEAN NOT NULL DEFAULT 0,
            long_hair_surcharge BOOLEAN NOT NULL DEFAULT 0,
            customer_name VARCHAR(200) NULL,
            customer_email VARCHAR(255) NULL,
            customer_phone VARCHAR(25) NULL,
            setmore_synced BOOLEAN NOT NULL DEFAULT 0,
            setmore_missing BOOLEAN NOT NULL DEFAULT 0
        )''')
        names = ['setmore_booking_id', 'service_id', 'user_id', 'appointment_time', 'status',
                 'cancellation_fee_charged', 'long_hair_surcharge', 'customer_name',
                 'customer_email', 'customer_phone', 'setmore_synced', 'setmore_missing']
        values = []
        for name in names:
            if name in ('cancellation_fee_charged', 'long_hair_surcharge', 'setmore_synced', 'setmore_missing'):
                values.append(f'COALESCE({name}, 0)' if name in columns else '0')
            else:
                values.append(name if name in columns else 'NULL')
        cursor.execute(f"INSERT INTO appointments_tfc263_new ({', '.join(names)}) SELECT {', '.join(values)} FROM appointments")
        cursor.execute('DROP TABLE appointments')
        cursor.execute('ALTER TABLE appointments_tfc263_new RENAME TO appointments')
        for (statement,) in indexes:
            cursor.execute(statement)
        raw.commit()
    except Exception:
        raw.rollback()
        raise
    finally:
        cursor.execute(f'PRAGMA foreign_keys={int(foreign_keys)}')
        cursor.close()
        connection.close()
    engine.dispose()
