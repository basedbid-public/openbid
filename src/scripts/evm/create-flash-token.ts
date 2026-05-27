import flashLaunchV3Abi from 'constants/abi/FlashLaunchForV3Facet.json';
import flashLaunchV4Abi from 'constants/abi/FlashLaunchForV4Facet.json';
import { CHAIN_NAME_CONFIG, CHAIN_SLUG_CONFIG } from 'constants/chain-config';
import 'dotenv/config';
import { ApiType, EvmDexType } from 'enums';
import { DryRunOptions } from 'helpers/run';
import { EvmApiResponse } from 'interfaces';
import { validateEnvironment } from 'schema/environment';
import {
  CreateFlashTokenEvmApi,
  evmFlashTokenCreateApiSchema,
} from 'schema/flash-token/evm/api';
import {
  CreateFlashTokenEvmSdk,
  evmFlashTokenCreateSdkSchema,
} from 'schema/flash-token/evm/sdk';
import {
  BasedBidApi,
  initRpcClients,
  IpfsUpload,
  normalizeByAbi,
  sendTransaction,
} from 'utils';

export const createEvmFlashToken = async (
  args: CreateFlashTokenEvmSdk,
  dryRun?: DryRunOptions,
) => {
  if (dryRun?.printPayload) {
    console.log('\nEVM Create Flash Token - Dry Run');
    console.log('-----------------------------------');
  }

  const env = validateEnvironment();

  const argsValidated = evmFlashTokenCreateSdkSchema.safeParse(args);
  if (!argsValidated.success) {
    throw new Error('Invalid input arguments: ' + argsValidated.error.message);
  }

  const apiKey = argsValidated.data.boardTitle ? process.env.BASEDBID_API_KEY : undefined;

  const { publicClient, walletClient, account } = initRpcClients(
    argsValidated.data.chainId,
    env.EVM_RPC_URL,
    env.PRIVATE_KEY,
  );

  let logoUrl = 'ipfs://placeholder-logo-url (DRY RUN)';
  let metadataUrl = 'ipfs://placeholder-metadata-url (DRY RUN)';

  if (dryRun?.dryRun) {
    console.log('Skipping IPFS logo upload (dry-run mode)');
    console.log('Logo path:', argsValidated.data.token.metadata.logo);
  } else {
    logoUrl = await IpfsUpload.uploadImage(
      argsValidated.data.token.metadata.logo,
      apiKey,
    );
  }

  if (dryRun?.printPayload) {
    console.log('Logo URL:', logoUrl);
  }

  const metadataIpfs = {
    name: argsValidated.data.token.name,
    symbol: argsValidated.data.token.symbol,
    decimals: 18,
    totalSupply: argsValidated.data.token.totalSupply,
    logo: logoUrl,
    board: argsValidated.data.boardTitle,
    twitter: argsValidated.data.token.metadata.twitter,
    telegram: argsValidated.data.token.metadata.telegram,
    website: argsValidated.data.token.metadata.website,
    discord: argsValidated.data.token.metadata.discord,
    description: argsValidated.data.token.metadata.description,
  };

  if (dryRun?.dryRun) {
    console.log('Skipping IPFS metadata upload (dry-run mode)');
    console.log('Metadata to upload:', JSON.stringify(metadataIpfs, null, 2));
  } else {
    metadataUrl = await IpfsUpload.uploadMetadata(metadataIpfs, apiKey);
  }

  if (dryRun?.printPayload) {
    console.log('Metadata URL:', metadataUrl);
  }

  let sale = argsValidated.data.sale;
  if (!sale) {
    sale = {
      marketCap: 10_000,
      maxTxAmountPercent: 0.1,
      protectBlocks: 20,
    };
  }

  if (dryRun?.printPayload) {
    console.log('Sale config:', JSON.stringify(sale, null, 2));
  }

  const apiPayload: CreateFlashTokenEvmApi = {
    isSandboxMode: argsValidated.data.isSandboxMode,
    chainId: argsValidated.data.chainId,
    token: {
      name: argsValidated.data.token.name,
      symbol: argsValidated.data.token.symbol,
      totalSupply: argsValidated.data.token.totalSupply,
      initialBuyAmount: argsValidated.data.token.initialBuyAmount,
      metadataUrl,
    },
    sale: {
      boardTitle: argsValidated.data.boardTitle,
      marketCap: sale.marketCap,
      maxTxAmountPercent: sale.maxTxAmountPercent,
      protectBlocks: sale.protectBlocks,
    },
    dex: {
      version: argsValidated.data.dex.version,
      feeTier: argsValidated.data.dex.feeTier,
    },
    fees: {
      v4: argsValidated.data.fees?.v4,
    },
  };

  if (dryRun?.printPayload) {
    console.log('\nAPI Payload for /create-flash:');
    console.log(JSON.stringify({ data: apiPayload }, null, 2));
  }

  const payload = evmFlashTokenCreateApiSchema.parse(apiPayload);

  if (dryRun?.dryRun) {
    console.log('Skipping API call to /create-flash (dry-run mode)');
    console.log('\n========== DRY RUN COMPLETE ==========');
    console.log('Would have called: POST /create-flash');
    console.log('Wallet:', account.address);
    console.log('Chain ID:', argsValidated.data.chainId);
    console.log(
      'Token:',
      argsValidated.data.token.name,
      `(${argsValidated.data.token.symbol})`,
    );
    console.log('DEX:', argsValidated.data.dex.version, 'v4');
    console.log('========================================\n');
    return { dryRun: true, payload: { data: apiPayload } };
  }

  const json = await BasedBidApi.invokeApi<EvmApiResponse>(
    ApiType.SDK,
    'create-flash',
    {
      data: payload,
    },
    'Failed to create flash token on EVM',
    args.isSandboxMode,
    apiKey,
  );

  const txValue = BigInt(json.value);

  const flashLaunchAbi = [
    EvmDexType.UNISWAP_V4,
    EvmDexType.PANCAKESWAP_V4,
  ].includes(argsValidated.data.dex.version)
    ? flashLaunchV4Abi
    : flashLaunchV3Abi;

  const createFlashAbi = flashLaunchAbi.find(
    (item) => item.type === 'function' && item.name === json.functionName,
  );

  if (!createFlashAbi || !('inputs' in createFlashAbi)) {
    throw new Error(
      `Function ${json.functionName} not found in FlashLaunch ABI`,
    );
  }

  const tupleArgs = createFlashAbi.inputs.map((input, index) =>
    normalizeByAbi(json.args[index], input, `args[${index}]`),
  );

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
    skipConfirmation: args.isSandboxMode,
  });

  console.log('\n--- RESULT ---');
  console.log(
    JSON.stringify(
      {
        ok: true,
        type: 'flash-token',
        network: CHAIN_NAME_CONFIG[argsValidated.data.chainId],
        mintAddress: json.address,
        signature: result.transactionHash,
        metadataUrl,
        basedBidUrl: `${BasedBidApi.basedTradeUrl(args.isSandboxMode)}/${CHAIN_SLUG_CONFIG[argsValidated.data.chainId]}/${json.address}`,
      },
      null,
      2,
    ),
  );

  return result;
};
