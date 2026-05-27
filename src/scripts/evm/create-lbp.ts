import creationFacetAbi from 'constants/abi/CreationFacet.json';
import { CHAIN_NAME_CONFIG, CHAIN_SLUG_CONFIG } from 'constants/chain-config';
import 'dotenv/config';
import { ApiType } from 'enums';
import { DryRunOptions } from 'helpers/run';
import { EvmApiResponse } from 'interfaces';
import { validateEnvironment } from 'schema/environment';
import { CreateLbpEvmApi, evmLbpCreateApiSchema } from 'schema/lbp/evm/api';
import { CreateLbpEvmSdk, evmLbpCreateSchema } from 'schema/lbp/evm/sdk';
import {
  BasedBidApi,
  getLaunchPackageIndex,
  initRpcClients,
  IpfsUpload,
  normalizeByAbi,
  sendTransaction,
} from 'utils';

export const createEvmLbp = async (
  args: CreateLbpEvmSdk,
  dryRun?: DryRunOptions,
) => {
  if (dryRun?.printPayload) {
    console.log('\nEVM Create LBP - Dry Run');
    console.log('-----------------------------------');
  }

  const env = validateEnvironment();

  const argsValidated = evmLbpCreateSchema.safeParse(args);
  if (!argsValidated.success) {
    throw new Error('Invalid input arguments: ' + argsValidated.error.message);
  }

  const input = argsValidated.data;
  const { token, sale, dex, fees } = input;

  const { publicClient, walletClient, account } = initRpcClients(
    input.chainId,
    env.EVM_RPC_URL,
    env.PRIVATE_KEY,
  );

  let logoUrl = 'ipfs://placeholder-logo-url (DRY RUN)';
  let metadataUrl = 'ipfs://placeholder-metadata-url (DRY RUN)';

  if (dryRun?.dryRun) {
    console.log('Skipping IPFS logo upload (dry-run mode)');
  } else {
    logoUrl = await IpfsUpload.uploadImage(token.metadata.logo);
  }

  if (dryRun?.printPayload) {
    console.log('Logo URL:', logoUrl);
  }

  const metadataIpfs = {
    name: token.name,
    symbol: token.symbol,
    decimals: 18,
    totalSupply: token.totalSupply,
    logo: logoUrl,
    board: token.boardTitle,
    twitter: token.metadata.twitter ?? '',
    telegram: token.metadata.telegram ?? '',
    website: token.metadata.website ?? '',
    discord: token.metadata.discord ?? '',
    description: token.metadata.description ?? '',
    whitelist: sale.whitelistedAddresses ?? [],
  };

  if (dryRun?.dryRun) {
    console.log('Skipping IPFS metadata upload (dry-run mode)');
    console.log('Metadata to upload:', JSON.stringify(metadataIpfs, null, 2));
  } else {
    metadataUrl = await IpfsUpload.uploadMetadata(metadataIpfs);
  }

  if (dryRun?.printPayload) {
    console.log('Metadata URL:', metadataUrl);
  }

  const apiPayload: CreateLbpEvmApi = {
    isSandboxMode: input.isSandboxMode,
    package: getLaunchPackageIndex(input.package),
    chainId: input.chainId,
    token: {
      name: token.name,
      symbol: token.symbol,
      totalSupply: token.totalSupply,
      initialBuyAmount: token.initialBuyAmount,
      metadataUrl,
    },
    sale: {
      boardTitle: token.boardTitle ?? '',
      marketCap: token.marketCap,
      startTime: sale.startTime,
      maxAllocationPerUser: sale.maxAllocationPerUser,
      maxAllocationPerWhitelistedUser: sale.maxAllocationPerWhitelistedUser,
      delayTradeTime: sale.delayTradeTime ?? 0,
      whitelistedAddresses: sale.whitelistedAddresses,
      ...(sale.softCap && { softCap: sale.softCap }),
    },
    dex: {
      version: dex.version,
      feeTier: dex.feeTier,
    },
    fees: {
      buyPoolCreator: fees.buyPoolCreator,
      sellPoolCreator: fees.sellPoolCreator,
      buyReferral: fees.buyReferral,
      graduation: fees.graduation,
      v4: fees.v4,
    },
  };

  if (dryRun?.printPayload) {
    console.log('\nAPI Payload for /create-lbp:');
    console.log(JSON.stringify({ data: apiPayload }, null, 2));
  }

  const validated = evmLbpCreateApiSchema.parse(apiPayload);

  if (dryRun?.dryRun) {
    console.log('Skipping API call to /create-lbp (dry-run mode)');
    console.log('\n========== DRY RUN COMPLETE ==========');
    console.log('Would have called: POST /create-lbp');
    console.log('Wallet:', account.address);
    console.log('Chain ID:', input.chainId);
    console.log('Token:', token.name, `(${token.symbol})`);
    console.log('========================================\n');
    return { dryRun: true, payload: { data: apiPayload } };
  }

  const json = await BasedBidApi.invokeApi<EvmApiResponse>(
    ApiType.SDK,
    'create-lbp',
    {
      data: validated,
    },
    'Failed to create LBP on EVM',
    args.isSandboxMode,
  );

  const txValue = BigInt(json.value);

  const createMemeAbi = creationFacetAbi.find(
    (item) => item.type === 'function' && item.name === json.functionName,
  );

  if (!createMemeAbi || !('inputs' in createMemeAbi)) {
    throw new Error(
      `Function ${json.functionName} not found in CreationFacet ABI`,
    );
  }

  const tupleArgs = createMemeAbi.inputs.map((input, index) =>
    normalizeByAbi(json.args[index], input, `args[${index}]`),
  );

  const result = await sendTransaction({
    publicClient,
    walletClient,
    account,
    address: json.address,
    abi: creationFacetAbi,
    functionName: json.functionName,
    args: tupleArgs,
    value: txValue,
    errorLabel: 'Create LBP',
    skipConfirmation: args.isSandboxMode,
  });

  console.log('\n--- RESULT ---');
  console.log(
    JSON.stringify(
      {
        ok: true,
        type: 'pool',
        network: CHAIN_NAME_CONFIG[input.chainId],
        mintAddress: json.address,
        signature: result.transactionHash,
        metadataUrl,
        basedBidUrl: `${BasedBidApi.platformApiUrl(args.isSandboxMode)}/${CHAIN_SLUG_CONFIG[input.chainId]}/token/${json.address}`,
      },
      null,
      2,
    ),
  );

  return result;
};
