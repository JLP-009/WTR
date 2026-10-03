import { getAuthToken } from './api/client';

type MessageHandler = (data: any) => void;

class WebSocketClient {
  private socket: WebSocket | null = null;
  private url: string;
  private handlers = new Map<string, Set<MessageHandler>>();
  private reconnectTimeout: any = null;
  private isConnecting = false;

  constructor() {
    const wsProto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    this.url = `${wsProto}//${host}/api/v1/ws`;
  }

  public connect() {
    if (this.socket && (this.socket.readyState === WebSocket.OPEN || this.socket.readyState === WebSocket.CONNECTING)) {
      return;
    }
    if (this.isConnecting) return;

    this.isConnecting = true;
    try {
      this.socket = new WebSocket(this.url);

      this.socket.onopen = () => {
        this.isConnecting = false;
        const token = getAuthToken();
        if (token) {
          this.send({ action: 'auth', token });
        }
        this.send({
          action: 'subscribe',
          channels: ['market', 'orders', 'portfolio', 'leaderboard', 'news'],
        });
      };

      this.socket.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          const channel = msg.channel;
          if (channel && this.handlers.has(channel)) {
            this.handlers.get(channel)?.forEach((fn) => fn(msg.data || msg));
          }
          if (msg.type && this.handlers.has(msg.type)) {
            this.handlers.get(msg.type)?.forEach((fn) => fn(msg.data || msg));
          }
        } catch {
          // Ignore non-json messages
        }
      };

      this.socket.onclose = () => {
        this.isConnecting = false;
        this.socket = null;
        this.scheduleReconnect();
      };

      this.socket.onerror = () => {
        this.isConnecting = false;
        if (this.socket) {
          this.socket.close();
        }
      };
    } catch {
      this.isConnecting = false;
      this.scheduleReconnect();
    }
  }

  public subscribe(channel: string, handler: MessageHandler): () => void {
    if (!this.handlers.has(channel)) {
      this.handlers.set(channel, new Set());
    }
    this.handlers.get(channel)!.add(handler);

    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
      this.connect();
    } else {
      this.send({ action: 'subscribe', channels: [channel] });
    }

    return () => {
      this.handlers.get(channel)?.delete(handler);
    };
  }

  public send(data: any) {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify(data));
    }
  }

  private scheduleReconnect() {
    if (this.reconnectTimeout) return;
    this.reconnectTimeout = setTimeout(() => {
      this.reconnectTimeout = null;
      this.connect();
    }, 5000);
  }

  public disconnect() {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
    if (this.socket) {
      this.socket.onclose = null; // Prevent auto-reconnect
      this.socket.close();
      this.socket = null;
    }
    this.isConnecting = false;
    this.handlers.clear();
  }
}

export const wsClient = new WebSocketClient();
