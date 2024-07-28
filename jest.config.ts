/**
 * For a detailed explanation regarding each configuration property, visit:
 * https://jestjs.io/docs/configuration
 */

import type {Config} from 'jest';

const config: Config = {
  preset: 'ts-jest',
  testTimeout: 20000,
  testEnvironment: "node",
  transform: {
    "^.+.tsx?$": ["ts-jest",{}],
  },
  clearMocks: true,
  collectCoverage: true,
  coverageDirectory: "coverage",

  coveragePathIgnorePatterns: [
    "\\\\node_modules\\\\"
  ],

  coverageReporters: ["lcov"],
  rootDir : "src",
  moduleDirectories: [
    "node_modules"
  ],
  testMatch: ["**/*.spec.ts"],
};

export default config;
