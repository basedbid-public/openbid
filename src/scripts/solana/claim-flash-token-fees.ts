import { ClaimSolanaFeeResponse } from '@interfaces/claim-fees/solana/api';
import 'dotenv/config';
import { ClaimFeesSolanaRequest } from 'schema/claim-fees/solana/request';
import { validateEnvironmentSolana } from 'schema/environment';
import { BasedBidApi, SolanaWrapper } from 'utils';

export const claimFlashTokenFeesSolana = async (
  params: ClaimFeesSolanaRequest,
) => {
  const env = validateEnvironmentSolana();

  const solanaWrapper = new SolanaWrapper(
    env.SOLANA_RPC_URL,
    env.SOLANA_PRIVATE_KEY,
  );
  await solanaWrapper.init();

  const endpoint = `https://cdn.based.bid/api/sol/collect-flash-fees`;

  console.log('Calling API for flash token fees collection...');

  const json = await BasedBidApi.invokeApi<ClaimSolanaFeeResponse>(
    endpoint,
    {
      chainId: params.chainId,
      signer: solanaWrapper.publicKey,
      flashMint: params.address,
    },
    'Failed to claim flash token fees on Solana',
  );

  const { transaction, blockhash, lastValidBlockHeight } = json;

  const signature = await solanaWrapper.sendTransaction(
    transaction,
    blockhash,
    lastValidBlockHeight,
  );

  await solanaWrapper.awaitTxConfirmation(signature);
};
