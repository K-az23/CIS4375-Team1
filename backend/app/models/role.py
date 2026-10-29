from ..extensions import db


class Role(db.Model):
    __tablename__ = "roles"

    role_id = db.Column(db.Integer, primary_key=True, autoincrement=True,)

    name = db.Column(db.String(20), nullable=False, unique=True,)

    # this will be used as a relationship helper, it is not a db column
    # makes routing easier for pulling user to roles
    users = db.relationship("User", back_populates="role",)

    def to_dict(self):
        return {
            "role_id": self.role_id,
            "name": self.name,
        }