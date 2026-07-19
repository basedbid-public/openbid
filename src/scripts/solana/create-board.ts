import { SOLANA_CHAIN_NAME_CONFIG } from '@constants';
import { ApiType } from '@enums';
import {
  CreateSolanaBoardApiResponse,
  OpenbidRunOptions,
  resolveRunMode,
} from '@interfaces';
import {
  CreateSolanaBoardSdk,
  createSolanaBoardApiSchema,
  createSolanaBoardSdkSchema,
} from '@schema';
import {
  BasedBidApi,
  IpfsUpload,
  LogHelper,
  SeedGenerator,
  SolanaValidator,
  SolanaWrapper,
} from '@utils';
import 'dotenv/config';

export const createSolanaBoard = async (
  args: CreateSolanaBoardSdk,
  options?: OpenbidRunOptions,
) => {
  const { printPayload, dryRun, validate } = resolveRunMode(options);

  if (printPayload) {
    LogHelper.printSectionWithSeparator('- - - Creating Board on Solana - - -');
  }

  const { data, env } = SolanaValidator.validate<CreateSolanaBoardSdk>(
    createSolanaBoardSdkSchema,
    args,
    options,
  );

  if (validate) {
    console.log('Validation passed');
    return;
  }

  const solanaWrapper = new SolanaWrapper(env.SOLANA_PRIVATE_KEY);
  await solanaWrapper.init(data.chainId);

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

  const seed = SeedGenerator.generateBoardSeed();

  const apiPayloadResult = createSolanaBoardApiSchema.safeParse({
    chainId: data.chainId,
    signer: solanaWrapper.publicKey,
    seed,
    metaData: metadataUrl,
    flashLaunchFeePer: data.flashLaunchFeePer,
    fees: data.fees,
    isSandboxMode: data.isSandboxMode,
  });

  if (!apiPayloadResult.success) {
    throw new Error(
      'Invalid Solana create-board API payload: ' +
        apiPayloadResult.error.message,
    );
  }

  const apiPayload = apiPayloadResult.data;

  if (printPayload) {
    LogHelper.printApiPayload('sol/apply-sub-board', apiPayload);
  }

  if (dryRun) {
    LogHelper.printDryRunSummary('sol/apply-sub-board', apiPayload);
    return { dryRun: true, payload: apiPayload };
  }

  const json = await BasedBidApi.invokeApi<CreateSolanaBoardApiResponse>(
    ApiType.SDK,
    'sol/apply-sub-board',
    apiPayload,
    'Failed to create board on Solana',
    args.isSandboxMode,
  );

  const { transaction, blockhash, lastValidBlockHeight, txCost } = json;

  const signature = await solanaWrapper.sendTransaction(
    transaction,
    blockhash,
    lastValidBlockHeight,
    `${txCost?.totalRequired.sol} SOL`,
    [],
    {
      description: 'Create Solana Board',
      skipConfirmation: args.isSandboxMode,
    },
  );

  await solanaWrapper.awaitTxConfirmation(signature);

  const result = {
    signature,
  };

  LogHelper.printResult({
    ok: true,
    type: 'board',
    network: SOLANA_CHAIN_NAME_CONFIG[data.chainId],
    signature: result.signature,
    metadataUrl: metadataUrl,
    basedBidUrl: `${BasedBidApi.platformApiUrl(args.isSandboxMode)}/b/${data.title}`,
  });

  return result;
};
