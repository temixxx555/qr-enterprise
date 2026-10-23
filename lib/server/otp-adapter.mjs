import { requireSimulator } from './reward-common.mjs';
import { AppError } from './access.mjs';
// Provider integrations replace these server-side contracts in Phase 7.
// Never infer ownership from a simulator code outside local mode.
export async function deliverOtp({ code }) {
  requireSimulator();
  return { simulated: true, simulatedCode: code, message: 'Local simulator: no SMS was sent. This code expires in five minutes.' };
}
export async function checkBotChallenge({ suspicious, token }) {
  if (!suspicious) return;
  requireSimulator();
  if (token !== 'local-test') throw new AppError('Complete the local test bot check before requesting another code.', 403);
  // This is a test adapter, not bot detection. A live adapter must verify a provider
  // token on the server, check its hostname/action and reject reused tokens.
}
