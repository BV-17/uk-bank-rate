# ─── Local Application Imports ──────────────────────────────────────────────

from uk_bank_rate._generated_history import BUNDLED_CHANGES, BUNDLED_OBSERVED_TO
from uk_bank_rate._types import BankRateChange, BankRateHistory

# ─── Bundled History ────────────────────────────────────────────────────────

bundled_history = BankRateHistory(
    changes=tuple(BankRateChange(date=changed_on, rate=rate) for changed_on, rate in BUNDLED_CHANGES),
    observed_to=BUNDLED_OBSERVED_TO,
)
