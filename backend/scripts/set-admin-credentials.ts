import argon2 from 'argon2';
import { eq } from 'drizzle-orm';
import { createDatabase } from '../src/db/client.js';
import { loadEnvironment } from '../src/config/env.js';
import * as schema from '../src/db/schema/index.js';
import { publicId } from '../src/db/seed/shared.js';

async function main() {
  const args = process.argv.slice(2);
  const newAdminId = args[0]?.trim();
  const newPassword = args[1]?.trim();

  if (!newAdminId || !newPassword) {
    console.log('\nUsage:');
    console.log('  npx tsx scripts/set-admin-credentials.ts <NEW_ADMIN_ID> <NEW_PASSWORD>\n');
    console.log('Example:');
    console.log('  npx tsx scripts/set-admin-credentials.ts SUPERADMIN MySecretPass123\n');
    process.exit(1);
  }

  if (newPassword.length < 6) {
    console.error('Error: Password must be at least 6 characters long.');
    process.exit(1);
  }

  const env = loadEnvironment();
  const db = createDatabase(env);

  console.log(`Hashing new password with Argon2...`);
  const passwordHash = await argon2.hash(newPassword);
  const cleanId = newAdminId.toUpperCase();

  // Find existing admin user
  const [existingAdmin] = await db
    .select()
    .from(schema.users)
    .where(eq(schema.users.role, 'ADMIN'))
    .limit(1);

  if (existingAdmin) {
    console.log(`Updating existing admin (current ID: ${existingAdmin.participantId})...`);
    await db
      .update(schema.users)
      .set({
        participantId: cleanId,
        passwordHash,
        updatedAt: new Date(),
      })
      .where(eq(schema.users.id, existingAdmin.id));

    // Revoke any existing active refresh tokens
    await db
      .update(schema.refreshTokens)
      .set({ revokedAt: new Date() })
      .where(eq(schema.refreshTokens.userId, existingAdmin.id));

    console.log(`\n🎉 Success! Admin credentials updated:`);
    console.log(`- Role:           ADMIN`);
    console.log(`- Participant ID: ${cleanId}`);
    console.log(`- Password:       ${newPassword}`);
  } else {
    console.log(`No admin found. Creating new administrator...`);
    const newPublicId = publicId('usr');
    await db.insert(schema.users).values({
      publicId: newPublicId,
      participantId: cleanId,
      displayName: 'WTR Administrator',
      passwordHash,
      role: 'ADMIN',
      accountStatus: 'ACTIVE',
    });

    console.log(`\n🎉 Success! New Administrator created:`);
    console.log(`- Role:           ADMIN`);
    console.log(`- Participant ID: ${cleanId}`);
    console.log(`- Password:       ${newPassword}`);
  }

  console.log(`\nYou can now sign in at http://localhost:5173/ with ID: "${cleanId}"\n`);
  process.exit(0);
}

main().catch((err) => {
  console.error('Failed to set admin credentials:', err);
  process.exit(1);
});
