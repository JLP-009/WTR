import argon2 from 'argon2';
import { users } from '../schema/index.js';
import { PARTICIPANT_ID, publicId, seedDatabase } from './shared.js';

const password = process.env.SEED_PARTICIPANT_PASSWORD;
if (!password) throw new Error('SEED_PARTICIPANT_PASSWORD is required to seed a participant.');
const db = seedDatabase();
const passwordHash = await argon2.hash(password);
await db.insert(users).values({ publicId: publicId('usr'), participantId: PARTICIPANT_ID, displayName: 'Sample Trader', passwordHash, role: 'PARTICIPANT' }).onConflictDoNothing();
console.log(`Participant ${PARTICIPANT_ID} seeded.`);
