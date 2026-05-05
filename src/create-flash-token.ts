import { CreateFlashTokenEvmApi } from '@interfaces/flash-token/create/evm/api';
import { API_URL } from 'constants/api-url';
import 'dotenv/config';
import { CreateFlashTokenEvmSdk } from 'interfaces/flash-token/create/evm/sdk';
import { validateEnvironment } from 'schema/environment';
import { evmFlashTokenCreateSdkSchema } from 'schema/flash-token/create/sdk';
import { BasedBidApi } from 'utils/based-bid-api';
import { initRpcClients } from 'utils/init-wallet';
import { IpfsUpload } from 'utils/ipfs-upload';
import { sendTransaction } from 'utils/send-transaction';

import flashLaunchV3Abi from '@constants/abi/FlashLaunchForV3Facet.json';
import flashLaunchV4Abi from '@constants/abi/FlashLaunchForV4Facet.json';
import { EvmDexType } from '@enums/evm';
import {
  CooldownDurationType,
  MaxBuyPerOriginType,
  PenaltyFeeType,
  ProtectPeriodType,
  RewardTokenType,
  VolatilityDecayPeriodType,
  VolatilityMultiplierType,
  VolatilityTriggerType,
} from '@enums/fee-builder';
import { CreateFlashTokenEvmResponse } from '@interfaces/flash-token/create/evm/response';
import { evmFlashTokenCreateApiSchema } from 'schema/flash-token/create/api';
import { normalizeByAbi } from 'utils/normalize-abi';
import { base } from 'viem/chains';

export const createFlashToken = async (args: CreateFlashTokenEvmSdk) => {
  const env = validateEnvironment();

  const argsValidated = evmFlashTokenCreateSdkSchema.safeParse(args);
  if (!argsValidated.success) {
    throw new Error('Invalid input arguments: ' + argsValidated.error.message);
  }

  const { publicClient, walletClient, account } = initRpcClients(
    args.chainId,
    env.RPC_URL,
    env.PRIVATE_KEY,
  );

  const logoUrl = await IpfsUpload.uploadImage(args.token.metadata.logo);

  const metadataIpfs = {
    name: args.token.name,
    symbol: args.token.symbol,
    decimals: 18,
    totalSupply: args.token.totalSupply,
    logo: logoUrl,
    board: args.sale.boardTitle,
    twitter: args.token.metadata.twitter,
    telegram: args.token.metadata.telegram,
    website: args.token.metadata.website,
    discord: args.token.metadata.discord,
    description: args.token.metadata.description,
  };

  const metadataUrl = await IpfsUpload.uploadMetadata(metadataIpfs);

  const endpoint = `${API_URL}/create-flash`;

  const apiPayload: CreateFlashTokenEvmApi = {
    chainId: args.chainId,
    token: {
      name: args.token.name,
      symbol: args.token.symbol,
      totalSupply: args.token.totalSupply,
      initialBuyAmount: args.token.initialBuyAmount,
      metadataUrl,
    },
    sale: {
      boardTitle: args.sale.boardTitle ?? 'based',
      marketCap: args.sale.marketCap,
      maxTxAmountPercent: args.sale.maxTxAmountPercent,
      protectBlocks: args.sale.protectBlocks,
    },
    dex: {
      version: args.dex.version,
      feeTier: args.dex.feeTier,
    },
    fees: {
      v4: args.fees.v4,
    },
  };

  console.log(apiPayload);

  const validated = evmFlashTokenCreateApiSchema.parse(apiPayload);

  const json = await BasedBidApi.invokeApi<CreateFlashTokenEvmResponse>(
    endpoint,
    {
      data: validated,
    },
  ).catch(() => {
    return null;
  });

  if (!json) {
    throw new Error('Failed to create LBP (BasedBid API)');
  }

  const txValue = BigInt(json.value);

  const flashLaunchAbi = [
    EvmDexType.UNISWAP_V4,
    EvmDexType.PANCAKESWAP_V4,
  ].includes(args.dex.version)
    ? flashLaunchV4Abi
    : flashLaunchV3Abi;

  const flashLaunchFunctionAbi = flashLaunchAbi.find(
    (item) => item.type === 'function' && item.name === json.functionName,
  );

  if (!flashLaunchFunctionAbi || !('inputs' in flashLaunchFunctionAbi)) {
    throw new Error(
      `Function ${json.functionName} not found in FlashLaunchForV3Facet.json or FlashLaunchForV4Facet.json`,
    );
  }

  const tupleArgs = flashLaunchFunctionAbi.inputs.map((input, index) =>
    normalizeByAbi(json.args[index], input, `args[${index}]`),
  );

  return await sendTransaction({
    publicClient,
    walletClient,
    account,
    address: json.address,
    abi: flashLaunchAbi,
    functionName: json.functionName,
    args: tupleArgs,
    value: txValue,
  });
};

(async () => {
  await createFlashToken({
    chainId: base.id,
    token: {
      name: 'Meme Token',
      symbol: 'MEME',
      totalSupply: 1000000000,
      initialBuyAmount: 0,
      metadata: {
        logo: 'chill-guy.jpg',
        twitter: 'https://x.com/example',
        telegram: 'https://t.me/example',
        website: 'https://example.com',
        discord: 'https://discord.gg/example',
        description: 'This is a test token',
      },
    },
    dex: {
      version: EvmDexType.UNISWAP_V4,
      feeTier: 3,
    },

    fees: {
      v4: {
        liquidity: 1,
        buyback: 1,
        reward: {
          token: RewardTokenType.USDC,
          amount: 1,
          minTokenBalanceForDividends: 0.01,
        },
        customWallets: [],
        feeThreshold: 0.1,
        tieredFeesEnabled: false,
        dynamicFees: {
          hasHookDynamicFee: true,
          volatilityDecayPeriod: VolatilityDecayPeriodType.MEDIUM,
          volatilityMultiplier: VolatilityMultiplierType.MEDIUM,
          volatilityTrigger: VolatilityTriggerType.PER_BLOCK,
        },
        cooldownProtection: {
          cooldownDuration: CooldownDurationType.MEDIUM,
          penaltyFee: PenaltyFeeType.MEDIUM,
        },
        snipeProtection: {
          maxBuyPerOrigin: MaxBuyPerOriginType.MEDIUM,
          protectPeriod: ProtectPeriodType.MEDIUM,
        },
        mevProtectionEnabled: true,
      },
    },
    sale: {
      marketCap: 10_000,
      maxTxAmountPercent: 0.1,
      protectBlocks: 20,
    },
  });
})().catch(console.error);
