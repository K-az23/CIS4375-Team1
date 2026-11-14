from datetime import UTC, datetime, time
from zoneinfo import ZoneInfo

# The salon is in Houston; dates people pick follow its clock, while the
# database stores naive UTC.
BUSINESS_TIMEZONE = ZoneInfo("America/Chicago")


def start_of_day_utc(day):
    """Naive UTC datetime for midnight at the start of `day` in salon time."""
    local_midnight = datetime.combine(day, time.min, BUSINESS_TIMEZONE)
    return local_midnight.astimezone(UTC).replace(tzinfo=None)
