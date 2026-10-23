# VTPass sandbox integration

Updated October 2, 2026. The selected provider is interpreted as VTPass from the user's reply. The adapter is implemented and tested with mocked provider responses. Account-backed acceptance has not run: the three sandbox settings are not yet configured locally. Live airtime is disabled.

## Configure and verify

Add these names to private `.env.local`, using values from your VTPass sandbox account. Never put keys in chat, JSX, a `NEXT_PUBLIC_` variable or source control.

```dotenv
VTPASS_SANDBOX_ENABLED=true
VTPASS_SANDBOX_API_KEY=your_sandbox_api_key
VTPASS_SANDBOX_SECRET_KEY=your_sandbox_secret_key
```

Keep the local database running with `npm run db:local`. Run `npm run vtpass:check`. It stores its request ID before contacting the sandbox and uses a documented fictional MTN destination for a ₦100 test. It writes only to `enterpriseqr_qa`, regardless of the normal app database configuration. It prints the request ID and normalized result, never credentials.

If the result is pending or unknown, retain the printed request ID and run:

```powershell
npm run vtpass:check -- --requery=THE_ORIGINAL_REQUEST_ID
```

Do not create a new purchase to resolve an uncertain existing purchase. A successful acceptance command demonstrates one sandbox product; it does not demonstrate real airtime delivery or the full callback path.

Restart the local app/QA server and independent worker after changing configuration. In campaign reward settings, choose VTPass sandbox. The server refuses this mode without configured credentials. The sandbox uses server-selected fictional destinations; participant numbers are never sent to it. Run `npm run worker:qa` for the QA workspace.

## Delivery and reconciliation contract

- Only the fixed `https://sandbox.vtpass.com/api/` host is used. Dispatch requires local mode and a loopback application URL. Production dispatch is unavailable.
- Network products are MTN `mtn`, Airtel `airtel`, Glo `glo` and 9mobile `etisalat`. Request IDs start with the required Lagos date/time digits and include a random suffix.
- The worker records the request ID before sending. Once recorded, recovery only queries that ID. A crash between recording and sending may leave an unresolved transaction; preventing a duplicate takes precedence over automatically resending it.
- Success requires a matching request ID, amount and delivered transaction state. Timeouts, malformed responses, duplicates and uncertain replies retain the budget reservation.
- Confirmed initial refusals release reservations. A reversal returns settled spend, or releases a reservation if no success had been recorded. Ledger changes are transactional and deduplicated.
- Pending/unknown transactions are queried with bounded exponential backoff. The administrator's **Check existing transaction** action requires a reason and is rate limited; it never creates another purchase.
- `/api/providers/vtpass/callback` accepts bounded hints, deduplicates them and schedules authenticated lookup of a known transaction. The public documentation reviewed does not specify a signature verification contract. Callback status is therefore never trusted to change money. This is not a claim of authenticated webhook support.

## Acceptance still required

Record sandbox success, insufficient balance/refusal, pending/timeout lookup and repeated callback behavior against the account. The current automated suite uses mocked transport for provider outcomes and real local MongoDB transactions for settlement. Account-specific response variations need review before enabling more products.

Live rewards require further implementation and verification: real OTP and bot protection, secure handling of actual delivery destinations, an explicit production provider mode, account funding/fee rules and an authorized controlled live test. Local verification proofs cannot authorize real payouts. No live transaction has been performed.

## Official API references

The adapter follows VTPass [authentication](https://vtpass.com/documentation/authentication/), [MTN airtime](https://vtpass.com/documentation/mtn-airtime-vtu-api/), [request IDs](https://vtpass.com/documentation/how-to-generate-request-id/), [response codes](https://vtpass.com/documentation/response-codes/), [transaction lookup](https://vtpass.com/documentation/re-query-services/) and [callback documentation](https://vtpass.com/documentation/callback-api-integration/). Recheck these contracts before changing provider behavior.
