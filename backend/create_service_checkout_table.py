"""Create the service-receipt table using the configured backend database."""
from argparse import ArgumentParser


def main():
    parser = ArgumentParser(description=__doc__)
    parser.add_argument(
        "--apply",
        action="store_true",
        help="Create service_checkouts if it does not already exist",
    )
    args = parser.parse_args()

    if not args.apply:
        print(
            "No database changes made. "
            "Use --apply to create the service_checkouts table."
        )
        return

    from app import create_app
    from app.extensions import db
    from app.models.service_checkout import ServiceCheckout

    app = create_app()

    with app.app_context():
        ServiceCheckout.__table__.create(
            bind=db.engine,
            checkfirst=True,
        )

    print("The service_checkouts table is ready.")


if __name__ == "__main__":
    main()