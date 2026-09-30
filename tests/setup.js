/**
 * NIVARAN — Test Setup
 *
 * Loads .env before any test runs.
 * Uses a separate test database if TEST_DATABASE_URL is set,
 * otherwise falls back to DATABASE_URL.
 */

import 'dotenv/config';

if (process.env.TEST_DATABASE_URL) {
  process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
}
