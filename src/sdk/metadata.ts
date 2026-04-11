import type { IpfsMetadata } from 'interfaces';

export class IpfsMetadataBuilder {
  private metadata: Partial<IpfsMetadata> = {
    decimals: 18,
    twitter: '',
    telegram: '',
    website: '',
    discord: '',
    description: '',
    whitelist: [],
  };

  static create(): IpfsMetadataBuilder {
    return new IpfsMetadataBuilder();
  }

  withTokenInfo(name: string, symbol: string, decimals: number = 18): this {
    this.metadata.name = name;
    this.metadata.symbol = symbol;
    this.metadata.decimals = decimals;
    return this;
  }

  withSupply(totalSupply: string, seed: string): this {
    this.metadata.totalSupply = totalSupply;
    this.metadata.seed = seed;
    return this;
  }

  withLogo(logoUrl: string): this {
    this.metadata.logo = logoUrl;
    return this;
  }

  withBoard(board: string, boardOwner: string): this {
    this.metadata.board = board;
    this.metadata.boardOwner = boardOwner;
    return this;
  }

  withSocials(options: {
    twitter?: string;
    telegram?: string;
    website?: string;
    discord?: string;
  }): this {
    if (options.twitter !== undefined) this.metadata.twitter = options.twitter;
    if (options.telegram !== undefined)
      this.metadata.telegram = options.telegram;
    if (options.website !== undefined) this.metadata.website = options.website;
    if (options.discord !== undefined) this.metadata.discord = options.discord;
    return this;
  }

  withDescription(description: string): this {
    this.metadata.description = description;
    return this;
  }

  withWhitelist(addresses: string[]): this {
    this.metadata.whitelist = addresses;
    return this;
  }

  build(): IpfsMetadata {
    if (!this.metadata.name) throw new Error('Token name is required');
    if (!this.metadata.symbol) throw new Error('Token symbol is required');
    if (!this.metadata.totalSupply) throw new Error('Total supply is required');
    if (!this.metadata.seed) throw new Error('Seed is required');
    if (!this.metadata.logo) throw new Error('Logo URL is required');
    if (!this.metadata.board) throw new Error('Board is required');
    if (!this.metadata.boardOwner) throw new Error('Board owner is required');

    return this.metadata as IpfsMetadata;
  }

  /**
   * Build and serialize to JSON string for IPFS upload
   */
  buildJson(): string {
    return JSON.stringify(this.build(), null, 2);
  }
}

/**
 * Preset configurations for common meme token setups
 */
export const MemePresets = {
  /**
   * Standard meme token with default settings
   */
  standard: (name: string, symbol: string): Partial<IpfsMetadata> => ({
    name,
    symbol,
    decimals: 18,
    totalSupply: '1000000000000000000000000', // 1M tokens
    seed: Math.floor(Math.random() * 1000000000).toString(),
    board: 'based',
    boardOwner: 'based',
    twitter: '',
    telegram: '',
    website: '',
    discord: '',
    description: '',
    whitelist: [],
  }),

  /**
   * Community meme token with larger supply
   */
  community: (name: string, symbol: string): Partial<IpfsMetadata> => ({
    name,
    symbol,
    decimals: 18,
    totalSupply: '10000000000000000000000000', // 10M tokens
    seed: Math.floor(Math.random() * 1000000000).toString(),
    board: 'community',
    boardOwner: 'community',
    twitter: '',
    telegram: '',
    website: '',
    discord: '',
    description: '',
    whitelist: [],
  }),

  /**
   * Meme token with socials pre-configured
   */
  withSocials: (
    name: string,
    symbol: string,
    socials: {
      twitter?: string;
      telegram?: string;
      website?: string;
    },
  ): Partial<IpfsMetadata> => ({
    name,
    symbol,
    decimals: 18,
    totalSupply: '1000000000000000000000000',
    seed: Math.floor(Math.random() * 1000000000).toString(),
    board: 'based',
    boardOwner: 'based',
    twitter: socials.twitter ?? '',
    telegram: socials.telegram ?? '',
    website: socials.website ?? '',
    discord: '',
    description: '',
    whitelist: [],
  }),
};
