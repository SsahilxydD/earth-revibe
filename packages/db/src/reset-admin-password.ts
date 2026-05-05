import crypto from 'node:crypto';
import { prisma } from './client';

function hashPassword(password: string): Promise<string> {
  const salt = crypto.randomBytes(16).toString('hex');
  return new Promise((resolve, reject) => {
    crypto.scrypt(password, salt, 64, (err, derivedKey) => {
      if (err) reject(err);
      else resolve(`${salt}:${derivedKey.toString('hex')}`);
    });
  });
}

const ADMINS = [{ email: 'admin@earthrevibe.com' }, { email: 'ysahil816@gmail.com' }];

async function main() {
  const password = process.env.ADMIN_PASSWORD;
  if (!password) {
    console.error('Set ADMIN_PASSWORD env var (e.g. ADMIN_PASSWORD="MySecret" npx tsx ...)');
    process.exit(1);
  }

  for (const admin of ADMINS) {
    const passwordHash = await hashPassword(password);

    try {
      const user = await prisma.user.update({
        where: { email: admin.email },
        data: { passwordHash },
        select: { id: true, email: true, role: true },
      });
      console.log('Password reset:', user);
    } catch (e: any) {
      if (e.code === 'P2025') {
        console.log(`User ${admin.email} not found — skipping`);
      } else {
        throw e;
      }
    }
  }
}

main()
  .catch((e) => {
    console.error('Failed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
