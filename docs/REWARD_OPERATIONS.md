# Phase 5–6 reward operations

Implemented for the local simulator on October 2, 2026. Nothing in this workflow sends real SMS, airtime or money. A VTPass sandbox adapter is now implemented; account acceptance and live integration remain open. See [the complete handbook](ENTERPRISEQR_COMPLETE_HANDBOOK.md) for current scope and [VTPass integration](VTPASS_INTEGRATION.md) for provider-specific request identities and reconciliation timings.

## Try the complete flow

1. Keep `npm run db:local` and `npm run dev:qa` running. The QA app is at `http://127.0.0.1:3100` and uses the separate `enterpriseqr_qa` database.
2. Sign in, open a campaign, enable its reward button in the page editor, save and publish it.
3. On the campaign detail page, configure **Reward rules & test budget**. The UI uses naira; the server stores integer kobo. Choose an amount, total allocation, daily cap, participant limit and simulator outcome. Enable test requests. Settings take effect immediately for new claims, independently of page publication.
4. Optional: add invitation/customer references, one per line, and require them. References use 4–80 letters, digits, hyphens or underscores. Matching ignores case and surrounding whitespace. Only keyed hashes are stored, so retain your own copy. Saving adds references; it never resets used references.
5. Optional: require administrator review. Such claims reserve budget immediately, then wait in **Fulfillment**. An owner/admin must give a reason and approve or decline them. Managers can read assigned campaigns, but cannot change reward policies or approve/process claims.
6. Open the public page, enter a fictional Nigerian number and accept the verification notice. Use the visibly displayed test code. Choose the current network explicitly; prefixes are not used to infer network.
7. Check eligibility, then request the test reward. Checking alone does not reserve capacity. The claim operation repeats all checks and atomically reserves capacity.
8. Keep `npm run worker:qa` running in a separate terminal. Alternatively, an administrator can use **Process next test job** to run one due job for their organization. The CLI runs independently of browser requests.
9. Open the participant's private receipt or refresh **Fulfillment**. The campaign detail page shows allocation, reservations, spend, available balance and the latest 20 ledger entries.

For the environment in `.env.local`, `npm run worker` uses that configured database. It refuses production mode or a non-loopback APP_URL. `node scripts/reward-worker.mjs --qa --once` processes at most one due QA job, then exits. Stop a continuous worker with Ctrl+C. Worker restart does not discard queued jobs.

## Eligibility and entitlement policy

- The campaign must be published, within its schedule, have an enabled reward action, and belong to an active organization. Test reward rules must be enabled.
- A five-minute simulator proof is bound to the browser, canonical phone, campaign and publication revision. Codes allow five attempts, expire explicitly before TTL cleanup and are consumed atomically once. Changing the phone requires another challenge. The browser receives an HttpOnly, SameSite=Strict cookie; HTTPS also uses Secure.
- One lifetime claim per verified phone and campaign. Unique database constraints enforce this even across new browsers, alternate phone formatting and new request keys. Existing claims retain their amount, network, policy version and simulator scenario.
- Request keys are scoped to campaign and participant. Repeating a key with changed details fails. A new key for an already-used phone returns the original claim rather than creating another.
- References are single-use per campaign. Their consumption is in the reservation transaction.
- Total allocation and daily caps include active reservations plus settled spend. Daily buckets use Africa/Lagos midnight. Participant capacity counts reserved and successful claims.
- Confirmed failure, administrator rejection and reversal release budget/capacity. They do **not** restore the phone's entitlement or the reference. This intentionally avoids repeated attempts at rewards. Different participants may use released capacity.
- Unknown or pending outcomes retain their reservations. There is no unsafe retry/release button.
- Already-reserved, approved jobs continue settling even if the campaign is paused, archived, reward rules are disabled, or the organization is later suspended. This policy honors commitments made at admission. New admissions stop; pending review cannot be approved while a campaign is unavailable. Live provider rollout must confirm this operational policy with the owner.
- A lower allocation cannot invalidate existing reservations/spend; a lower participant limit cannot go below current commitments. A lower daily cap prevents further admission until the new cap allows it.

