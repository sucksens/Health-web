import re

DEFAULT_FREQUENCY_HOURS = 24


def parse_frequency_to_hours(frequency: str | None) -> int:
    if not frequency:
        return DEFAULT_FREQUENCY_HOURS

    m = re.search(r"(\d+)\s*(?:horas|hours|hrs|h)\b", frequency, re.IGNORECASE)
    if m:
        return int(m.group(1))

    return DEFAULT_FREQUENCY_HOURS


def doses_per_day(frequency: str | None) -> int:
    hours = parse_frequency_to_hours(frequency)
    if hours <= 0:
        return 1
    return max(1, 24 // hours)
