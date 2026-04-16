import { defineConfig } from 'vitest/config';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    env: {
      DATABASE_URL:
        process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/earth_revibe',
      JWT_SECRET: process.env.JWT_SECRET || 'test-jwt-secret-key-minimum-32-chars-long-for-tests',
      WHATSAPP_PHONE_NUMBER_ID: process.env.WHATSAPP_PHONE_NUMBER_ID || 'test-phone-number-id',
      WHATSAPP_ACCESS_TOKEN: process.env.WHATSAPP_ACCESS_TOKEN || 'test-whatsapp-access-token',
      SUPABASE_URL: process.env.SUPABASE_URL || 'https://test.supabase.co',
      SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY || 'test-anon-key-placeholder-for-tests',
      SUPABASE_SERVICE_ROLE_KEY:
        process.env.SUPABASE_SERVICE_ROLE_KEY || 'test-service-role-key-placeholder',
    },
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.test.ts'],
    exclude: ['**/node_modules/**', '**/dist/**'],
    coverage: {
      provider: 'v8',
      include: ['src/services/**', 'src/middleware/**', 'src/controllers/**'],
    },
    testTimeout: 15000,
    hookTimeout: 15000,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
      '@earth-revibe/shared': path.resolve(__dirname, '../../packages/shared/dist/index.js'),
      '@earth-revibe/db': path.resolve(__dirname, '../../packages/db/dist/index.js'),
    },
  },
});