## State machine and durable accounting

`verified → review or queued → pending / unknown / succeeded / failed`

`review → queued or rejected`; simulated successful reversal scenario: `succeeded → reversed`.

Claims in review reserve capacity but have no job. Approval creates the job transactionally. Direct admission inserts the claim, unique entitlement, reference consumption, reservation ledger entry and job in one MongoDB transaction. Campaign and organization writes make concurrent availability changes conflict with admission. Policy writes serialize competing allocations. All transactions require a MongoDB replica set.

The job document is the durable outbox. Workers acquire a 30-second lease with a random fencing token. Completion requires the current, unexpired token. Expired leases are reclaimable; stale workers cannot settle. Provider identity is the immutable claim ID, not a per-attempt ID. The simulator keeps exactly one transaction document per claim.

Settlement updates the claim, ledger, budget counters and job in one transaction. The unique `(claimId, kind)` ledger index adds another guard against duplicate settlement. Ledger entries are append-only through the application: `reserve`, `settle`, `release`, `reverse`. Allocation changes have a separate immutable history and audit entry. Amounts are integer kobo, not floating-point currency inputs from participants.

## Deterministic simulator scenarios

- **success:** one confirmed simulated success; reservation becomes spend.
- **failure:** confirmed failure; reservation is released.
- **pending:** initially pending, then a lookup confirms success.
- **timeout:** initially unknown, then a lookup finds the original successful transaction. No new provider transaction is created.
- **reversal:** initially successful, then a lookup confirms reversal and appends a reversing ledger entry.

Reconciliation becomes due after five seconds. These timings model behavior for tests, not provider guarantees. Exceptions retain the job lease and reservation; a later worker recovers after lease expiry. Review reservations have no automatic expiry and must be approved or declined by an administrator.

## Privacy, access and integration boundaries

- Public receipts use random claim IDs plus the participant cookie. Another browser cannot read them merely by knowing the ID. A newly verified browser for the same phone can recover the original receipt by requesting the reward again. Receipt reads never trigger processing.
- Receipt responses expose only status, amount, network and timestamps. No raw phone, reference, provider credential or verification code is placed in receipt URLs. Pages opt out of indexing and use no-referrer metadata. API reads use no-store.
- Phone and reference identities use HMAC with the server secret. Do not rotate that secret without an identity migration plan: it underpins duplicate detection. Real provider integration will need a separate secure recipient delivery mechanism; this simulator stores no raw phone destination.
- OTP delivery and suspicious-request bot checks have server adapter boundaries in `otp-adapter.mjs`. The local test bot checkbox is deliberately not real bot protection. Live verification fails closed. A future live bot adapter must verify provider tokens, hostname/action and replay rules.
- Distributed counters use fixed windows: one code request per phone per minute, five per browser/campaign per hour, 100 per campaign per hour. After two browser requests the local bot adapter requires its test marker. A fixed window is not an elapsed cooldown. Production per-source limits, risk scoring and real challenge integration remain hardening/provider work.
- All money values are simulated allocations. There is no funding/payment endpoint and no real provider credential is accepted from a browser.

## Verification

With the QA server and local database running, stop any continuous QA worker before `npm run test:rewards`; the suite controls leases and processing order itself. It creates isolated fictional organizations in `enterpriseqr_qa` and removes its own fixtures. Do not run two copies of the suite concurrently.

- `npm run test:rewards`: 77 reward integration assertions covering simultaneous budget/entitlement/reference races, immutable amounts, daily and participant caps, review, tenant/manager boundaries, private receipts, expired proof, unavailable campaigns, all simulator outcomes and worker crash recovery.
- `npm run test:integration`: 76 regression assertions for accounts, tenants, campaigns, assets, forms, submissions and OTP protections.
- `npm test`: 24 unit tests in the latest recorded run.
- `npm run lint` and `npm run build`.

The automated suite checks production simulator rejection. VTPass sandbox transport/recovery is covered by mocked checks; account-backed acceptance is pending. Live OTP, bot service, real airtime delivery and a production reward worker remain unimplemented or unverified as detailed in the current handbook.
