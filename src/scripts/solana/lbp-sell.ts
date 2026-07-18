import { SOLANA_CHAIN_NAME_CONFIG, SOLANA_CHAIN_SLUG_CONFIG } from '@constants';
import { ApiType } from '@enums';
import {
  OpenbidRunOptions,
  resolveRunMode,
  SolanaApiResponse,
} from '@interfaces';
import { SellSolanaApi, SellSolanaSdk, sellSolanaSdkSchema } from '@schema';
import { BasedBidApi, LogHelper, SolanaValidator, SolanaWrapper } from '@utils';
import 'dotenv/config';

export const solanaLbpSell = async (
  args: SellSolanaSdk,
  options?: OpenbidRunOptions,
) => {
  const { printPayload, dryRun, validate } = resolveRunMode(options);

  if (printPayload) {
    LogHelper.printSectionWithSeparator('- - - Selling LBP on Solana - - -');
  }

  const { data, env } = SolanaValidator.validate<SellSolanaSdk>(
    sellSolanaSdkSchema,
    args,
    options,
  );

  if (validate) {
    console.log('Validation passed');
    return;
  }

  const solanaWrapper = new SolanaWrapper(env.SOLANA_PRIVATE_KEY);
  await solanaWrapper.init(data.chainId);

  const apiPayload: SellSolanaApi = {
    chainId: data.chainId,
    signer: solanaWrapper.publicKey,
    memeMint: data.address,
    amount: data.amount,
    slippage: data.slippage,
  };

  if (printPayload) {
    LogHelper.printApiPayload('sol/lbp-sell', apiPayload);
  }

  if (dryRun) {
    LogHelper.printDryRunSummary('sol/lbp-sell', apiPayload);
    return { dryRun: true, payload: apiPayload };
  }

  const json = await BasedBidApi.invokeApi<SolanaApiResponse>(
    ApiType.SDK,
    'sol/lbp-sell',
    apiPayload,
    `Failed to sell ${data.address} on Solana`,
    data.isSandboxMode,
  );

  const { transaction, blockhash, lastValidBlockHeight } = json;

  const signature = await solanaWrapper.sendTransaction(
    transaction,
    blockhash,
    lastValidBlockHeight,
    undefined,
    [],
    {
      description: `Sell ${data.amount} tokens`,
      skipConfirmation: data.isSandboxMode,
    },
  );

  await solanaWrapper.awaitTxConfirmation(signature);

  LogHelper.printResult({
    ok: true,
    network: SOLANA_CHAIN_NAME_CONFIG[data.chainId],
    tokenAddress: data.address,
    amount: data.amount,
    signature,
    basedBidUrl: `${BasedBidApi.platformApiUrl(data.isSandboxMode)}/${SOLANA_CHAIN_SLUG_CONFIG[data.chainId]}/token/${data.address}`,
  });
};
