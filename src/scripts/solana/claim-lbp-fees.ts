import 'dotenv/config';
import { ApiType } from 'enums';
import { ClaimSolanaFeeResponse } from 'interfaces/claim-fees/solana/api';
import { ClaimFeesSolanaRequest } from 'schema/claim-fees/solana/request';
import { validateEnvironmentSolana } from 'schema/environment';
import { BasedBidApi, SolanaWrapper } from 'utils';

export const claimSolanaLbpFees = async (args: ClaimFeesSolanaRequest) => {
  const env = validateEnvironmentSolana();

  const solanaWrapper = new SolanaWrapper(
    env.SOLANA_RPC_URL,
    env.SOLANA_PRIVATE_KEY,
  );
  await solanaWrapper.init();

  console.log('Calling API for LBP fees collection...');

  const json = await BasedBidApi.invokeApi<ClaimSolanaFeeResponse>(
    ApiType.SDK,
    'sol/collect-lbp-fees',
    {
      chainId: args.chainId,
      signer: solanaWrapper.publicKey,
      memeMint: args.address,
      isSandboxMode: args.isSandboxMode,
    },
    'Failed to claim LBP fees on Solana',
    args.isSandboxMode,
  );

  const { transaction, blockhash, lastValidBlockHeight } = json;

  const signature = await solanaWrapper.sendTransaction(
    transaction,
    blockhash,
    lastValidBlockHeight,
    undefined,
    { description: 'Claim LBP Fees', skipConfirmation: args.isSandboxMode },
  );

  await solanaWrapper.awaitTxConfirmation(signature);
};
