import { SOLANA_CHAIN_NAME_CONFIG } from 'constants/solana-chain-config';
import 'dotenv/config';
import { ApiType } from 'enums';
import { OpenbidRunOptions } from 'interfaces/common';
import { CreateSolanaBoardApiResponse } from 'interfaces/create-board';
import {
  CreateSolanaBoardSdk,
  createSolanaBoardSdkSchema,
} from 'schema/board/solana/sdk';
import {
  BasedBidApi,
  IpfsUpload,
  LogHelper,
  SeedGenerator,
  SolanaValidator,
  SolanaWrapper,
} from 'utils';

export const createSolanaBoard = async (
  args: CreateSolanaBoardSdk,
  options?: OpenbidRunOptions,
) => {
  const { printPayload, dryRun, validate } = options ?? {};

  if (printPayload) {
    LogHelper.printSectionWithSeparator('- - - Creating Board on Solana - - -');
  }

  const { data, env } = SolanaValidator.validate<CreateSolanaBoardSdk>(
    createSolanaBoardSdkSchema,
    args,
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
    description: data.description,
    logo: logoUrl,
    banner: bannerUrl,
  };

  let metadataUrl = '';
  if (dryRun) {
    console.log('Skipping IPFS metadata upload (dry-run mode)');
    console.log('Metadata to upload:', JSON.stringify(metadata, null, 2));
  } else {
    metadataUrl = await IpfsUpload.uploadMetadata(metadata);
  }

  const seed = SeedGenerator.generateBoardSeed();

  const apiPayload = {
    chainId: data.chainId,
    signer: solanaWrapper.publicKey,
    seed,
    metaData: metadataUrl,
    flashLaunchFeePer: data.flashLaunchFeePer,
    fees: data.fees,
  };

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
    boardId: json.boardId ?? 'not returned by API',
    boardTitle: json.boardTitle ?? args.title,
    metadataUrl: json.metadataUrl ?? metadataUrl,
    signature,
  };

  LogHelper.printResult({
    ok: true,
    type: 'board',
    network: SOLANA_CHAIN_NAME_CONFIG[data.chainId],
    boardId: result.boardId,
    signature: result.signature,
    metadataUrl: result.metadataUrl,
    basedBidUrl: `${BasedBidApi.platformApiUrl(args.isSandboxMode)}/b/${result.boardId}`,
  });

  return result;
};
