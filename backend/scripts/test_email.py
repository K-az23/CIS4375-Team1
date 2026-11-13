from app import create_app
from app.logic.email_notif import send_email

app = create_app()


with app.app_context():
    send_email(
        to_email="kevzavala23@gmail.com",
        subject="Executive Parlor SMTP Test",
        body=(
            "This is a test email from the "
            "Executive Parlor Flask backend."
        ),
    )

    print("Test email sent.")