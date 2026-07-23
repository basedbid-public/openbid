export class SeedGenerator {
  static generateRandomString(length: number): string {
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  static generateRandomNumericString(length: number): string {
    return Math.floor(
      10 ** (length - 1) + Math.random() * 9 * 10 ** (length - 1),
    ).toString();
  }

  /**
   * Generates a random board seed in format: xxxxxxxx-yyyyyyyy
   * Example: "mpd06g4a-t2hj72po"
   * @deprecated Prefer {@link boardSeedFromTitle} - modern boards use the
   * display title as the on-chain id, which makes server-side duplicate-title
   * checks and title-based board lookups work.
   */
  static generateBoardSeed(
    prefixLength: number = 8,
    suffixLength: number = 8,
  ): string {
    const prefix = this.generateRandomString(prefixLength);
    const suffix = this.generateRandomString(suffixLength);
    return `${prefix}-${suffix}`;
  }

  /**
   * On-chain board id derived from the display title (spaces -> dashes,
   * truncated to the 32-byte Solana PDA seed limit) - same rule as the
   * basedbid webapp's `subBoardIdFromTitle`.
   */
  static boardSeedFromTitle(title: string): string {
    return title.trim().replace(/\s+/g, '-').slice(0, 32);
  }

  static generateNumericSeed(length: number = 8): string {
    return this.generateRandomNumericString(length);
  }
}
