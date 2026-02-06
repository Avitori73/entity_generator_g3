import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    // Use the current working directory for tests
    globals: true,
    environment: 'node',
    // Include test files from test directory and other locations
    include: ['test/**/*.test.ts', 'test/**/*.spec.ts', 'src/**/*.test.ts', 'src/**/*.spec.ts'],
    // Exclude node_modules and build outputs
    exclude: ['**/node_modules/**', '**/dist/**', '**/build/**', '**/output/**'],
    // Specify output directory for reports and results
    outputFile: {
      json: './vitest-results.json',
      junit: './vitest-results.xml'
    },
    // Coverage output directory
    coverage: {
      reportsDirectory: './coverage'
    }
  }
})
