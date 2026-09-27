import type { FastifyInstance } from 'fastify';
import type { WebSocket } from 'ws';
import { verifyAccessToken, type TokenPayload } from '../../common/auth/jwt.js';
import type { Environment } from '../../config/env.js';

export interface ClientConnection {
  socket: WebSocket;
  user?: TokenPayload;
  authenticated: boolean;
  subscriptions: Set<string>;
  symbols: Set<string>;
}

export class WebSocketGateway {
  private readonly clients = new Set<ClientConnection>();

  public constructor(private readonly app: FastifyInstance, private readonly env: Environment) {}

  public handleConnection(socket: WebSocket) {
    const client: ClientConnection = {
      socket,
      authenticated: false,
      subscriptions: new Set(['market', 'news', 'portfolio', 'positions', 'leaderboard', 'orders']),
      symbols: new Set(),
    };

    this.clients.add(client);

    // Send connection established handshake
    this.send(client, {
      type: 'connection.established',
      data: { heartbeat_interval_ms: this.env.WS_HEARTBEAT_INTERVAL_MS },
    });

    socket.on('message', async (raw: string | Buffer) => {
      try {
        const message = JSON.parse(raw.toString());
        await this.handleMessage(client, message);
      } catch (err) {
        this.send(client, {
          type: 'error',
          error: { code: 'INVALID_MESSAGE', message: 'Failed to parse JSON message.' },
        });
      }
    });

    socket.on('close', () => {
      this.clients.delete(client);
    });

    socket.on('error', () => {
      this.clients.delete(client);
    });
  }

  private async handleMessage(client: ClientConnection, message: { action?: string; token?: string; channels?: string[]; symbols?: string[] }) {
    if (message.action === 'auth' && message.token) {
      try {
        const payload = await verifyAccessToken(message.token, this.env);
        client.user = payload;
        client.authenticated = true;
        this.send(client, {
          type: 'auth.success',
          data: { user_id: payload.publicId, participant_id: payload.participantId, role: payload.role },
        });
      } catch {
        this.send(client, {
          type: 'error',
          error: { code: 'AUTHENTICATION_FAILED', message: 'Invalid or expired authentication token.' },
        });
      }
      return;
    }

    if (message.action === 'subscribe') {
      if (message.channels && Array.isArray(message.channels)) {
        for (const ch of message.channels) {
          client.subscriptions.add(ch);
        }
      }
      if (message.symbols && Array.isArray(message.symbols)) {
        for (const s of message.symbols) {
          client.symbols.add(s.toUpperCase());
        }
      }
      this.send(client, {
        type: 'subscription.acknowledged',
        data: {
          channels: Array.from(client.subscriptions),
          symbols: Array.from(client.symbols),
        },
      });
      return;
    }

    if (message.action === 'ping') {
      this.send(client, { type: 'pong', data: { timestamp: new Date().toISOString() } });
      return;
    }
  }

  public broadcast(channel: string, payload: unknown, symbol?: string) {
    for (const client of this.clients) {
      if (client.subscriptions.has(channel)) {
        if (!symbol || client.symbols.size === 0 || client.symbols.has(symbol.toUpperCase())) {
          this.send(client, {
            channel,
            type: `${channel}.update`,
            data: payload,
          });
        }
      }
    }
  }

  public sendToUser(userId: string, channel: string, payload: unknown) {
    for (const client of this.clients) {
      if (client.authenticated && client.user?.userId === userId) {
        this.send(client, {
          channel,
          type: `${channel}.update`,
          data: payload,
        });
      }
    }
  }

  private send(client: ClientConnection, data: unknown) {
    if (client.socket.readyState === client.socket.OPEN) {
      client.socket.send(JSON.stringify(data));
    }
  }
}
