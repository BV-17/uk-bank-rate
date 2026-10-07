# Changelog

All notable changes to both packages are recorded here. The TypeScript and Python packages share one version and are released together. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and versions follow [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.4.1] - 2026-10-07

### Changed

- The bundled history is refreshed to 6 October 2026; Bank Rate is unchanged at 3.75% since 18 December 2025
- The section header comments in both packages now end at column 78, and no code changed

## [0.4.0] - 2026-09-29

### Added

- `latePaymentRate` (`late_payment_rate` in Python) gives the rate of statutory interest on a late commercial payment under the Late Payment of Commercial Debts (Interest) Act 1998: 8% over the Bank Rate in force on the 30 June or 31 December immediately before the day interest starts to run, with that reference day and its rate, and the pending decision and beyond-schedule flags of the reference day; it refuses a day before 7 August 2002, when the rule came into force, and answers `null` when the history does not reach back to the reference day

## [0.3.1] - 2026-09-29

### Changed

- The TypeScript package is unchanged apart from its version, and the bundled history in both packages still runs to 28 September 2026

### Fixed

- In Python, whatever a custom transport raises once the timeout has passed is reported as `timeout`, as TypeScript reports it; a transport built on httpx or requests raises its client's own timeout type, which had been reported as `network`

## [0.3.0] - 2026-09-29

### Added

- `ratesBetween` (`rates_between` in Python) splits a span into the periods over which Bank Rate held, each with its first and last day and its count of days, for interest at Bank Rate plus a margin; it carries the pending decision and the beyond-schedule flag of the span's last day, and works offline on any history
- `USER_AGENT` is exported from both packages, so a custom Python transport can send the agent the Bank's firewall accepts
- `now` is accepted by `fetchBankRateObservations` (`fetch_bank_rate_observations`), deciding which day is today for a range that starts after it

### Changed

- A range that starts after today returns no observations without asking the Bank, which answers such a range with a redirect to its error page
- The TypeScript bundled history and schedule are frozen and the public data types are readonly, so no caller can change them under every other caller in the process, as Python never allowed
- The workflows use the current GitHub actions, CI and the publish build check the Python types with mypy in strict mode, the PyPI upload skips files it already holds, and the snapshot refresh refuses to write a history that would lose a bundled change
- The bundled history is refreshed to 28 September 2026; Bank Rate is unchanged at 3.75% since 18 December 2025

### Fixed

- An answer whose first line does not name the series, or whose rows cannot be read, is refused as `not_csv`; a plain-text notice, a table of another series, or the Bank's rows in a new format had each been read as no observations at all, leaving the rate stale with nothing to say why
- The two packages now read the Bank's CSV by one rule, a row ending at `\r\n`, `\r` or `\n` and only spaces and tabs trimmed; before, TypeScript accepted Unicode spaces inside a date, and Python split rows on characters TypeScript did not
- A timeout that is not a positive number is refused before any request; Python had reported a negative one as the Bank being unreachable, and failed on `None`
- A range that ends before the series begins now says so, rather than naming a start the caller never passed
- In Python, a `now` that is not a `datetime` raises `TypeError` instead of an `AttributeError`, status 0 is named as a redirect as in TypeScript, and `BankRateSourceError` survives pickling, so it can cross from a worker process

## [0.2.2] - 2026-09-28

### Changed

- The TypeScript package is published on npm as `uk-bank-rate`. This first npm version was uploaded by hand, since npm can attach a trusted publisher only to a package that already exists, so it carries no provenance attestation
- The publishing workflow now publishes to npm as well as PyPI, from the same version tag and by trusted publishing, and publishes neither package unless both have built and passed their tests
- The code and the bundled data are otherwise unchanged from 0.2.1 in both packages

## [0.2.1] - 2026-09-28

### Changed

- The Python package is published on PyPI as `uk-bank-rate`, uploaded from a version tag by a trusted-publishing workflow that holds no token and refuses a tag that does not match the package version; the npm release follows

## [0.2.0] - 2026-09-28

### Added

- `beyondSchedule` on every reading, set when the date asked about lies past both the published data and the last scheduled decision, so an answer the package cannot vouch for is no longer presented as settled

### Fixed

- The TypeScript decision checks now refuse a date that is not ISO, as the Python ones always did, rather than comparing it as text
- A custom Python transport's own errors now arrive as a typed `network` failure instead of escaping untyped
- An opaque redirect, which strict Fetch runtimes report with status 0, is now named as a redirect to the Bank's error page

### Changed

- The Bank's endpoint, series code, series start and user agent now come from one shared file, and the version check covers the lockfile and the README badge as well as both manifests

## [0.1.0] - 2026-09-28

### Added

- The current Bank Rate with the day it took effect, the last day the published series covers, and the next scheduled decision, in TypeScript (`getBankRate`) and Python (`get_bank_rate`)
- A pending decision on every reading, set when a scheduled decision falls on or before the date asked about and the published series does not reflect it yet, and saying whether the Bank has announced it
- The rate in force on any date since 2 January 1975, answered offline from a bundled history of every change
- The Monetary Policy Committee's scheduled decision dates for 2026 and 2027, with the next decision and whether 12:00 London time has passed on a decision day
- A typed failure for every way the Bank's download can go wrong, from a redirect to its error page to a firewall refusal, so a rate is never guessed
- Python rates as `Decimal` and dates as `datetime.date`, and a user agent the Bank's firewall accepts, where Python's default is refused
- One set of test cases both packages must pass, and a weekly check of both against the live Database
