import { randomUUID } from 'node:crypto';
import { createDatabase } from '../client.js';
import { loadEnvironment } from '../../config/env.js';

export const env = loadEnvironment();
export const seedDatabase = () => createDatabase(env);
export const publicId = (prefix: string) => `${prefix}_${randomUUID()}`;
export const ADMIN_PARTICIPANT_ID = 'ADMIN001';
export const PARTICIPANT_ID = 'TRADER001';
