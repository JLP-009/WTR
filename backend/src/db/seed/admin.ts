import argon2 from 'argon2';
import { users } from '../schema/index.js';
import { ADMIN_PARTICIPANT_ID, publicId, seedDatabase } from './shared.js';

const password = process.env.SEED_ADMIN_PASSWORD;
if (!password) throw new Error('SEED_ADMIN_PASSWORD is required to seed an administrator.');
const db = seedDatabase();
const passwordHash = await argon2.hash(password);
await db.insert(users).values({ publicId: publicId('usr'), participantId: ADMIN_PARTICIPANT_ID, displayName: 'WTR Administrator', passwordHash, role: 'ADMIN' }).onConflictDoNothing();
console.log(`Admin ${ADMIN_PARTICIPANT_ID} seeded.`);
