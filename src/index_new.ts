#!/usr/bin/env node

// Spark Clone - Main Entry Point
// Backward compatibility - delegates to the new CLI entry point

import { main } from './cli/cli.js';

// Run the application - delegate to the new CLI entry point
if (process.argv[1]?.endsWith('index.js') || process.argv[1]?.endsWith('index.ts')) {
  main().catch((error) => {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  });
}

// Re-export for programmatic usage
export { SparkApplication } from './SparkApplication.js';
