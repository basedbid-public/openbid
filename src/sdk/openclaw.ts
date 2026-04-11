import creationFacetAbi from '@constants/abi/CreationFacet.json';
import {
  CreateMemeArgs,
  CreateMemeResult,
  DexConfig,
  MemeTokenData,
  OpenClawSDKConfig,
  V4HookData,
} from 'interfaces';
import {
  createPublicClient,
  createWalletClient,
  http,
  type Address,
  type Chain,
  type Hex,
} from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { base, bsc, mainnet } from 'viem/chains';

export class OpenClawSDK {
  private publicClient: ReturnType<typeof createPublicClient>;
  private walletClient: ReturnType<typeof createWalletClient>;
  private account: ReturnType<typeof privateKeyToAccount>;
  private contractAddress: Address;
  private chain: Chain;

  constructor(config: OpenClawSDKConfig) {
    this.chain = this.getChain(config.chainId);
    this.contractAddress = config.contractAddress;
    this.account = privateKeyToAccount(config.privateKey);

    this.publicClient = createPublicClient({
      chain: this.chain,
      transport: http(config.rpcUrl),
    });

    this.walletClient = createWalletClient({
      chain: this.chain,
      transport: http(config.rpcUrl),
      account: this.account,
    });
  }

  private getChain(chainId: number): Chain {
    const chains: Record<number, Chain> = {
      [base.id]: base,
      [mainnet.id]: mainnet,
      [bsc.id]: bsc,
    };

    const chain = chains[chainId];
    if (!chain) {
      throw new Error(`Unsupported chain ID: ${chainId}`);
    }
    return chain;
  }

  /**
   * Get the wallet address
   */
  getAddress(): Address {
    return this.account.address;
  }

  /**
   * Build InitialMemeTokenData from a simplified config
   */
  static buildInitialData(config: MemeTokenData): unknown[] {
    return [
      config.baseTokenForPair,
      config.liquidityForHardcap,
      config.liquidityForSoftcap,
      config.marketCap,
      config.maxAllocationPerUser,
      config.maxAllocationPerWhitelistedUser,
      config.whitelistMerkleRoot,
      config.buyReferralFeePer,
      config.sellMemeTokenOwnerFeePer,
      config.buyMemeTokenOwnerFeePer,
      config.finalizeFeePer,
      config.delayTradeTime,
      config.startTime,
      config.endTime,
      config.isWhitelist,
      config._padding ?? 0,
      config.dex.map((d: DexConfig) => [
        d.routerOrPositionManager,
        d.poolId,
        d.fee,
        d.tickSpacing,
        d.per,
        d.isLPBurn,
        d._padding ?? 0,
      ]),
      config.metaData,
    ];
  }

  static buildV4HookData(config: V4HookData): unknown[] {
    return [
      config.hasV4Hook,
      [
        config.hookFeeDistributionConfig.liquidityFeeBps,
        config.hookFeeDistributionConfig.buybackFeeBps,
        config.hookFeeDistributionConfig.rewardFeeBps,
        config.hookFeeDistributionConfig.customWallets,
        config.hookFeeDistributionConfig.customWalletBps,
      ],
      config.feeThreshold,
      config.rewardToken,
      [
        config.rewardPoolKey.currency0,
        config.rewardPoolKey.currency1,
        config.rewardPoolKey.fee,
        config.rewardPoolKey.tickSpacing,
        config.rewardPoolKey.hooks,
      ],
      config.feeKind,
      config.staticPoolFeeBpsBuy,
      config.staticPoolFeeBpsSell,
      config.hookFeeBpsBuy,
      config.hookFeeBpsSell,
      [
        config.dynamicFeeConfig.minBaseFeeBpsBuy,
        config.dynamicFeeConfig.minBaseFeeBpsSell,
        config.dynamicFeeConfig.maxBaseFeeBpsBuy,
        config.dynamicFeeConfig.maxBaseFeeBpsSell,
        config.dynamicFeeConfig.baseFeeFactorBuy,
        config.dynamicFeeConfig.baseFeeFactorSell,
        config.dynamicFeeConfig.defaultBaseFeeBpsBuy,
        config.dynamicFeeConfig.defaultBaseFeeBpsSell,
        config.dynamicFeeConfig.surgeDecayPeriodSeconds,
        config.dynamicFeeConfig.surgeMultiplierPpm,
        config.dynamicFeeConfig.perSwapMode,
        config.dynamicFeeConfig.capAutoTuneStepPpm,
        config.dynamicFeeConfig.capAutoTuneIntervalSeconds,
      ],
      [
        config.tieredFeeConfig.buyFeesBps,
        config.tieredFeeConfig.sellFeesBps,
        config.tieredFeeConfig.buyFeeTierAmountLevels,
        config.tieredFeeConfig.sellFeeTierAmountLevels,
      ],
      config.protectPeriod,
      config.maxBuyPerOrigin,
      config.isAntiSandwich,
      config.cooldownSeconds,
      config.penaltyFeeBps,
      [
        config.volumeConfig.volumeIntervalSeconds,
        config.volumeConfig.volumeLevels,
        config.volumeConfig.volumeMultiplierBps,
      ],
    ];
  }

