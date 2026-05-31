export class LogHelper {
  static printSectionWithSeparator(title: string) {
    const separator = '-'.repeat(title.length);

    console.log(title);
    console.log(separator);
  }

  static printApiPayload(endpoint: string, payload: Record<string, unknown>) {
    console.log(`\nAPI Payload for ${endpoint}:`);
    console.dir(payload, { depth: null });
  }

  static printDryRunSummary(
    endpoint: string,
    payload: Record<string, unknown>,
  ) {
    console.log(`Skipping API call to ${endpoint} (dry-run mode)`);
    console.log('\n========== DRY RUN COMPLETE ==========');
    console.log(`Would have called: POST ${endpoint}`);
    console.dir(payload, { depth: null });
    console.log('========================================\n');
  }

  static printResult(result: Record<string, unknown>) {
    console.log('\n--- RESULT ---');
    console.table(result);
  }
}
