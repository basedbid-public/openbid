import 'dotenv/config';

import { CHAIN_NAME_CONFIG } from '@constants';
import { ApiType, EvmDexType } from '@enums';
import {
  AbiInput,
  EvmApiResponse,
  OpenbidRunOptions,
  resolveRunMode,
} from '@interfaces';
import {
  createEvmFlashTokenSchema,
  CreateFlashTokenEvmApi,
  CreateFlashTokenEvmSdk,
} from '@schema';
import {
  BasedBidApi,
  EvmValidator,
  getFlashLaunchV3Abi,
  getFlashLaunchV4Abi,
  initEvmClients,
  IpfsUpload,
  LogHelper,
  normalizeByAbi,
  patchFlashLaunchApiArgs,
  patchRobinhoodFlashLaunchV4Args,
  ROBINHOOD_CHAIN_ID,
  sendTransaction,
} from '@utils';

export const createEvmFlashToken = async (
  args: CreateFlashTokenEvmSdk,
  options?: OpenbidRunOptions,
) => {
  const { printPayload, dryRun, validate } = resolveRunMode(options);

  if (printPayload) {
    LogHelper.printSectionWithSeparator(
      '- - - Creating Flash Token on EVM - - -',
    );
  }

  const { data, env } = EvmValidator.validate<CreateFlashTokenEvmSdk>(
    createEvmFlashTokenSchema,
    args,
    options,
  );

  if (validate) {
    console.log('Validation passed');
    return;
  }

  // Holder-reward dividend bytecode works on Base but reverts on Robinhood Chain
  // (empty 0x revert from customFlashLaunchV4). Liquidity/buyback-only launches succeed.
  if (data.chainId === ROBINHOOD_CHAIN_ID && data.fees?.v4?.reward) {
    throw new Error(
      'fees.v4.reward is not supported on Robinhood Chain (4663) yet. ' +
        'Remove the reward block and route that share into liquidity/buyback instead.',
    );
  }

  const { publicClient, walletClient, account, sponsored } = initEvmClients(
    data.chainId,
    env.PRIVATE_KEY,
    { sponsored: true },
  );

  let logoUrl = 'https://ipfs.based.bid/ipfs/null';
  if (dryRun) {
    console.log('Skipping logo upload (dry-run mode)');
    console.log('Logo path:', data.token.metadata.logo);
  } else {
    logoUrl = await IpfsUpload.uploadImage(data.token.metadata.logo);
  }

  const metadata = {
    name: data.token.name,
    symbol: data.token.symbol,
    decimals: 18,
    totalSupply: data.token.totalSupply,
    logo: logoUrl,
    board: data.boardTitle,
    twitter: data.token.metadata.twitter,
    telegram: data.token.metadata.telegram,
    website: data.token.metadata.website,
    discord: data.token.metadata.discord,
    description: data.token.metadata.description,
  };

  const apiKey = data.boardTitle ? process.env.BASEDBID_API_KEY : undefined;

  let metadataUrl = '';
  if (dryRun) {
    console.log('Skipping IPFS metadata upload (dry-run mode)');
    console.log('Metadata to upload:', JSON.stringify(metadata, null, 2));
  } else {
    metadataUrl = await IpfsUpload.uploadMetadata(metadata, apiKey);
  }

  let sale = data.sale;
  if (!sale) {
    sale = {
      marketCap: 10_000,
      maxTxAmountPercent: 0.1,
      protectBlocks: 20,
    };
  }

  const apiPayload: CreateFlashTokenEvmApi = {
    isSandboxMode: data.isSandboxMode,
    chainId: data.chainId,
    initialBuySupplyPercent: data.initialBuySupplyPercent,
    distributionWallets: data.distributionWallets,
    distributionAmounts: data.distributionAmounts,
    distributionAmountUnit: data.distributionAmountUnit,
    token: {
      name: data.token.name,
      symbol: data.token.symbol,
      totalSupply: data.token.totalSupply,
      initialBuyAmount: data.token.initialBuyAmount,
      metadataUrl,
    },
    sale: {
      boardTitle: data.boardTitle,
      marketCap: sale.marketCap,
      maxTxAmountPercent: sale.maxTxAmountPercent ?? 0.01,
      protectBlocks: sale.protectBlocks ?? 10,
    },
    dex: {
      version: data.dex.version,
      feeTier: data.dex.feeTier,
    },
    fees: {
      v4: data.fees?.v4,
    },
  };

  if (printPayload) {
    LogHelper.printApiPayload('create-flash', apiPayload);
  }

  if (dryRun) {
    LogHelper.printDryRunSummary('create-board', apiPayload);
    return { dryRun: true, payload: apiPayload };
  }

  const json = await BasedBidApi.invokeApi<EvmApiResponse>(
    ApiType.SDK,
    'create-flash',
    {
      data: apiPayload,
    },
    'Failed to create flash token on EVM',
    args.isSandboxMode,
    apiKey,
  );

  const txValue = BigInt(json.value ?? '0');

  const flashLaunchAbi = [
    EvmDexType.UNISWAP_V4,
    EvmDexType.PANCAKESWAP_V4,
  ].includes(data.dex.version)
    ? getFlashLaunchV4Abi(data.chainId)
    : getFlashLaunchV3Abi(data.chainId);

  patchFlashLaunchApiArgs(json.functionName, json.args, sale.marketCap);
  json.args = patchRobinhoodFlashLaunchV4Args(
    data.chainId,
    json.functionName,
    json.args,
  );

  const createFlashAbi = flashLaunchAbi.find(
    (item) => item.type === 'function' && item.name === json.functionName,
  );

  if (!createFlashAbi || !('inputs' in createFlashAbi)) {
    throw new Error(
      `Function ${json.functionName} not found in FlashLaunch ABI`,
    );
  }

  const tupleArgs = createFlashAbi.inputs.map((input, index) =>
    normalizeByAbi(json.args[index], input as AbiInput, `args[${index}]`),
  );

  const skipConfirmation = process.env.SKIP_TX_CONFIRMATION === 'true';

  const result = await sendTransaction({
    publicClient,
    walletClient,
    account,
    address: json.address,
    abi: flashLaunchAbi,
    functionName: json.functionName,
    args: tupleArgs,
    value: txValue,
    errorLabel: 'Create Flash Token',
    skipConfirmation,
    sponsored,
  });

  LogHelper.printResult({
    ok: true,
    network: CHAIN_NAME_CONFIG[data.chainId],
    mintAddress: json.address,
    signature: result.transactionHash,
    metadataUrl,
  });

  return result;
};
