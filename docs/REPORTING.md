# Reporting and operations

Analytics, Fulfillment, Submissions and Audit use authenticated organization scope. Managers see assigned campaigns; explicit requests for another tenant's or an unassigned campaign return 404. Report ranges use inclusive calendar dates in Africa/Lagos, default to the last 30 days and allow at most 366 days.

## Definitions

- **Recorded visits:** instrumented public-page loads, including shared links; not proven physical QR scans. Recording starts with this release. Visits are deduplicated by event ID.
- **Estimated browsers:** distinct first-party browser-cookie hashes in the selected visit period. Different browsers can represent the same person; deleting cookies changes the estimate. No IP or user-agent fingerprint is stored.
- **Responses:** submissions created within the selected dates.
- **Visit conversion:** selected visits linked to a response by report time divided by selected visits. The server checks the visitor-cookie hash before linking. Old unlinked responses do not contribute; a zero denominator displays an em dash.
- **Verified identities:** distinct phone identity hashes on claims created in the period. Current phone verification is simulated.
- **Claim success:** succeeded divided by succeeded + failed + reversed for claims created in the period. Review, queued, pending, unknown and rejected claims are excluded. A zero denominator displays an em dash.
- **Net test spend:** settlements minus reversals whose ledger event date is in the period; it can be negative if earlier spending is reversed.
- **Budget and queue now:** current all-time totals for selected campaigns, independent of date filters. Available allocation excludes reserved and net spent amounts.

All reward amounts are test values, including VTPass sandbox transactions. Daily tables group creation dates in Lagos and omit empty days.

## Exports

Summary, claims, ledger and response exports apply the same server-side campaign/date scope. Claim status and response workflow/state filters apply to the relevant export. Response exports contain private answers: share only with authorized recipients.

CSV exports have UTF-8 BOM, quoted cells and spreadsheet-formula escaping. Row exports stop with an explicit error beyond 5,000 rows or 10 MB of projected source data; narrow the filters rather than assuming a truncated export is complete. Completed exports record the operator, filters and row count in the audit log. Phone hashes, cookies, API keys and worker lease tokens are excluded.

## Fulfillment

Open a claim's history to inspect provider reference/job state, ledger and processing events. Administrators can review claims or schedule a lookup with a reason. Lookup uses the existing transaction identity and never submits another reward. Unknown outcomes retain reservations until resolved. See [reward operations](REWARD_OPERATIONS.md).
