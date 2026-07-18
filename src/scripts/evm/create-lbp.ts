import { CHAIN_NAME_CONFIG, CHAIN_SLUG_CONFIG } from '@constants';
import creationFacetAbi from '@constants/abi/CreationFacet.json';
import { ApiType } from '@enums';
import { EvmApiResponse, OpenbidRunOptions, resolveRunMode } from '@interfaces';
import { CreateLbpEvmApi, CreateLbpEvmSdk, evmLbpCreateSchema } from '@schema';
import {
  BasedBidApi,
  EvmValidator,
  getLaunchPackageIndex,
  initEvmClients,
  IpfsUpload,
  LogHelper,
  normalizeByAbi,
  sendTransaction,
} from '@utils';
import 'dotenv/config';

export const createEvmLbp = async (
  args: CreateLbpEvmSdk,
  options?: OpenbidRunOptions,
) => {
  const { printPayload, dryRun, validate } = resolveRunMode(options);

  if (printPayload) {
    LogHelper.printSectionWithSeparator('- - - Creating LBP on EVM - - -');
  }

  const { data, env } = EvmValidator.validate<CreateLbpEvmSdk>(
    evmLbpCreateSchema,
    args,
    options,
  );

  if (validate) {
    console.log('Validation passed');
    return;
  }

  const { publicClient, walletClient, account, sponsored } = initEvmClients(
    data.chainId,
    env.PRIVATE_KEY,
    { sponsored: true },
  );

  const apiKey = data.token.boardTitle
    ? process.env.BASEDBID_API_KEY
    : undefined;

  let logoUrl = 'https://ipfs.based.bid/ipfs/null';
  if (dryRun) {
    console.log('Skipping logo upload (dry-run mode)');
    console.log('Logo path:', data.token.metadata.logo);
  } else {
    logoUrl = await IpfsUpload.uploadImage(data.token.metadata.logo, apiKey);
  }

  const metadata = {
    name: data.token.name,
    symbol: data.token.symbol,
    decimals: 18,
    totalSupply: data.token.totalSupply,
    logo: logoUrl,
    board: data.token.boardTitle,
    twitter: data.token.metadata.twitter ?? '',
    telegram: data.token.metadata.telegram ?? '',
    website: data.token.metadata.website ?? '',
    discord: data.token.metadata.discord ?? '',
    description: data.token.metadata.description ?? '',
    whitelist: data.sale.whitelistedAddresses ?? [],
  };

  let metadataUrl = '';
  if (dryRun) {
    console.log('Skipping IPFS metadata upload (dry-run mode)');
    console.log('Metadata to upload:', JSON.stringify(metadata, null, 2));
  } else {
    metadataUrl = await IpfsUpload.uploadMetadata(metadata, apiKey);
  }

  const apiPayload: CreateLbpEvmApi = {
    package: getLaunchPackageIndex(data.package),
    chainId: data.chainId,
    token: {
      name: data.token.name,
      symbol: data.token.symbol,
      totalSupply: data.token.totalSupply,
      initialBuyAmount: data.token.initialBuyAmount,
      metadataUrl,
    },
    sale: {
      boardTitle: data.token.boardTitle ?? '',
      marketCap: data.token.marketCap,
      startTime: data.sale.startTime,
      maxAllocationPerUser: data.sale.maxAllocationPerUser,
      maxAllocationPerWhitelistedUser:
        data.sale.maxAllocationPerWhitelistedUser,
      delayTradeTime: data.sale.delayTradeTime ?? 0,
      whitelistedAddresses: data.sale.whitelistedAddresses,
      ...(data.sale.softCap && { softCap: data.sale.softCap }),
    },
    dex: {
      version: data.dex.version,
      feeTier: data.dex.feeTier,
    },
    fees: {
      buyPoolCreator: data.fees.buyPoolCreator,
      sellPoolCreator: data.fees.sellPoolCreator,
      buyReferral: data.fees.buyReferral,
      graduation: data.fees.graduation,
      v4: data.fees.v4,
    },
  };

  if (printPayload) {
    LogHelper.printApiPayload('create-lbp', metadata);
  }

  if (dryRun) {
    LogHelper.printDryRunSummary('create-board', apiPayload);
    return { dryRun: true, payload: apiPayload };
  }

  const json = await BasedBidApi.invokeApi<EvmApiResponse>(
    ApiType.SDK,
    'create-lbp',
    {
      data: apiPayload,
    },
    'Failed to create LBP on EVM',
    args.isSandboxMode,
    apiKey,
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
    sponsored,
  });

  LogHelper.printResult({
    ok: true,
    network: CHAIN_NAME_CONFIG[data.chainId],
    mintAddress: json.address,
    signature: result.transactionHash,
    metadataUrl,
    basedBidUrl: `${BasedBidApi.platformApiUrl(args.isSandboxMode)}/${CHAIN_SLUG_CONFIG[data.chainId]}/token/${json.address}`,
  });

  return result;
};
