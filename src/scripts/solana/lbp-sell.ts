import { SellSolanaResponse } from '@interfaces/sell/solana/response';
import { SolanaWrapper } from '@utils/solana-wrapper';
import { API_URL } from 'constants/api-url';
import 'dotenv/config';
import { validateEnvironmentSolana } from 'schema/environment';
import { SellSolanaApi } from 'schema/sell/solana/api';
import { SellSolanaSdk, sellSolanaSdkSchema } from 'schema/sell/solana/sdk';
import { BasedBidApi } from 'utils/based-bid-api';

export const sellSolana = async (args: SellSolanaSdk) => {
  const env = validateEnvironmentSolana();

  const data = sellSolanaSdkSchema.parse(args);

  const solanaWrapper = new SolanaWrapper(
    env.SOLANA_RPC_URL,
    env.SOLANA_PRIVATE_KEY,
  );
  await solanaWrapper.init();

  const endpoint = `${API_URL}/sol/lbp-sell`;

  const payload: SellSolanaApi = {
    chainId: 5011,
    signer: solanaWrapper.publicKey,
    memeMint: data.address,
    amount: data.amount,
    slippage: data.slippage,
  };

  const json = await BasedBidApi.invokeApi<SellSolanaResponse>(
    endpoint,
    payload,
    `Failed to sell ${data.address} on Solana`,
  );

  const { transaction, blockhash, lastValidBlockHeight } = json;

  const signature = await solanaWrapper.sendTransaction(
    transaction,
    blockhash,
    lastValidBlockHeight,
  );

  await solanaWrapper.awaitTxConfirmation(signature);
};
