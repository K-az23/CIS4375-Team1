from decimal import Decimal

from app.logic.catalog import validate_full_system_price, validate_hair_specs

AREA_SPECS = {
    "hair_type": "Wavy",
    "base_type": "Skin",
    "skin_thickness": "Thin (.02mm)",
    "color": "#3",
    "grey_percent": 20,
    "density": "Medium",
    "dimensions": "7 x 9",
}


def test_catalog_is_public_with_prices_and_options(client):
    response = client.get("/api/catalog")

    assert response.status_code == 200
    data = response.get_json()
    prices = {t["key"]: t["price"] for t in data["system_types"]}
    assert prices == {"area": 400.0, "full": 650.0}
    assert data["options"]["color"] == ["#1", "#2", "#3", "#4", "#5", "#6", "#7"]
    assert data["options"]["dimensions"] == ["6 x 8", "7 x 9", "8 x 10"]
    assert data["shipping_days"] == 10


def test_valid_specs_map_to_order_columns(app):
    columns, errors = validate_hair_specs(AREA_SPECS, "area")

    assert errors == {}
    assert columns["skin_type"] == "Thin (.02mm)"
    assert columns["color_code"] == "#3"
    assert columns["grey_percentage"] == 20


def test_invalid_specs_are_reported_per_field(app):
    bad = {**AREA_SPECS, "color": "#9", "grey_percent": True, "dimensions": "9 x 9"}
    bad.pop("density")

    _, errors = validate_hair_specs(bad, "area")

    assert set(errors) == {"color", "grey_percent", "dimensions", "density"}
    assert validate_hair_specs("not a dict", "area")[1] == {
        "specs": "Must be an object with every hair option"
    }


def test_full_system_allows_custom_dimensions(app):
    specs = {**AREA_SPECS, "dimensions": "Full cap, custom"}

    columns, errors = validate_hair_specs(specs, "full")

    assert errors == {}
    assert columns["dimensions"] == "Full cap, custom"


def test_full_system_price_has_a_minimum(app):
    assert validate_full_system_price(725) == (Decimal("725.00"), None)
    assert validate_full_system_price("650") == (Decimal("650.00"), None)
    for bad in (500, "abc", None, True, "nan"):
        price, error = validate_full_system_price(bad)
        assert price is None
        assert error