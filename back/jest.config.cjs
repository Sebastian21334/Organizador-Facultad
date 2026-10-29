module.exports = {
  testEnvironment: 'node',
  testMatch: ['<rootDir>/src/**/*.spec.ts'],
  transform: { '^.+\\.ts$': ['ts-jest', { tsconfig: 'tsconfig.json' }] },
  moduleNameMapper: { '^src/(.*)$': '<rootDir>/src/$1' },
  cacheDirectory: '<rootDir>/.tmp/jest',
};
