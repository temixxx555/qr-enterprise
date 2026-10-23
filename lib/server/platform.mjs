import { identity, AppError } from './access.mjs';
import { database } from './db.mjs';
export async function platformContext(headers) {
  const user = await identity(headers); const { db } = await database();
  const role = await db.collection('platformRoles').findOne({ userId: user.id, role: 'super_admin', status: 'active' });
  if (!role) throw new AppError('Platform administrator access is required.', 403);
  return { user, db };
}
