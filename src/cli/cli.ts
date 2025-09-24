#!/usr/bin/env node

// Spark Clone - CLI Entry Point
// Executable entry point that initializes and runs the application

import { SparkApplication } from '../SparkApplication.js';

// Main execution
async function main(): Promise<void> {
  const app = new SparkApplication();
  await app.initialize();
  await app.run();
}

// Run the application
if (process.argv[1]?.endsWith('cli.js') || process.argv[1]?.endsWith('cli.ts')) {
  main().catch((error) => {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  });
}

export { main };
