import { Request, Response, NextFunction } from 'express';
import { ShortUrlRequest } from '../types';
import { wsServer } from '../server';

const urlStore: Map<string, string> = new Map();

export const generateShortCode = (): string => {
  const chars =
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < 5; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

export const getBaseUrl = (req: Request): string => {
  return `${req.protocol}://${req.get('host')}`;
};

export const createShortUrl = async (
  req: Request<{}, {}, ShortUrlRequest>,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { url } = req.body;

    if (!url) {
      res.status(400);
      next(new Error('url parameter is required'));
      return;
    }

    let normalizedUrl: string;
    try {
      new URL(url);
      normalizedUrl = url;
    } catch (error) {
      try {
        normalizedUrl = `https://${url}`;
        new URL(normalizedUrl);
      } catch (secondError) {
        res.status(400);
        next(new Error('Invalid URL format'));
        return;
      }
    }

    for (const [shortCode, storedUrl] of urlStore.entries()) {
      if (storedUrl === normalizedUrl) {
        const existingShortUrl = `${getBaseUrl(req)}/${shortCode}`;

        await wsServer.deliverShortUrl(existingShortUrl, normalizedUrl);

        res.status(200).json({
          success: true,
          message:
            'URL already exists. Short URL will be delivered via WebSocket.',
        });
        return;
      }
    }

    let shortCode: string;
    let attempts = 0;
    do {
      shortCode = generateShortCode();
      attempts++;
      if (attempts > 10) {
        res.status(500);
        next(new Error('Could not generate unique short code'));
        return;
      }
    } while (urlStore.has(shortCode));

    urlStore.set(shortCode, normalizedUrl);
    const shortenedURL = `${getBaseUrl(req)}/${shortCode}`;

    await wsServer.deliverShortUrl(shortenedURL, normalizedUrl);

    res.status(201).end();
  } catch (error) {
    console.error(error);
    res.status(500);
    next(new Error((error as Error).message));
  }
};

export const getURL = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { shortUrl } = req.params;

    if (!shortUrl) {
      res.status(400).json({ error: 'shortUrl is required' });
      return;
    }

    const originalUrl = urlStore.get(shortUrl);
    if (!originalUrl) {
      res.status(404).json({ error: 'URL not found' });
      return;
    }

    res.redirect(originalUrl);
  } catch (error) {
    console.error(error);
    res.status(500);
    next(new Error((error as Error).message));
  }
};

export const getUrls = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const urls = Array.from(urlStore.entries()).map(
      ([shortCode, originalUrl]) => ({
        shortCode,
        originalUrl,
        shortenedURL: `${getBaseUrl(req)}/${shortCode}`,
      })
    );

    res.status(200).json({
      success: true,
      count: urls.length,
      urls,
    });
  } catch (error) {
    console.error(error);
    res.status(500);
    next(new Error((error as Error).message));
  }
};
