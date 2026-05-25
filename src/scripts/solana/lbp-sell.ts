import 'dotenv/config';
import { ApiType } from 'enums';
import { SellSolanaResponse } from 'interfaces/sell/solana/response';
import { validateEnvironmentSolana } from 'schema/environment';
import { SellSolanaApi } from 'schema/sell/solana/api';
import { SellSolanaSdk, sellSolanaSdkSchema } from 'schema/sell/solana/sdk';
import { BasedBidApi } from 'utils/based-bid-api';
import { SolanaWrapper } from 'utils/solana-wrapper';

export const sellSolana = async (args: SellSolanaSdk) => {
  const env = validateEnvironmentSolana();

  const data = sellSolanaSdkSchema.parse(args);

  const solanaWrapper = new SolanaWrapper(
    env.SOLANA_RPC_URL,
    env.SOLANA_PRIVATE_KEY,
  );
  await solanaWrapper.init();

  const payload: SellSolanaApi = {
    chainId: data.chainId,
    signer: solanaWrapper.publicKey,
    memeMint: data.address,
    amount: data.amount,
    slippage: data.slippage,
  };

  const json = await BasedBidApi.invokeApi<SellSolanaResponse>(
    ApiType.SDK,
    'sol/lbp-sell',
    payload,
    `Failed to sell ${data.address} on Solana`,
    data.isSandboxMode,
  );

  const { transaction, blockhash, lastValidBlockHeight } = json;

  const signature = await solanaWrapper.sendTransaction(
    transaction,
    blockhash,
    lastValidBlockHeight,
  );

  await solanaWrapper.awaitTxConfirmation(signature);
};
