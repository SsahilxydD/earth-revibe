import { describe, it, expect } from 'vitest';
import request from 'supertest';

/**
 * Integration tests for public API endpoints.
 * Tests real responses from the deployed API — no mocking.
 */

const API_URL = process.env.API_TEST_URL || 'https://earth-revibeapi-production.up.railway.app';

describe('Products API', () => {
  it('GET /api/v1/products returns paginated product list', async () => {
    const res = await request(API_URL).get('/api/v1/products?page=1&limit=5').timeout(10000);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toBeDefined();
    expect(Array.isArray(res.body.data.products || res.body.data)).toBe(true);
  });

  it('GET /api/v1/products returns pagination metadata', async () => {
    const res = await request(API_URL).get('/api/v1/products?page=1&limit=2').timeout(10000);

    expect(res.status).toBe(200);
    if (res.body.data.pagination) {
      expect(res.body.data.pagination.page).toBeDefined();
      expect(res.body.data.pagination.limit).toBeDefined();
      expect(res.body.data.pagination.total).toBeDefined();
    }
  });

  it('GET /api/v1/products/:slug returns single product', async () => {
    // First get a product slug from the list
    const listRes = await request(API_URL).get('/api/v1/products?page=1&limit=1').timeout(10000);

    const products = listRes.body.data.products || listRes.body.data;
    if (!products || products.length === 0) return; // Skip if no products

    const slug = products[0].slug;
    const res = await request(API_URL).get(`/api/v1/products/${slug}`).timeout(10000);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toBeDefined();
    expect(res.body.data.slug).toBe(slug);
  });

  it('GET /api/v1/products/:slug returns 404 for non-existent product', async () => {
    const res = await request(API_URL)
      .get('/api/v1/products/this-product-does-not-exist-xyz-123')
      .timeout(10000);

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });
});

describe('Categories API', () => {
  it('GET /api/v1/categories returns category list', async () => {
    const res = await request(API_URL).get('/api/v1/categories').timeout(10000);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  it('GET /api/v1/categories/:slug returns category with products', async () => {
    const listRes = await request(API_URL).get('/api/v1/categories').timeout(10000);

    if (!listRes.body.data || listRes.body.data.length === 0) return;

    const slug = listRes.body.data[0].slug;
    const res = await request(API_URL).get(`/api/v1/categories/${slug}`).timeout(10000);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});

describe('Search API', () => {
  it('GET /api/v1/search?q=shirt returns results', async () => {
    const res = await request(API_URL).get('/api/v1/search?q=shirt').timeout(10000);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('GET /api/v1/search/autocomplete?q=sh returns suggestions', async () => {
    const res = await request(API_URL).get('/api/v1/search/autocomplete?q=sh').timeout(10000);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('GET /api/v1/search with empty query returns error or empty', async () => {
    const res = await request(API_URL).get('/api/v1/search?q=').timeout(10000);

    // Either 400 (validation error) or 200 with empty results — both are valid
    expect([200, 400]).toContain(res.status);
  });
});

describe('Blog API', () => {
  it('GET /api/v1/blog returns blog posts', async () => {
    const res = await request(API_URL).get('/api/v1/blog').timeout(10000);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});

describe('Homepage API', () => {
  it('GET /api/v1/homepage returns homepage content', async () => {
    const res = await request(API_URL).get('/api/v1/homepage').timeout(10000);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});

describe('Auth API — Error Cases', () => {
  it('POST /api/v1/auth/login with invalid body returns 400', async () => {
    const res = await request(API_URL)
      .post('/api/v1/auth/login')
      .send({ email: 'not-an-email' })
      .timeout(10000);

    expect([400, 422]).toContain(res.status);
    expect(res.body.success).toBe(false);
  });

  it('POST /api/v1/auth/register with missing fields returns 400', async () => {
    const res = await request(API_URL)
      .post('/api/v1/auth/register')
      .send({ email: 'test@test.com' }) // Missing password, name
      .timeout(10000);

    expect([400, 422]).toContain(res.status);
    expect(res.body.success).toBe(false);
  });

  it('GET /api/v1/auth/me without token returns 401', async () => {
    const res = await request(API_URL).get('/api/v1/auth/me').timeout(10000);

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });
});

describe('Protected Endpoints — Auth Required', () => {
  it('GET /api/v1/cart without token returns 401', async () => {
    const res = await request(API_URL).get('/api/v1/cart').timeout(10000);

    expect(res.status).toBe(401);
  });

  it('GET /api/v1/orders without token returns 401', async () => {
    const res = await request(API_URL).get('/api/v1/orders').timeout(10000);

    expect(res.status).toBe(401);
  });

  it('GET /api/v1/wishlist without token returns 401', async () => {
    const res = await request(API_URL).get('/api/v1/wishlist').timeout(10000);

    expect(res.status).toBe(401);
  });

  it('GET /api/v1/addresses without token returns 401', async () => {
    const res = await request(API_URL).get('/api/v1/addresses').timeout(10000);

    expect(res.status).toBe(401);
  });
});

describe('Admin Endpoints — Auth Required', () => {
  it('GET /api/v1/admin/orders without token returns 401', async () => {
    const res = await request(API_URL).get('/api/v1/admin/orders').timeout(10000);

    expect(res.status).toBe(401);
  });

  it('GET /api/v1/admin/customers without token returns 401', async () => {
    const res = await request(API_URL).get('/api/v1/admin/customers').timeout(10000);

    expect(res.status).toBe(401);
  });
});

describe('Response Format Consistency', () => {
  it('all public endpoints return { success, data } format', async () => {
    const endpoints = ['/api/v1/products?page=1&limit=1', '/api/v1/categories', '/api/v1/homepage'];

    for (const endpoint of endpoints) {
      const res = await request(API_URL).get(endpoint).timeout(10000);
      expect(res.body).toHaveProperty('success');
      if (res.body.success) {
        expect(res.body).toHaveProperty('data');
      }
    }
  });
});
