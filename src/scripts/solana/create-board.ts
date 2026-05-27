import 'dotenv/config';
import { ApiType } from 'enums';
import { CreateBoardSolanaApiResponse } from 'interfaces/board/solana/api-response';
import { createSolanaBoardApiSchema } from 'schema/board/solana/api';
import {
  CreateSolanaBoardSdk,
  createSolanaBoardSdkSchema,
} from 'schema/board/solana/sdk';
import { validateEnvironmentSolana } from 'schema/environment';
import { BasedBidApi, IpfsUpload, SeedGenerator, SolanaWrapper } from 'utils';

export const createSolanaBoard = async (args: CreateSolanaBoardSdk) => {
  const env = validateEnvironmentSolana();

  const argsValidated = createSolanaBoardSdkSchema.safeParse(args);
  if (!argsValidated.success) {
    throw new Error('Invalid input arguments: ' + argsValidated.error.message);
  }

  const solanaWrapper = new SolanaWrapper(
    env.SOLANA_RPC_URL,
    env.SOLANA_PRIVATE_KEY,
  );
  await solanaWrapper.init();

  console.log('\nStep 1 of 2: Uploading board branding');
  console.log('This uploads the board logo, banner, and description to IPFS.');

  const logoUrl = await IpfsUpload.uploadImage(args.logo);
  const bannerUrl = await IpfsUpload.uploadImage(args.banner);

  const metadataUrl = await IpfsUpload.uploadMetadata({
    title: args.title,
    description: args.description,
    logo: logoUrl,
    banner: bannerUrl,
  });

  const apiPayload = {
    chainId: args.chainId,
    signer: solanaWrapper.publicKey,
    seed: SeedGenerator.generateBoardSeed(),
    metaData: metadataUrl,
    flashLaunchFeePer: args.flashLaunchFeePer,
    fees: args.fees,
    isSandboxMode: args.isSandboxMode,
  };

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

  return {
    boardId: json.boardId ?? 'not returned by API',
    boardTitle: json.boardTitle ?? args.title,
    metadataUrl: json.metadataUrl ?? metadataUrl,
    signature,
  };
};
