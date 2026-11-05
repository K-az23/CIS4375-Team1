from ..extensions import db
from ..models import ItemCategory

MAX_CATEGORY_NAME_LENGTH = 100
MAX_DESCRIPTION_LENGTH = 255


# cleans and standardizes inputs
def validate_item_category_data(data, partial=False):
    fields = {}
    errors = {}

    if "category_name" in data or not partial:
        category_name = data.get("category_name")

        if not isinstance(category_name, str) or not category_name.strip():
            errors["category_name"] = "Category name is required"
        elif len(category_name.strip()) > MAX_CATEGORY_NAME_LENGTH:
            errors["category_name"] = (
                f"Category name must be {MAX_CATEGORY_NAME_LENGTH} characters or fewer"
            )
        else:
            fields["category_name"] = category_name.strip()

    if "description" in data:
        description = data.get("description")

        if description is None:
            fields["description"] = None
        elif not isinstance(description, str):
            errors["description"] = "Description must be text"
        elif len(description.strip()) > MAX_DESCRIPTION_LENGTH:
            errors["description"] = (
                f"Description must be {MAX_DESCRIPTION_LENGTH} characters or fewer"
            )
        else:
            fields["description"] = description.strip() or None

        # to allow active status changes from deactivated, only giving option if frontend wants to use
    if partial and "is_active" in data:
        is_active = data.get("is_active")

        if not isinstance(is_active, bool):
            errors["is_active"] = "is_active must be true or false"
        else:
            fields["is_active"] = is_active

    return fields, errors

# a check for whether another category already uses the name
def category_name_taken(category_name, exclude_category_id=None):
    query = db.select(ItemCategory).where(ItemCategory.category_name == category_name)

    if exclude_category_id is not None:
        query = query.where(ItemCategory.category_id != exclude_category_id)

    return db.session.execute(query).scalar_one_or_none() is not None