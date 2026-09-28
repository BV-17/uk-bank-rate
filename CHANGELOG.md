# Changelog

All notable changes to both packages are recorded here. The TypeScript and Python packages share one version and are released together. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and versions follow [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.1.0] - 2026-09-28

### Added

- The current Bank Rate with the day it took effect, the last day the published series covers, and the next scheduled decision, in TypeScript (`getBankRate`) and Python (`get_bank_rate`)
- A pending decision on every reading, set when a scheduled decision falls on or before the date asked about and the published series does not reflect it yet, and saying whether the Bank has announced it
- The rate in force on any date since 2 January 1975, answered offline from a bundled history of every change
- The Monetary Policy Committee's scheduled decision dates for 2026 and 2027, with the next decision and whether 12:00 London time has passed on a decision day
- A typed failure for every way the Bank's download can go wrong, from a redirect to its error page to a firewall refusal, so a rate is never guessed
- Python rates as `Decimal` and dates as `datetime.date`, and a user agent the Bank's firewall accepts, where Python's default is refused
- One set of test cases both packages must pass, and a weekly check of both against the live Database
