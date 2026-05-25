import 'dotenv/config';
import { ApiType } from 'enums';
import { BuySolanaResponse } from 'interfaces/buy/solana/api-response';
import { buySolanaApiSchema } from 'schema/buy/solana/api';
import { BuySolanaSdk, buySolanaSdkSchema } from 'schema/buy/solana/sdk';
import { validateEnvironmentSolana } from 'schema/environment';
import { BasedBidApi, SolanaWrapper } from 'utils';

export const buySolana = async (args: BuySolanaSdk) => {
  const env = validateEnvironmentSolana();

  const data = buySolanaSdkSchema.parse(args);

  const solanaWrapper = new SolanaWrapper(
    env.SOLANA_RPC_URL,
    env.SOLANA_PRIVATE_KEY,
  );
  await solanaWrapper.init();

  const apiPayload = {
    chainId: data.chainId,
    signer: solanaWrapper.publicKey,
    memeMint: data.address,
    amount: data.amount,
    slippage: data.slippage,
    referrer: data.referrer,
    isSandboxMode: data.isSandboxMode,
  };

  const validated = buySolanaApiSchema.parse(apiPayload);

  const json = await BasedBidApi.invokeApi<BuySolanaResponse>(
    ApiType.SDK,
    'sol/lbp-buy',
    validated,
    `Failed to buy ${data.address} on Solana`,
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
