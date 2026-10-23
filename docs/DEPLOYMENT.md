# Deployment and handover

Updated October 23, 2026. **Preparation only: the user explicitly requested no publication.** No host or public domain has been provisioned. The app can be prepared as a campaign/forms workspace; production phone verification and reward delivery remain disabled.

## Package

- Next.js standalone output and a multi-stage `Dockerfile`, with an unprivileged web process.
- `.dockerignore` excludes local credentials, databases, uploads, mail, development builds and dependencies. Build a fresh image from source; never upload the local `.next` directory, which can contain local server configuration.
- Separate worker target, for local simulator/sandbox operation only. It deliberately refuses production mode and cannot serve as a live rewards worker yet.
- `npm run deploy:check` checks configuration names and reports missing requirements without printing values.
- Public `/api/health` checks database reachability; authenticated administrator `/api/operations/health` reports scoped queue and reconciliation conditions.

The Docker CLI executable is present in the current environment. Neither container target has been built or run, so container behavior remains unverified. The application build passed in the recorded October 2 checks.

## Configuration

Use separate staging and production databases, private buckets, credentials and authentication secrets. Supply settings through the host's private environment store, using `.env.example` as the name reference.

| Setting | Requirement |
| --- | --- |
| `APP_MODE` | `production` on any hosted deployment |
| `APP_URL` | Final HTTPS origin, set before generating printed QR codes |
| `MONGODB_URI`, `MONGODB_DB` | MongoDB replica set and dedicated database; least-privilege database user |
| `BETTER_AUTH_SECRET` | Stable random secret of at least 32 characters; preserve across replicas/restarts |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, `MAIL_FROM` | Chosen email service; verify signup and recovery delivery |
| `S3_BUCKET`, `S3_REGION` | Private object storage; use provider-specific endpoint/credentials where needed |
| `S3_ENDPOINT`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY` | Optional compatible endpoint; access key and secret are explicitly used by the current adapter. Host-identity fallback is not implemented. |
| `VTPASS_SANDBOX_ENABLED` | `false` for hosted production; keep sandbox secrets in local test configuration |

The October 23 local preflight fails because hosted SMTP, bucket, HTTPS origin and production mode are not configured. A passing preflight checks configuration shape only, not connectivity or readiness. The check outputs missing variable names and issue descriptions, not credential values.

## Release procedure for a future authorized deployment

1. Save a versioned source release. A local Git repository was initialized October 23, 2026; the initial commit is recorded in `docs/DECISIONS.md`. No remote is configured. Do not include `.env.local` or `.data` in a source archive.
2. Run `npm ci`, `npm run lint`, `npm test` and `npm run build`. Run the local integration suites in sequence as described in the README.
3. On the target's configured environment, run `npm run deploy:check`. Do not change the developer's existing local database settings to do this.
4. Build the web image with `docker build --target web -t enterpriseqr:RELEASE .`. The Docker build sets production mode for security headers and excludes local secrets. Inject runtime settings through the host; do not bake them into the image.
5. Route HTTPS traffic to port 3000 behind the host's reverse proxy. Keep MongoDB and the object bucket private. Configure restart policy, resource limits and health checks. Avoid logging request bodies, OTPs, cookies, credentials or form answers.
6. Initialize/verify the indexes defined in `lib/server/db.mjs`, `reward-common.mjs` and `visits.mjs` through the application initialization paths. New unique indexes must be checked for duplicates on an existing database before rollout; never remove records automatically to force an index build.
7. Verify email signup, recovery and session revocation; private image upload and published image access; organization isolation; page publication, RSVP/feedback and scoped export; pause/schedule behavior; and a real phone scanning the final-domain QR.
8. Only after separate provider implementation and acceptance may a production rewards worker be enabled. The current worker target is not eligible for that step.

Nothing in this checklist was deployed as part of this turn.

## Monitoring and operations

The administrator fulfillment page shows unfinished jobs, expired leases and recent worker heartbeat. Warnings cover jobs overdue by ten minutes, unknown transactions and missing worker heartbeat when work is pending. These are in-app indicators, not outbound alerts. A monitoring service and notification destination still need configuration.

For a future live deployment, alert on HTTP/database failures, sustained queue age, expired leases, unknown outcomes, SMTP/storage errors and provider balance. **Provider balance monitoring is not implemented.** Do not expose administrative health using a shared public token or distribute a personal session cookie to a monitoring service; add a scoped service identity if automated private monitoring is needed.

Unknown provider outcomes retain their reservation. Check the original transaction from Fulfillment; never manually resend to clear uncertainty. Audit and history pages preserve operator reasons and settlement events. See [reward operations](REWARD_OPERATIONS.md) and [VTPass integration](VTPASS_INTEGRATION.md).

## Backups and recovery

`npm run test:backup` exercises an isolated local snapshot/restore, including collection indexes, exact EJSON values and asset content hashes. The October 2 rehearsal passed for 30 collections and one image, including a claim. It removes only its newly created restore database and retains the snapshot in ignored `.data/backups`. The backup contains private data: store and access it accordingly.

This rehearsal is not a production backup system. Configure encrypted managed database backups and private-bucket versioning with retention approved by the owner. Keep database asset references and object versions recoverable together. Set recovery-time and recovery-point targets; restore to an isolated database/bucket and exercise sign-in, page rendering and ledger invariants before relying on the backup.

MongoDB documents consistent replica-set backup/restore procedures in its [mongorestore examples](https://www.mongodb.com/docs/database-tools/mongorestore/mongorestore-examples/). Hosted backups and a restore on the selected infrastructure remain unverified.

## Rollback

Retain the prior immutable application image and its compatible configuration. Stop new reward admissions and worker dispatch before changing reward code; do not delete jobs or reset request IDs. Roll back the web image only after checking schema compatibility. Reconcile in-flight provider requests by their original references. Restore data only through a planned recovery operation that accounts for transactions accepted after the backup; restoring a ledger blindly can create duplicate payouts.

## Launch gates still open

VTPass account acceptance; live OTP/bot/delivery implementation; hosted SMTP/S3 and HTTPS acceptance; physical QR scan; container execution; external monitoring and balance alerts; hosted backup restore; broader accessibility/slow-network/load checks; owner-approved privacy, reward, retention/deletion and support policies. No real SMS or airtime has been sent.
