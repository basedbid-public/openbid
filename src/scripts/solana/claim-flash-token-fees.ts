import 'dotenv/config';
import { ApiType } from 'enums';
import { ClaimSolanaFeeResponse } from 'interfaces/claim-fees/solana/api';
import { ClaimFeesSolanaRequest } from 'schema/claim-fees/solana/request';
import { validateEnvironmentSolana } from 'schema/environment';
import { BasedBidApi, SolanaWrapper } from 'utils';

export const claimFlashTokenFeesSolana = async (
  args: ClaimFeesSolanaRequest,
) => {
  const env = validateEnvironmentSolana();

  const solanaWrapper = new SolanaWrapper(
    env.SOLANA_RPC_URL,
    env.SOLANA_PRIVATE_KEY,
  );
  await solanaWrapper.init();

  console.log('Calling API for flash token fees collection...');

  const json = await BasedBidApi.invokeApi<ClaimSolanaFeeResponse>(
    ApiType.SDK,
    'sol/collect-flash-fees',
    {
      chainId: args.chainId,
      signer: solanaWrapper.publicKey,
      flashMint: args.address,
      isSandboxMode: args.isSandboxMode,
    },
    'Failed to claim flash token fees on Solana',
    args.isSandboxMode,
  );

  const { transaction, blockhash, lastValidBlockHeight } = json;

  const signature = await solanaWrapper.sendTransaction(
    transaction,
    blockhash,
    lastValidBlockHeight,
  );

  await solanaWrapper.awaitTxConfirmation(signature);
};
