export interface ShortUrlRequest {
  url: string;
}

export interface PendingDelivery {
  shortUrl: string;
  originalUrl: string;
  attempts: number;
  createdAt: Date;
  clientId?: string;
}
