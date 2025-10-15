import { Request, Response, NextFunction } from 'express';
import { createShortUrl, getURL, getUrls } from '../controllers/url.controller';
import { wsServer } from '../server';

jest.mock('../server', () => ({
  wsServer: {
    deliverShortUrl: jest.fn().mockResolvedValue(undefined),
  },
}));

const mockUrlStore = new Map();
jest.mock('../controllers/url.controller', () => {
  const originalModule = jest.requireActual('../controllers/url.controller');
  return {
    ...originalModule,
    urlStore: mockUrlStore,
  };
});

jest.mock('../controllers/url.controller', () => {
  const mockUrlStore = new Map();
  const originalModule = jest.requireActual('../controllers/url.controller');

  return {
    ...originalModule,
    urlStore: mockUrlStore,
    // Exportamos o mockUrlStore para usar nos testes
    __mockUrlStore: mockUrlStore,
  };
});

describe('URL Controller', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    mockUrlStore.clear();
    jest.clearAllMocks();

    mockReq = {
      body: {},
      params: {},
      protocol: 'http',
      get: jest.fn().mockReturnValue('localhost:3000'),
    };

    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      end: jest.fn().mockReturnThis(),
      redirect: jest.fn().mockReturnThis(),
    };

    mockNext = jest.fn();
  });

  describe('createShortUrl', () => {
    it('should return 400 if URL is missing', async () => {
      mockReq.body = {};

      await createShortUrl(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockNext).toHaveBeenCalledWith(
        new Error('url parameter is required')
      );
    });

    it('should return 400 for invalid URL format', async () => {
      mockReq.body = { url: 'invalid-url' };

      await createShortUrl(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockNext).toHaveBeenCalledWith(new Error('Invalid URL format'));
    });

    it('should create short URL for valid URL', async () => {
      mockReq.body = { url: 'https://example.com' };

      await createShortUrl(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mockRes.end).toHaveBeenCalled();
      expect(wsServer.deliverShortUrl).toHaveBeenCalled();
    });

    it('should return existing short URL if URL already exists', async () => {
      const existingUrl = 'https://example.com';
      const shortCode = 'abc123';
      mockUrlStore.set(shortCode, existingUrl);

      mockReq.body = { url: existingUrl };

      await createShortUrl(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message:
          'URL already exists. Short URL will be delivered via WebSocket.',
      });
      expect(wsServer.deliverShortUrl).toHaveBeenCalledWith(
        'http://localhost:3000/abc123',
        existingUrl
      );
    });

    it('should handle URL normalization', async () => {
      mockReq.body = { url: 'example.com' };

      await createShortUrl(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mockRes.end).toHaveBeenCalled();
      expect(wsServer.deliverShortUrl).toHaveBeenCalled();
    });
  });

  describe('getURL', () => {
    it('should return 400 if shortUrl is missing', async () => {
      mockReq.params = {};

      await getURL(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'shortUrl is required',
      });
    });

    it('should return 404 if short URL not found', async () => {
      mockReq.params = { shortUrl: 'nonexistent' };

      await getURL(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'URL not found',
      });
    });

    it('should redirect to original URL if found', async () => {
      const shortCode = 'abc123';
      const originalUrl = 'https://example.com';
      mockUrlStore.set(shortCode, originalUrl);

      mockReq.params = { shortUrl: shortCode };

      await getURL(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.redirect).toHaveBeenCalledWith(originalUrl);
    });
  });

  describe('getUrls', () => {
    it('should return all URLs with correct structure', async () => {
      mockUrlStore.set('abc123', 'https://example.com');
      mockUrlStore.set('def456', 'https://google.com');

      await getUrls(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        count: 2,
        urls: [
          {
            shortCode: 'abc123',
            originalUrl: 'https://example.com',
            shortenedURL: 'http://localhost:3000/abc123',
          },
          {
            shortCode: 'def456',
            originalUrl: 'https://google.com',
            shortenedURL: 'http://localhost:3000/def456',
          },
        ],
      });
    });

    it('should return empty array when no URLs exist', async () => {
      await getUrls(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        count: 0,
        urls: [],
      });
    });
  });
});
