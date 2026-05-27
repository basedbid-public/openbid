import { SOLANA_CHAIN_NAME_CONFIG } from 'constants/solana-chain-config';
import 'dotenv/config';
import { ApiType } from 'enums';
import { DryRunOptions } from 'helpers/run';
import { CreateBoardSolanaApiResponse } from 'interfaces/board/solana/api-response';
import { createSolanaBoardApiSchema } from 'schema/board/solana/api';
import {
  CreateSolanaBoardSdk,
  createSolanaBoardSdkSchema,
} from 'schema/board/solana/sdk';
import { validateEnvironmentSolana } from 'schema/environment';
import { BasedBidApi, IpfsUpload, SeedGenerator, SolanaWrapper } from 'utils';

export const createSolanaBoard = async (
  args: CreateSolanaBoardSdk,
  dryRun?: DryRunOptions,
) => {
  if (dryRun?.printPayload) {
    console.log('\nSolana Create Board - Dry Run');
    console.log('-----------------------------------');
  }

  const env = validateEnvironmentSolana();

  const argsValidated = createSolanaBoardSdkSchema.safeParse(args);
  if (!argsValidated.success) {
    throw new Error('Invalid input arguments: ' + argsValidated.error.message);
  }

  if (dryRun?.printPayload) {
    console.log('Chain ID:', argsValidated.data.chainId);
    console.log('Board Title:', argsValidated.data.title);
    console.log('Description:', argsValidated.data.description);
  }

  const solanaWrapper = new SolanaWrapper(
    env.SOLANA_RPC_URL,
    env.SOLANA_PRIVATE_KEY,
  );
  await solanaWrapper.init();

  const apiKey = argsValidated.data.title ? process.env.BASEDBID_API_KEY : undefined;

  let logoUrl = 'ipfs://placeholder-logo-url (DRY RUN)';
  let bannerUrl = 'ipfs://placeholder-banner-url (DRY RUN)';
  let metadataUrl = 'ipfs://placeholder-metadata-url (DRY RUN)';

  if (dryRun?.printPayload) {
    console.log('\nStep 1 of 2: Upload board branding to IPFS');
  }

  if (dryRun?.dryRun) {
    console.log('Skipping IPFS logo upload (dry-run mode)');
    console.log('Logo path:', argsValidated.data.logo);
  } else {
    logoUrl = await IpfsUpload.uploadImage(argsValidated.data.logo, apiKey);
  }

  if (dryRun?.dryRun) {
    console.log('Skipping IPFS banner upload (dry-run mode)');
    console.log('Banner path:', argsValidated.data.banner);
  } else {
    bannerUrl = await IpfsUpload.uploadImage(argsValidated.data.banner, apiKey);
  }

  if (dryRun?.printPayload) {
    console.log('Logo URL:', logoUrl);
    console.log('Banner URL:', bannerUrl);
  }

  const metadataObject = {
    title: argsValidated.data.title,
    description: argsValidated.data.description,
    logo: logoUrl,
    banner: bannerUrl,
  };

  if (dryRun?.dryRun) {
    console.log('Skipping IPFS metadata upload (dry-run mode)');
    console.log('Metadata to upload:', JSON.stringify(metadataObject, null, 2));
  } else {
    metadataUrl = await IpfsUpload.uploadMetadata(metadataObject, apiKey);
  }

  if (dryRun?.printPayload) {
    console.log('Metadata URL:', metadataUrl);
  }

  const seed = SeedGenerator.generateBoardSeed();

  const apiPayload = {
    chainId: argsValidated.data.chainId,
    signer: solanaWrapper.publicKey,
    seed,
    metaData: metadataUrl,
    flashLaunchFeePer: argsValidated.data.flashLaunchFeePer,
    fees: argsValidated.data.fees,
    isSandboxMode: argsValidated.data.isSandboxMode,
  };

  if (dryRun?.printPayload) {
    console.log('\nAPI Payload for /sol/apply-sub-board:');
    console.log(JSON.stringify(apiPayload, null, 2));
  }

  if (dryRun?.dryRun) {
    console.log('Skipping API call to /sol/apply-sub-board (dry-run mode)');
    console.log('\n========== DRY RUN COMPLETE ==========');
    console.log('Would have called: POST /sol/apply-sub-board');
    console.log('Wallet:', solanaWrapper.publicKey);
    console.log('Board Title:', argsValidated.data.title);
    console.log('========================================\n');
    return { dryRun: true, payload: apiPayload };
  }

  console.log('\nStep 2 of 2: Creating the board on Solana devnet');
  console.log('This creates your branded launchpad on basedbid.');
  console.log('Requesting board creation transaction from basedbid...');

  const validated = createSolanaBoardApiSchema.parse(apiPayload);

  const json = await BasedBidApi.invokeApi<CreateBoardSolanaApiResponse>(
    ApiType.SDK,
    'sol/apply-sub-board',
    validated,
    'Failed to create board on Solana',
    args.isSandboxMode,
    apiKey,
  );

  const { transaction, blockhash, lastValidBlockHeight } = json;

  const signature = await solanaWrapper.sendTransaction(
    transaction,
    blockhash,
    lastValidBlockHeight,
    undefined,
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

  console.log('\n--- RESULT ---');
  console.log(
    JSON.stringify(
      {
        ok: true,
        type: 'board',
        network: SOLANA_CHAIN_NAME_CONFIG[argsValidated.data.chainId],
        boardId: result.boardId,
        signature: result.signature,
        metadataUrl: result.metadataUrl,
        basedBidUrl: `${BasedBidApi.platformApiUrl(args.isSandboxMode)}/b/${result.boardId}`,
      },
      null,
      2,
    ),
  );

  return result;
};
