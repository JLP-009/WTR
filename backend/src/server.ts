import { buildApp } from './app.js';
import { loadEnvironment } from './config/env.js';

const env = loadEnvironment();
const app = await buildApp(env);
await app.listen({ host: env.HOST, port: env.PORT });
