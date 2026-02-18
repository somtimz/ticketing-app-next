// e2e/fixtures.ts
import { test as base, expect } from '@playwright/test';

// Re-export so spec files import from fixtures, not directly from @playwright/test.
// Add custom fixture types here if needed in the future.
export const test = base;
export { expect };
