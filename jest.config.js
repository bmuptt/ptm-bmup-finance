module.exports = {
  testEnvironment: 'node',
  roots: ['<rootDir>/tests'],
  testMatch: ['**/__tests__/**/*.ts', '**/?(*.)+(spec|test).ts'],
  transform: {
    '^.+\\.ts$': 'babel-jest',
  },
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/main.ts',
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  setupFilesAfterEnv: ['<rootDir>/tests/test-util.ts'],
  testTimeout: 30000,
  // Allow parallel execution for better performance
  // For database-per-worker setup, uncomment maxWorkers: 1 and use --runInBand
  // maxWorkers: 1, // Uncomment to run tests sequentially if database conflicts occur
  forceExit: true, // Force exit after tests complete
  detectOpenHandles: true, // Detect open handles
};
