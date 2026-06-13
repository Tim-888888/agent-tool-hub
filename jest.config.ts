import type { Config } from 'jest';

const config: Config = {
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@opennextjs/cloudflare$': '<rootDir>/__tests__/mocks/opennext-cloudflare.ts',
    '^next-auth$': '<rootDir>/__tests__/mocks/next-auth.ts',
    '^next-auth/react$': '<rootDir>/__tests__/mocks/next-auth-react.ts',
    '^next-auth/providers/github$': '<rootDir>/__tests__/mocks/next-auth-github.ts',
    '^@auth/prisma-adapter$': '<rootDir>/__tests__/mocks/prisma-adapter.ts',
    '^@prisma/adapter-d1$': '<rootDir>/__tests__/mocks/prisma-adapter-d1.ts',
  },
  testPathIgnorePatterns: ['<rootDir>/node_modules/', '<rootDir>/.next/', '<rootDir>/.open-next/', '<rootDir>/__tests__/mocks/'],
  modulePathIgnorePatterns: ['<rootDir>/.next/', '<rootDir>/.open-next/'],
  transform: {
    '^.+\\.tsx?$': ['ts-jest', {
      tsconfig: 'tsconfig.json',
      jsx: 'react-jsx',
    }],
  },
};

export default config;
