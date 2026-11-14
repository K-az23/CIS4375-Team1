
# a normalizer for phone numbers for storage/comparison ~ set more has a country code
# that sometimes attaches the +1 to the number
def normalize_phone(phone):
    if not phone:
        return None

    raw = str(phone).strip()

    if raw.startswith("+"):
        digits = "".join(char for char in raw if char.isdigit())
        return f"+{digits}"

    digits = "".join(char for char in raw if char.isdigit())

    if len(digits) == 10:
        return f"+1{digits}"

    if len(digits) == 11 and digits.startswith("1"):
        return f"+{digits}"

    return None
