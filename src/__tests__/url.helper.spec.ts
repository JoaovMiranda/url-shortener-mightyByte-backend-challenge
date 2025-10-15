import { generateShortCode, getBaseUrl } from '../controllers/url.controller';
import { Request } from 'express';

describe('URL Helper Functions', () => {
    describe('generateShortCode', () => {
        it('should generate a 5-character code', () => {
            const code = generateShortCode();
            expect(code).toHaveLength(5);
        });

        it('should generate alphanumeric characters', () => {
            const code = generateShortCode();
            expect(code).toMatch(/^[A-Za-z0-9]{5}$/);
        });

        it('should generate different codes on multiple calls', () => {
            const code1 = generateShortCode();
            const code2 = generateShortCode();
            expect(code1).not.toBe(code2);
        });
    });

    describe('getBaseUrl', () => {
        it('should construct base URL from request', () => {
            const mockReq = {
                protocol: 'https',
                get: jest.fn().mockReturnValue('api.example.com')
            } as unknown as Request;

            const baseUrl = getBaseUrl(mockReq);
            expect(baseUrl).toBe('https://api.example.com');
        });
    });
});