import { BuySolanaResponse } from '@interfaces/buy/solana/response';
import { SolanaWrapper } from '@utils/solana-wrapper';
import { API_URL } from 'constants/api-url';
import 'dotenv/config';
import { BuySolanaApi } from 'schema/buy/solana/api';
import { BuySolanaSdk, buySolanaSdkSchema } from 'schema/buy/solana/sdk';
import { validateEnvironmentSolana } from 'schema/environment';
import { BasedBidApi } from 'utils/based-bid-api';

export const buySolana = async (args: BuySolanaSdk) => {
  const env = validateEnvironmentSolana();

  const data = buySolanaSdkSchema.parse(args);

  const solanaWrapper = new SolanaWrapper(
    env.SOLANA_RPC_URL,
    env.SOLANA_PRIVATE_KEY,
  );
  await solanaWrapper.init();

  const endpoint = `${API_URL}/sol/lbp-buy`;

  const apiPayload: BuySolanaApi = {
    chainId: 5011,
    signer: solanaWrapper.publicKey,
    memeMint: data.address,
    amount: data.amount,
    slippage: data.slippage,
    tokenBalance: '0.001',
    referrer: data.referrer,
  };

  const json = await BasedBidApi.invokeApi<BuySolanaResponse>(
    endpoint,
    apiPayload,
    `Failed to buy ${data.address} on Solana`,
  );

  const { transaction, blockhash, lastValidBlockHeight } = json;

  const signature = await solanaWrapper.sendTransaction(
    transaction,
    blockhash,
    lastValidBlockHeight,
  );

  await solanaWrapper.awaitTxConfirmation(signature);
};
