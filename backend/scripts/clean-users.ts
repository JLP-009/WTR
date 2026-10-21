import argon2 from 'argon2';
import { sql } from 'drizzle-orm';
import { createDatabase } from '../src/db/client.js';
import { loadEnvironment } from '../src/config/env.js';
import * as schema from '../src/db/schema/index.js';
import { publicId } from '../src/db/seed/shared.js';

async function main() {
  const env = loadEnvironment();
  const db = createDatabase(env);

  console.log('🧹 Purging all participant users and keeping ONLY admin with ADMIN001 / adminpass...');

  // 1. Hash the password for ADMIN001
  const targetPassword = 'adminpass';
  const targetId = 'ADMIN001';
  const passwordHash = await argon2.hash(targetPassword);

  // 2. Upsert admin user
  const [existingAdmin] = await db
    .select()
    .from(schema.users)
    .where(sql`${schema.users.role} = 'ADMIN'`)
    .limit(1);

  let adminId: string;

  if (existingAdmin) {
    adminId = existingAdmin.id;
    await db
      .update(schema.users)
      .set({
        participantId: targetId,
        passwordHash,
        displayName: 'WTR Administrator',
        accountStatus: 'ACTIVE',
        updatedAt: new Date(),
      })
      .where(sql`${schema.users.id} = ${adminId}`);
    console.log(`✅ Updated existing admin account (ID: ${adminId}) to ${targetId}`);
  } else {
    const newId = publicId('usr');
    const [created] = await db
      .insert(schema.users)
      .values({
        publicId: newId,
        participantId: targetId,
        displayName: 'WTR Administrator',
        passwordHash,
        role: 'ADMIN',
        accountStatus: 'ACTIVE',
      })
      .returning();
    adminId = created.id;
    console.log(`✅ Created new admin account (ID: ${adminId}) with ${targetId}`);
  }

  // 3. Delete all dependent records for non-admin users in correct foreign key order
  await db.execute(sql`DELETE FROM executions WHERE order_id IN (SELECT id FROM orders WHERE user_id != ${adminId})`);
  await db.execute(sql`DELETE FROM portfolio_ledger_entries WHERE order_id IN (SELECT id FROM orders WHERE user_id != ${adminId}) OR portfolio_id IN (SELECT id FROM portfolios WHERE user_id != ${adminId})`);
  await db.execute(sql`DELETE FROM orders WHERE user_id != ${adminId}`);
  await db.execute(sql`DELETE FROM positions WHERE user_id != ${adminId}`);
  await db.execute(sql`DELETE FROM portfolios WHERE user_id != ${adminId}`);
  await db.execute(sql`DELETE FROM event_participants WHERE user_id != ${adminId}`);
  await db.execute(sql`DELETE FROM refresh_tokens WHERE user_id != ${adminId}`);
  await db.execute(sql`DELETE FROM idempotency_records WHERE user_id != ${adminId}`);
  await db.execute(sql`DELETE FROM audit_logs WHERE actor_user_id IS NOT NULL AND actor_user_id != ${adminId}`);
  console.log('✅ Cleared all dependent participant trading records, portfolios, and positions.');

  // 4. Delete all users except admin
  await db.execute(sql`DELETE FROM users WHERE id != ${adminId}`);
  console.log('✅ Deleted all regular participant users.');

  // 5. Verify remaining users
  const remaining = await db
    .select({
      id: schema.users.id,
      participantId: schema.users.participantId,
      displayName: schema.users.displayName,
      role: schema.users.role,
    })
    .from(schema.users);

  console.log('\n📊 Database Users Status:');
  console.table(remaining);

  console.log(`\n🎉 Done! Only 1 administrator account remains:`);
  console.log(`   - Participant ID: ${targetId}`);
  console.log(`   - Password:       ${targetPassword}`);
  console.log(`   - Role:           ADMIN\n`);

  process.exit(0);
}

main().catch((err) => {
  console.error('Error cleaning users:', err);
  process.exit(1);
});
