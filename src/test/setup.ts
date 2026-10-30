// Global test setup: jest-dom matchers and per-test cleanup of browser API stubs.
import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';
import { restoreAllStubs } from './stubs.ts';

afterEach(() => {
  cleanup();
  restoreAllStubs();
});
