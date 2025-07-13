// @ts-check

import { createDefaultEsmPreset } from "ts-jest";

/**
 * @type {import('jest').Config}
 */
export default {
  ...createDefaultEsmPreset({
    tsconfig: "<rootDir>/tsconfig.json",
  }),
  testEnvironment: "jsdom",
  moduleNameMapper: {
    "^(\\.{1,2}/.*)\\.js$": "$1",
    "^@/(.*)$": "<rootDir>/src/$1",
  },
  collectCoverageFrom: [
    "<rootDir>/src/**/*",
    "!<rootDir>/src/**/*.d.ts",
    "!<rootDir>/src/**/index.html",
    "!<rootDir>/src/**/style.css",
  ],
  testPathIgnorePatterns: ["/node_modules", "/dist"],
  setupFilesAfterEnv: ["<rootDir>/jest.setup.ts"],
  testMatch: [
    "<rootDir>/src/**/__tests__/**/*.(test|spec).(ts|js)",
    "<rootDir>/src/**/*.(test|spec).(ts|js)",
  ],
  globals: {
    chrome: {},
  },
};
