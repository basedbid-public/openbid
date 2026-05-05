import flashLaunchV3Abi from '@constants/abi/FlashLaunchForV3Facet.json';
import flashLaunchV4Abi from '@constants/abi/FlashLaunchForV4Facet.json';
import 'dotenv/config';
import { EvmDexType } from 'enums/evm';
import {
  CooldownDurationType,
  MaxBuyPerOriginType,
  PenaltyFeeType,
  ProtectPeriodType,
  VolatilityDecayPeriodType,
  VolatilityMultiplierType,
  VolatilityTriggerType,
} from 'enums/fee-builder';
import { writeFileSync } from 'fs';
import { AbiInput } from 'interfaces/abi-input';
import { CreateFlashTokenEvmResponse } from 'interfaces/flash-token/create/evm/response';
import { CreateFlashTokenEvmSdk } from 'interfaces/flash-token/create/evm/sdk';
import { validateEnvironment } from 'schema/environment';
import { evmFlashTokenCreateSdkSchema } from 'schema/flash-token/create/sdk';
import { createPublicClient, createWalletClient, http } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { base } from 'viem/chains';

const env = validateEnvironment();

const publicClient = createPublicClient({
  chain: base,
  transport: http(env.RPC_URL),
});

const account = privateKeyToAccount(env.PRIVATE_KEY);

const walletClient = createWalletClient({
  chain: base,
  transport: http(env.RPC_URL),
  account,
});

export const createFlashToken = async (name: string, symbol: string) => {
  const sdkPayload: CreateFlashTokenEvmSdk = {
    chainId: base.id,
    token: {
      name,
      symbol,
      totalSupply: 1_000_000_000,
      metadataUrl:
        'https://ipfs.based.bid/ipfs/bafkreibxufu4ck7wdbehhdxqgdw2ln4ysfrfhmz2yl7q4cah3mdirjgzf4',
      initialBuyAmount: 0,
    },
    sale: {
      boardTitle: 'based',
      marketCap: 10000,
      maxTxAmountPercent: 0.1,
      protectBlocks: 20,
    },
    dex: {
      version: EvmDexType.UNISWAP_V4,
      feeTier: 2,
    },
    fees: {
      v4: {
        liquidity: 1,
        buyback: 1,
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
        customWallets: [],
      },
    },
  };

  const validatedSdkPayload = evmFlashTokenCreateSdkSchema.parse(sdkPayload);

  writeFileSync(
    'create-flash-token-args.json',
    JSON.stringify(validatedSdkPayload, null, 2),
  );

  const endpoint = `${env.API_URL}/create-flash`;

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ data: validatedSdkPayload }),
  });

  if (!response.ok) {
    throw new Error(
      `LBP create request failed: ${response.status} ${response.statusText}`,
    );
  }

  const json = (await response.json()) as CreateFlashTokenEvmResponse;
  const txValue = BigInt(json.value);

  console.log('Creating meme token...');
  console.log('From address:', account.address);
  console.log('Contract:', env.CONTRACT_ADDRESS);

  console.log('Args prepared, estimating gas...');

  writeFileSync(
    'create-flash-token-api-response.json',
    JSON.stringify(json, null, 2),
  );

  const functionName = [
    EvmDexType.UNISWAP_V4,
    EvmDexType.PANCAKESWAP_V4,
  ].includes(sdkPayload.dex.version)
    ? 'customFlashLaunchV4'
    : 'customFlashLaunchV3';

  const abi = [EvmDexType.UNISWAP_V4, EvmDexType.PANCAKESWAP_V4].includes(
    sdkPayload.dex.version,
  )
    ? flashLaunchV4Abi
    : flashLaunchV3Abi;

  console.log('abi', abi);

  const customFlashLaunchAbi = abi.find(
    (item) => item.type === 'function' && item.name === functionName,
  );

  if (!customFlashLaunchAbi || !('inputs' in customFlashLaunchAbi)) {
    throw new Error(
      'customFlashLaunch ABI not found in FlashLaunchForV3Facet.json or FlashLaunchForV4Facet.json',
    );
  }

  const tupleArgs = customFlashLaunchAbi.inputs.map((input, index) =>
    normalizeByAbi(json.args[index], input as AbiInput, `args[${index}]`),
  );

  writeFileSync('asdf.json', JSON.stringify(tupleArgs, null, 2));

  try {
    // Estimate gas
    const gasEstimate = await publicClient.estimateContractGas({
      address: env.CONTRACT_ADDRESS,
      abi,
      functionName,
      args: tupleArgs,
      account,
      value: txValue,
    });

    console.log('Gas estimate:', gasEstimate.toString());

    // Send transaction
    console.log('Sending transaction...');

    console.log(env.CONTRACT_ADDRESS);
    const hash = await walletClient.writeContract({
      address: env.CONTRACT_ADDRESS,
      abi,
      functionName,
      args: tupleArgs,
      gas: gasEstimate,
      value: txValue,
    });

    console.log('Transaction sent! Hash:', hash);
    console.log('Waiting for confirmation...');

    // Wait for receipt
    const receipt = await publicClient.waitForTransactionReceipt({
      hash,
      timeout: 120_000, // 2 minutes
    });

    console.log('Transaction confirmed!');
    console.log('Block number:', receipt.blockNumber);
    console.log('Gas used:', receipt.gasUsed.toString());
    console.log('Status:', receipt.status === 'success' ? 'Success' : 'Failed');
    console.log('Tx URL:', `https://basescan.org/tx/${hash}`);

    if (receipt.status === 'reverted') {
      throw new Error(`Transaction reverted at block ${receipt.blockNumber}`);
    }
  } catch (error) {
    console.error('Error creating meme:', error);
    throw error;
  }
};

(async () => {
  await createFlashToken('dante flash', 'DANTE');
})().catch(console.error);
