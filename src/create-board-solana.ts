import { CreateBoardSolanaSdk } from '@interfaces/board/solana/sdk';
import { API_URL } from 'constants/api-url';
import 'dotenv/config';
import { CreateBoardSolanaResponse } from 'interfaces/board/solana/response';
import { createBoardSolanaApiSchema } from 'schema/board/solana-api';
import { createBoardSolanaSdkSchema } from 'schema/board/solana-sdk';
import { validateEnvironment } from 'schema/environment';
import { BasedBidApi, IpfsUpload, SeedGenerator, SolanaWrapper } from 'utils';
export const createBoardSolana = async (args: CreateBoardSolanaSdk) => {
  const env = validateEnvironment();

  const argsValidated = createBoardSolanaSdkSchema.safeParse(args);
  if (!argsValidated.success) {
    throw new Error('Invalid input arguments: ' + argsValidated.error.message);
  }

  const solanaWrapper = new SolanaWrapper(
    env.SOLANA_RPC_URL,
    env.SOLANA_PRIVATE_KEY,
  );
  await solanaWrapper.init();

  console.log('Creating board on Solana:', args.title);

  const logoUrl = await IpfsUpload.uploadImage(args.logo);
  const bannerUrl = await IpfsUpload.uploadImage(args.banner);

  const metadataUrl = await IpfsUpload.uploadMetadata({
    title: args.title,
    description: args.description,
    logo: logoUrl,
    banner: bannerUrl,
  });

  const endpoint = `${API_URL}/sol/apply-sub-board`;

  const apiPayload = {
    chainId: 5011,
    signer: solanaWrapper.publicKey,
    seed: SeedGenerator.generateBoardSeed(),
    metaData: metadataUrl,
    flashLaunchFeePer: args.flashLaunchFeePer,
    fees: args.fees,
  };

  console.log('Calling API for board creation transaction data...');

  const validated = createBoardSolanaApiSchema.parse(apiPayload);

  console.log(validated);
  const json = await BasedBidApi.invokeApi<CreateBoardSolanaResponse>(
    endpoint,
    validated,
  );
  if (!json || !json.transaction) {
    throw new Error('Based Bid API Error: Failed to create board on Solana');
  }

  const { transaction, blockhash, lastValidBlockHeight } = json;

  const signature = await solanaWrapper.sendTransaction(
    transaction,
    blockhash,
    lastValidBlockHeight,
  );

  await solanaWrapper.awaitTxConfirmation(signature);

  return {
    boardId: json.boardId,
    boardTitle: json.boardTitle,
    metadataUrl: json.metadataUrl,
    signature,
  };
};