  /**
   * Generate a deterministic salt for CREATE2 deployment
   */
  static generateSalt(): Hex {
    const timestamp = Math.floor(Date.now() / 1000);
    const random = Math.floor(Math.random() * 1000000);
    const saltNum = BigInt(timestamp * 1000000 + random);
    return `0x${saltNum.toString(16).padStart(64, '0')}`;
  }

  async createMeme(config: CreateMemeArgs): Promise<CreateMemeResult> {
    const args = {
      package: config.package ?? BigInt(0),
      initCode: config.initCode,
      salt: config.salt ?? OpenClawSDK.generateSalt(),
      subBoardTitle: config.subBoardTitle,
      referrer: config.referrer ?? '0x0000000000000000000000000000000000000000',
      totalSupply: config.totalSupply,
      name: config.name,
      symbol: config.symbol,
      decimals: config.decimals ?? 18,
      initialBuyAmount: config.initialBuyAmount ?? BigInt(0),
      isXSale: config.isXSale ?? false,
      initialData: config.initialData,
      v4HookData: config.v4HookData,
      minTokenBalanceForDividends:
        config.minTokenBalanceForDividends ?? BigInt(0),
    };

    const argsArray = [
      args.package,
      args.initCode,
      args.salt,
      args.subBoardTitle,
      args.referrer,
      args.totalSupply,
      args.name,
      args.symbol,
      args.decimals,
      args.initialBuyAmount,
      args.isXSale,
      args.initialData,
      args.v4HookData,
      args.minTokenBalanceForDividends,
    ];

    const gasEstimate = await this.publicClient.estimateContractGas({
      address: this.contractAddress,
      abi: creationFacetAbi,
      functionName: 'createMeme',
      args: argsArray,
      account: this.account,
    });

    const hash = await this.walletClient.writeContract({
      address: this.contractAddress,
      abi: creationFacetAbi,
      functionName: 'createMeme',
      args: argsArray,
      gas: gasEstimate,
      chain: this.chain,
      account: this.account,
    });

    const receipt = await this.publicClient.waitForTransactionReceipt({
      hash,
      timeout: 120_000,
    });

    if (receipt.status === 'reverted') {
      throw new Error(`Transaction reverted at block ${receipt.blockNumber}`);
    }

    return {
      hash,
      receipt,
      blockNumber: receipt.blockNumber,
      gasUsed: receipt.gasUsed,
      status: receipt.status,
      explorerUrl: this.getExplorerUrl(hash),
    };
  }

  private getExplorerUrl(hash: Hex): string {
    const explorers: Record<number, string> = {
      [base.id]: 'https://basescan.org',
      [mainnet.id]: 'https://etherscan.io',
      [bsc.id]: 'https://bscscan.com',
    };

    const baseUrl = explorers[this.chain.id] ?? 'https://etherscan.io';
    return `${baseUrl}/tx/${hash}`;
  }
}
