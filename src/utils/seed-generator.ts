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
   */
  static generateBoardSeed(
    prefixLength: number = 8,
    suffixLength: number = 8,
  ): string {
    const prefix = this.generateRandomString(prefixLength);
    const suffix = this.generateRandomString(suffixLength);
    return `${prefix}-${suffix}`;
  }

  static generateNumericSeed(length: number = 8): string {
    return this.generateRandomNumericString(length);
  }
}
