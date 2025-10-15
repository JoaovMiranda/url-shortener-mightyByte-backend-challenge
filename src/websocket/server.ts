import WebSocket, { WebSocketServer } from 'ws';
import { Server } from 'http';
import { PendingDelivery } from '../types';

export class ShortUrlWebSocketServer {
  private wss: WebSocketServer;
  private pendingDeliveries: Map<string, PendingDelivery> = new Map();
  private retryInterval!: NodeJS.Timeout;

  constructor(server: Server) {
    this.wss = new WebSocketServer({ server });
    this.setupWebSocket();
    this.startRetryMechanism();
  }

  private setupWebSocket(): void {
    this.wss.on('connection', (ws: WebSocket) => {
      console.log('New WebSocket connection established');

      ws.on('message', (message: Buffer) => {
        try {
          const data = JSON.parse(message.toString());
          this.handleMessage(data, ws);
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      });

      ws.on('close', () => {
        console.log('WebSocket connection closed');
      });
    });
  }

  private handleMessage(data: any, ws: WebSocket): void {
    if (data.type === 'ACKNOWLEDGE' && data.deliveryId) {
      console.log(`Received acknowledgement for delivery: ${data.deliveryId}`);
      this.pendingDeliveries.delete(data.deliveryId);
    } else if (data.type === 'CLIENT_READY') {
      // Client is ready to receive messages
      console.log('Client is ready to receive messages');
    }
  }

  public async deliverShortUrl(
    shortUrl: string,
    originalUrl: string
  ): Promise<void> {
    const deliveryId = this.generateDeliveryId();

    const delivery: PendingDelivery = {
      shortUrl,
      originalUrl,
      attempts: 0,
      createdAt: new Date(),
    };

    this.pendingDeliveries.set(deliveryId, delivery);
    this.broadcastShortUrl(deliveryId, shortUrl);
  }

  private broadcastShortUrl(deliveryId: string, shortUrl: string): void {
    const message = JSON.stringify({
      type: 'SHORT_URL_READY',
      deliveryId,
      shortenedURL: shortUrl,
      timestamp: new Date().toISOString(),
    });

    let delivered = false;
    this.wss.clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
        delivered = true;
      }
    });

    if (!delivered) {
      console.log('No WebSocket clients connected, message will be retried');
    }
  }

  private startRetryMechanism(): void {
    this.retryInterval = setInterval(() => {
      const now = new Date();
      this.pendingDeliveries.forEach((delivery, deliveryId) => {
        const timeSinceCreation = now.getTime() - delivery.createdAt.getTime();

        if (timeSinceCreation > 30000) {
          // 30 seconds timeout
          console.log(`Removing expired delivery: ${deliveryId}`);
          this.pendingDeliveries.delete(deliveryId);
          return;
        }

        // Retry every 5 seconds for pending deliveries
        if (timeSinceCreation > delivery.attempts * 5000) {
          delivery.attempts++;
          console.log(
            `Retry attempt ${delivery.attempts} for delivery: ${deliveryId}`
          );
          this.broadcastShortUrl(deliveryId, delivery.shortUrl);
        }
      });
    }, 5000); // Check every 5 seconds
  }

  private generateDeliveryId(): string {
    return Math.random().toString(36).substring(2) + Date.now().toString(36);
  }

  public close(): void {
    if (this.retryInterval) {
      clearInterval(this.retryInterval);
    }
    this.wss.close();
  }
}
