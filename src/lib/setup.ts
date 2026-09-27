import 'server-only';
import { authProblem } from './auth';
import { databaseUrl, onVercel } from './env';
import { storageWarning } from './storage';

/**
 * What is still missing after a deploy, in words the two of us understand.
 * Checked from the environment only, so it works even without a database.
 */
export function setupProblems(): string[] {
  const problems: string[] = [];
  const auth = authProblem();
  if (auth) problems.push(auth);
  if (onVercel() && !databaseUrl()) {
    problems.push('还没有连接数据库：在 Vercel 项目的 Storage 里连接一个 Postgres（推荐 Neon），然后重新部署。');
  }
  const storage = storageWarning();
  if (storage) problems.push(storage);
  return problems;
}
