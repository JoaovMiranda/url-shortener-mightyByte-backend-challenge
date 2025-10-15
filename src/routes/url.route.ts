import express from 'express';

import { createShortUrl, getURL, getUrls } from '../controllers/url.controller';

const router = express.Router();

router.post('/url', createShortUrl);
router.get('/urls', getUrls);
router.get('/:shortUrl', getURL);

export default router;
