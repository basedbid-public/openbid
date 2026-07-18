import { SOLANA_CHAIN_NAME_CONFIG, SOLANA_CHAIN_SLUG_CONFIG } from '@constants';
import { ApiType } from '@enums';
import {
  ClaimSolanaFeeApiResponse,
  OpenbidRunOptions,
  resolveRunMode,
} from '@interfaces';
import {
  ClaimSolanaLbpFeesRequest,
  claimSolanaLbpFeesRequestSchema,
} from '@schema';
import { BasedBidApi, LogHelper, SolanaValidator, SolanaWrapper } from '@utils';
import 'dotenv/config';

export const claimSolanaLbpFees = async (
  args: ClaimSolanaLbpFeesRequest,
  options?: OpenbidRunOptions,
) => {
  const { printPayload, dryRun, validate } = resolveRunMode(options);

  if (printPayload) {
    LogHelper.printSectionWithSeparator(
      '- - - Claiming LBP Fees on Solana - - -',
    );
  }
  const { data, env } = SolanaValidator.validate<ClaimSolanaLbpFeesRequest>(
    claimSolanaLbpFeesRequestSchema,
    args,
    options,
  );

  if (validate) {
    console.log('Validation passed');
    return;
  }

  const solanaWrapper = new SolanaWrapper(env.SOLANA_PRIVATE_KEY);
  await solanaWrapper.init(data.chainId);

  const apiPayload = {
    chainId: data.chainId,
    memeMint: data.memeMint,
    signer: solanaWrapper.publicKey,
  };

  if (printPayload) {
    LogHelper.printApiPayload('sol/collect-lbp-fees', apiPayload);
  }

  if (dryRun) {
    LogHelper.printDryRunSummary('sol/collect-lbp-fees', apiPayload);
    return { dryRun: true, payload: apiPayload };
  }

  const json = await BasedBidApi.invokeApi<ClaimSolanaFeeApiResponse>(
    ApiType.SDK,
    'sol/collect-lbp-fees',
    apiPayload,
    'Failed to claim LBP fees on Solana',
    args.isSandboxMode,
  );

  const { transaction, blockhash, lastValidBlockHeight } = json;

  const signature = await solanaWrapper.sendTransaction(
    transaction,
    blockhash,
    lastValidBlockHeight,
    undefined,
    [],
    {
      description: 'Claim LBP Fees',
      skipConfirmation: args.isSandboxMode,
    },
  );

  await solanaWrapper.awaitTxConfirmation(signature);

  LogHelper.printResult({
    ok: true,
    network: SOLANA_CHAIN_NAME_CONFIG[data.chainId],
    tokenAddress: data.memeMint,
    signature,
    basedBidUrl: `${BasedBidApi.platformApiUrl(args.isSandboxMode)}/${SOLANA_CHAIN_SLUG_CONFIG[args.chainId]}/token/${data.memeMint}`,
  });
};
