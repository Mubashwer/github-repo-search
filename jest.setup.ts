import { jest, beforeEach } from "@jest/globals";

// Mock Chrome APIs that are actually used in the codebase
const mockChrome = {
  runtime: {
    getURL: jest.fn((path) => `chrome-extension://test-id/${path}`),
    sendMessage: jest.fn(() => Promise.resolve({ success: true })),
    onMessage: {
      addListener: jest.fn(),
      removeListener: jest.fn(),
    },
  },
  storage: {
    local: {
      get: jest.fn(() => Promise.resolve({})),
      set: jest.fn(() => Promise.resolve()),
      remove: jest.fn(() => Promise.resolve()),
    },
  },
  tabs: {
    create: jest.fn(() => Promise.resolve({ id: 1 })),
    remove: jest.fn(() => Promise.resolve()),
  },
};

Object.defineProperty(global, "chrome", {
  value: mockChrome,
  writable: true,
});

// Mock fetch for GitHub API calls
Object.defineProperty(global, "fetch", {
  value: jest.fn(),
  writable: true,
});

// Reset all mocks before each test
beforeEach(() => {
  jest.clearAllMocks();
});
