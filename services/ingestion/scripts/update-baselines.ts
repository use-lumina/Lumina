#!/usr/bin/env bun

/**
 * Manual Baseline Update Script
 *
 * Run this script to manually update cost baselines for all service+endpoint combinations.
 * Useful for:
 * - Initial baseline population
 * - Testing baseline calculation
 * - One-off baseline updates
 *
 * Usage:
 *   bun run services/ingestion/scripts/update-baselines.ts
 */

import { updateAllBaselines } from '../src/jobs/update-baselines';

async function main() {
  console.log('╔════════════════════════════════════════════════════════╗');
  console.log('║       Lumina Baseline Update - Manual Run             ║');
  console.log('╚════════════════════════════════════════════════════════╝\n');

  try {
    const result = await updateAllBaselines('default-customer');

    console.log('\n╔════════════════════════════════════════════════════════╗');
    console.log('║                    Final Summary                       ║');
    console.log('╚════════════════════════════════════════════════════════╝');
    console.log(`Status: ${result.success ? '✅ SUCCESS' : '❌ FAILED'}`);
    console.log(`\nTotal Results:`);
    console.log(`  - Updated:  ${result.total.updated} baselines`);
    console.log(`  - Skipped:  ${result.total.skipped} (insufficient data)`);
    console.log(`  - Errors:   ${result.total.errors}`);
    console.log(`\nBy Window:`);
    console.log(
      `  1h:  ${result.byWindow['1h'].updated} updated, ${result.byWindow['1h'].skipped} skipped`
    );
    console.log(
      `  24h: ${result.byWindow['24h'].updated} updated, ${result.byWindow['24h'].skipped} skipped`
    );
    console.log(
      `  7d:  ${result.byWindow['7d'].updated} updated, ${result.byWindow['7d'].skipped} skipped`
    );

    if (result.success) {
      console.log('\n🎉 Baselines updated successfully!');
      console.log('   The cost anomalies page should now show accurate percentages.\n');
      process.exit(0);
    } else {
      console.log('\n⚠️  Baseline update completed with errors. Check logs above.\n');
      process.exit(1);
    }
  } catch (error) {
    console.error('\n❌ Fatal error updating baselines:');
    console.error(error);
    process.exit(1);
  }
}

main();
