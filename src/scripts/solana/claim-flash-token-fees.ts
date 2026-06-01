import { SOLANA_CHAIN_NAME_CONFIG } from 'constants/solana-chain-config';
import 'dotenv/config';
import { ApiType } from 'enums';
import { ClaimSolanaFeeApiResponse } from 'interfaces/claim-fees';
import { OpenbidRunOptions } from 'interfaces/common';
import {
  ClaimSolanaFlashTokenFeesRequest,
  claimSolanaFlashTokenFeesRequestSchema,
} from 'schema/claim-fees/solana/flash-request';
import { BasedBidApi, LogHelper, SolanaValidator, SolanaWrapper } from 'utils';

export const claimSolanaFlashFees = async (
  args: ClaimSolanaFlashTokenFeesRequest,
  options?: OpenbidRunOptions,
) => {
  const { printPayload, dryRun, validate } = options ?? {};

  if (printPayload) {
    LogHelper.printSectionWithSeparator(
      '- - - Claiming Flash Token Fees on Solana - - -',
    );
  }

  const { data, env } =
    SolanaValidator.validate<ClaimSolanaFlashTokenFeesRequest>(
      claimSolanaFlashTokenFeesRequestSchema,
      args,
    );

  if (validate) {
    console.log('Validation passed');
    return;
  }

  const solanaWrapper = new SolanaWrapper(env.SOLANA_PRIVATE_KEY);
  await solanaWrapper.init(data.chainId);

  const apiPayload = {
    chainId: data.chainId,
    flashMint: data.flashMint,
    signer: solanaWrapper.publicKey,
  };

  if (printPayload) {
    LogHelper.printApiPayload('sol/collect-flash-fees', apiPayload);
  }

  if (dryRun) {
    LogHelper.printDryRunSummary('sol/collect-flash-fees', apiPayload);
    return { dryRun: true, payload: apiPayload };
  }

  const json = await BasedBidApi.invokeApi<ClaimSolanaFeeApiResponse>(
    ApiType.SDK,
    'sol/collect-flash-fees',
    apiPayload,
    'Failed to claim Solana flash token fees',
    args.isSandboxMode,
  );

  const signature = await solanaWrapper.sendTransaction(
    json.transaction,
    json.blockhash,
    json.lastValidBlockHeight,
    undefined,
    [],
    {
      description: 'Claim Solana Flash Token Fees',
      skipConfirmation: args.isSandboxMode,
    },
  );

  await solanaWrapper.awaitTxConfirmation(signature);

  LogHelper.printResult({
    ok: true,
    network: SOLANA_CHAIN_NAME_CONFIG[data.chainId],
    flashMint: data.flashMint,
    signature,
  });

  return signature;
};
