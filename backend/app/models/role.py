from ..extensions import db


class Role(db.Model):
    __tablename__ = "roles"

    role_id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(20), nullable=False, unique=True)

    users = db.relationship("User", back_populates="role")

    def to_admin_dict(self):
        return {"role_id": self.role_id, "name": self.name}