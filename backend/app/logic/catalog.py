from decimal import Decimal

# Approved to hardcode: options and prices change rarely and only Natasha sets them.
SHIPPING_DAYS = 10

AREA_SYSTEM = "area"
FULL_SYSTEM = "full"

SYSTEM_TYPES = {
    AREA_SYSTEM: {"label": "Hair loss area system", "price": Decimal("400.00")},
    # Full systems are priced after a consultation, starting at this amount.
    FULL_SYSTEM: {"label": "Full custom system", "price": Decimal("650.00")},
}

HAIR_OPTIONS = {
    "hair_type": ["Wavy", "Curly", "Straight"],
    "base_type": ["Skin", "Lace"],
    "skin_thickness": ["Thin (.02mm)", "Thick (.08mm)"],
    "color": ["#1", "#2", "#3", "#4", "#5", "#6", "#7"],
    "grey_percent": [0, 10, 20, 30, 40, 50, 60, 70, 80],
    "density": ["Light", "Medium", "Heavy"],
    "dimensions": ["6 x 8", "7 x 9", "8 x 10"],
}

# Catalog field -> hairpiece_orders column.
SPEC_COLUMNS = {
    "hair_type": "hair_type",
    "base_type": "base_type",
    "skin_thickness": "skin_type",
    "color": "color_code",
    "grey_percent": "grey_percentage",
    "density": "density",
    "dimensions": "dimensions",
}

MAX_CUSTOM_DIMENSIONS_LENGTH = 100


def catalog_dict():
    """The public catalog: system types, options and shipping time."""
    return {
        "system_types": [
            {"key": key, "label": info["label"], "price": float(info["price"])}
            for key, info in SYSTEM_TYPES.items()
        ],
        "options": HAIR_OPTIONS,
        "shipping_days": SHIPPING_DAYS,
    }


def validate_hair_specs(specs, system_type):
    """Return (columns, errors): the order's column values, or why the specs are invalid."""
    if not isinstance(specs, dict):
        return {}, {"specs": "Must be an object with every hair option"}

    columns = {}
    errors = {}
    for field, allowed in HAIR_OPTIONS.items():
        value = specs.get(field)
        # Full systems are measured at the consultation, so any size is allowed.
        if field == "dimensions" and system_type == FULL_SYSTEM:
            if not isinstance(value, str) or not value.strip():
                errors[field] = "Required"
            elif len(value.strip()) > MAX_CUSTOM_DIMENSIONS_LENGTH:
                errors[field] = (
                    f"Must be {MAX_CUSTOM_DIMENSIONS_LENGTH} characters or fewer"
                )
            else:
                columns[SPEC_COLUMNS[field]] = value.strip()
            continue

        # bool is a subclass of int, so True must not count as grey_percent 1.
        if isinstance(value, bool) or value not in allowed:
            errors[field] = f"Must be one of: {', '.join(str(a) for a in allowed)}"
        else:
            columns[SPEC_COLUMNS[field]] = value

    return columns, errors


def validate_full_system_price(value):
    """Return (price, error) for a full system invoice amount."""
    minimum = SYSTEM_TYPES[FULL_SYSTEM]["price"]
    if isinstance(value, bool) or not isinstance(value, (int, float, str)):
        return None, f"Must be a number of at least {minimum}"
    try:
        price = Decimal(str(value)).quantize(Decimal("0.01"))
    except ArithmeticError:
        return None, f"Must be a number of at least {minimum}"
    if not price.is_finite() or price < minimum or price > Decimal("99999.99"):
        return None, f"Must be a number of at least {minimum}"
    return price, None


def specs_from_order(order):
    """The order's hair options, keyed the way the catalog names them."""
    return {field: getattr(order, column) for field, column in SPEC_COLUMNS.items()}