# Security and failure acceptance record

October 2, 2026. This is a local engineering test record, not a certification or independent penetration test.

## Evidence

The suites use a real local MongoDB replica set and HTTP application endpoints. Provider transport is mocked unless the separate sandbox acceptance command is explicitly run. Fictional fixtures are scoped and removed by each suite; the configured cloud database is not used.

- `npm test`: 24 tests covering page/form validation, schedules, reporting dates/CSV, request origins/body limits and provider mapping/outcome checks.
- `npm run test:integration`: 76 assertions across authentication, organization isolation, manager assignment/suspension, versioned publication, assets/QR, consent/forms and recovery/session revocation.
- `npm run test:rewards`: 77 assertions across verification, admission, concurrent capacity, duplicate claims, ledger, review, leases/recovery, failure, pending, unknown and reversal.
- `npm run test:operations`: 43 assertions across seeded reporting totals, exports and limits, scopes, visit linkage, safe transaction lookup, callback replay, provider timeout/requery and health access.
- `npm run lint` and `npm run build`: passed.
- `npm audit --omit=dev --audit-level=high`: zero reported vulnerabilities at check time. This is not a guarantee against unknown issues.
- `node scripts/check-client-secrets.mjs`: 34 browser assets checked against two configured private values; no matches.
- `npm run test:backup`: restored 30 collections and a real local image fixture; checked indexes, serialized values, hashes and budget invariants.

## Hardening in this release

Private reports authorize on the server; exports are bounded, formula-escaped and audited. Unknown errors log only their type and return a generic response. Callback payloads cannot settle a transaction. Security headers prohibit framing and objects, restrict base URLs and browser permissions, and disable content sniffing. HTTPS production builds add HSTS. The CSP is a limited policy, not a full nonce-based script policy.

Prior browser journeys covered page customization, forms/mobile errors and the simulator claim/review/receipt flow. Current analytics was inspected against the retained fictional fixture. Automated tests establish the reporting calculations; browser inspection alone does not establish financial correctness.

## Unresolved before production acceptance

1. Account-backed VTPass sandbox acceptance, then implementation and controlled acceptance of any live provider mode. Current verification and delivery cannot send real airtime.
2. Real OTP, bot protection and production abuse/load tuning. Ordinary public responses remain repeatable; only reward entitlement has verified-phone deduplication in the simulator.
3. Hosted SMTP/S3, final-domain HTTPS and physical-phone QR verification, container execution and hosted restore.
4. Full keyboard/screen-reader accessibility review, slow/interrupted network journeys and sustained load/queue testing. Existing local checks do not establish these.
5. Storage quotas/asset cleanup, owner-approved retention/deletion/privacy/reward policies and operational support ownership.
6. External monitoring destination and provider-balance alerts. In-app queue warnings are implemented; outbound alerts are not.

Do not present these open gates as completed merely because the production bundle builds.
