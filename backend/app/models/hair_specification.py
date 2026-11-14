from datetime import UTC, datetime

from ..extensions import db


def utc_now():
    return datetime.now(UTC).replace(tzinfo=None)


def timestamp(value):
    return value.replace(tzinfo=UTC).isoformat().replace('+00:00', 'Z') if value else None


# These are the customer's saved choices, separate from fitted systems and orders.
class HairSpecification(db.Model):
    __tablename__ = 'hair_specifications'

    specification_id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.user_id'), nullable=False)
    name = db.Column(db.String(100), nullable=False)
    name_key = db.Column(db.String(300), nullable=False)
    system_type = db.Column(db.String(10), nullable=False)
    hair_type = db.Column(db.String(20), nullable=False)
    base_type = db.Column(db.String(20), nullable=False)
    skin_type = db.Column(db.String(20), nullable=False)
    color_code = db.Column(db.String(10), nullable=False)
    grey_percentage = db.Column(db.Integer, nullable=False)
    density = db.Column(db.String(20), nullable=False)
    dimensions = db.Column(db.String(100), nullable=False)
    version = db.Column(db.Integer, nullable=False, default=1)
    created_at = db.Column(db.DateTime, nullable=False, default=utc_now)
    updated_at = db.Column(db.DateTime, nullable=False, default=utc_now)

    __table_args__ = (
        db.UniqueConstraint('user_id', 'name_key', name='unique_user_hair_specification_name'),
    )

    def to_dict(self):
        return {
            'specification_id': self.specification_id,
            'name': self.name,
            'system_type': self.system_type,
            'specs': {
                'hair_type': self.hair_type, 'base_type': self.base_type,
                'skin_thickness': self.skin_type, 'color': self.color_code,
                'grey_percent': self.grey_percentage, 'density': self.density,
                'dimensions': self.dimensions,
            },
            'version': self.version,
            'created_at': timestamp(self.created_at),
            'updated_at': timestamp(self.updated_at),
        }
