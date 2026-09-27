import 'fastify';
import type { TokenPayload } from '../auth/jwt.js';
import type { AuthService } from '../../modules/auth/auth.service.js';
import type { Database } from '../../db/client.js';

declare module 'fastify' {
  interface FastifyInstance {
    db: Database;
    authService: AuthService;
    authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
    requireAdmin: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
    optionalAuthenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }

  interface FastifyRequest {
    requestId: string;
    user?: TokenPayload;
  }
}
