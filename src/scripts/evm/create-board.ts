import { CHAIN_NAME_CONFIG } from '@constants';
import { ApiType } from '@enums';
import {
  AbiInput,
  EvmApiResponse,
  OpenbidRunOptions,
  resolveRunMode,
} from '@interfaces';
import {
  createEvmBoardApiSchema,
  createEvmBoardSchema,
  CreateEvmBoardSdk,
} from '@schema';
import {
  BasedBidApi,
  EvmValidator,
  getSubBoardFacetAbi,
  initEvmClients,
  IpfsUpload,
  LogHelper,
  normalizeByAbi,
  sendTransaction,
} from '@utils';
import 'dotenv/config';

export const createEvmBoard = async (
  args: CreateEvmBoardSdk,
  options?: OpenbidRunOptions,
) => {
  const { printPayload, dryRun, validate } = resolveRunMode(options);

  if (printPayload) {
    LogHelper.printSectionWithSeparator('- - - Creating Board on EVM - - -');
  }

  const { data, env } = EvmValidator.validate<CreateEvmBoardSdk>(
    createEvmBoardSchema,
    args,
    options,
  );

  if (validate) {
    console.log('Validation passed');
    return;
  }

  let logoUrl = 'https://ipfs.based.bid/ipfs/null';
  if (dryRun) {
    console.log('Skipping logo upload (dry-run mode)');
    console.log('Logo path:', data.logo);
  } else {
    logoUrl = await IpfsUpload.uploadImage(data.logo);
  }

  let bannerUrl = 'https://ipfs.based.bid/ipfs/null';
  if (dryRun) {
    console.log('Skipping banner upload (dry-run mode)');
    console.log('Banner path:', data.banner);
  } else {
    bannerUrl = await IpfsUpload.uploadImage(data.banner);
  }

  const metadata = {
    title: data.title,
    logo: logoUrl,
    banner: bannerUrl,
    description: data.description,
    website: data.website,
    telegram: data.telegram,
    twitter: data.twitter,
    gitbook: data.gitbook,
    tiktok: data.tiktok,
    youtube: data.youtube,
    isAllowed: data.isAllowed,
    apiPackageIndex: data.apiPackageIndex,
    privacyMode: data.privacyMode,
    isPublicBoard: data.isPublicBoard,
    allowRequests: data.allowRequests,
  };

  let metadataUrl = 'https://ipfs.based.bid/ipfs/null';
  if (dryRun) {
    console.log('Skipping IPFS metadata upload (dry-run mode)');
    console.log('Metadata to upload:', JSON.stringify(metadata, null, 2));
  } else {
    metadataUrl = await IpfsUpload.uploadMetadata(metadata);
  }

  const { publicClient, walletClient, account } = initEvmClients(
    data.chainId,
    env.PRIVATE_KEY,
  );

  const apiPayloadResult = createEvmBoardApiSchema.safeParse({
    account: account.address,
    chainId: data.chainId,
    title: data.title,
    description: data.description,
    flashLaunchFeePer: data.flashLaunchFeePer,
    fees: data.fees,
    logoUrl,
    bannerUrl,
    metaUri: metadataUrl,
    website: data.website,
    telegram: data.telegram,
    twitter: data.twitter,
    gitbook: data.gitbook,
    tiktok: data.tiktok,
    youtube: data.youtube,
    isAllowed: data.isAllowed,
    apiPackageIndex: data.apiPackageIndex,
    privacyMode: data.privacyMode,
    isPublicBoard: data.isPublicBoard,
    allowRequests: data.allowRequests,
  });

  if (!apiPayloadResult.success) {
    throw new Error(
      'Invalid EVM create-board API payload: ' + apiPayloadResult.error.message,
    );
  }

  const apiPayload = apiPayloadResult.data;

  if (printPayload) {
    LogHelper.printApiPayload('create-board', apiPayload);
  }

  if (dryRun) {
    LogHelper.printDryRunSummary('create-board', apiPayload);
    return { dryRun: true, payload: apiPayload };
  }

  const json = await BasedBidApi.invokeApi<EvmApiResponse>(
    ApiType.SDK,
    'create-board',
    {
      data: apiPayload,
    },
    'Failed to create board on EVM',
    args.isSandboxMode,
  );

  const txValue = BigInt(json.value);

  const subBoardFacetAbi = getSubBoardFacetAbi(data.chainId);
  const applySubBoardAbi = subBoardFacetAbi.find(
    (item) => item.type === 'function' && item.name === json.functionName,
  );

  if (!applySubBoardAbi || !('inputs' in applySubBoardAbi)) {
    throw new Error(
      `Function ${json.functionName} not found in SubBoardFacet ABI`,
    );
  }

  const tupleArgs = applySubBoardAbi.inputs.map((input, index) =>
    normalizeByAbi(json.args[index], input as AbiInput, `args[${index}]`),
  );

  const result = await sendTransaction({
    publicClient,
    walletClient,
    account,
    address: json.address,
    abi: subBoardFacetAbi,
    functionName: json.functionName,
    args: tupleArgs,
    value: txValue,
    errorLabel: 'Create Board',
    skipConfirmation: args.isSandboxMode,
  });

  LogHelper.printResult({
    ok: true,
    network: CHAIN_NAME_CONFIG[data.chainId],
    boardAddress: json.address,
    signature: result.transactionHash,
    metadataUrl,
    basedBidUrl: `${BasedBidApi.platformApiUrl(args.isSandboxMode)}/b/${data.title}`,
  });

  return result;
};
