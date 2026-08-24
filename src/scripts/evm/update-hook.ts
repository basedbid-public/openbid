import { CHAIN_NAME_CONFIG } from '@constants';
import { ApiType } from '@enums';
import {
  OpenbidRunOptions,
  resolveRunMode,
  UpdateHookApiResponse,
} from '@interfaces';
import {
  resolveRwaRewardAsset,
  updateEvmHookApiSchema,
  UpdateEvmHookSdk,
  updateEvmHookSdkSchema,
} from '@schema';
import {
  BasedBidApi,
  EvmValidator,
  initEvmClients,
  LogHelper,
  sendTransaction,
} from '@utils';
import 'dotenv/config';

export const updateEvmHook = async (
  args: UpdateEvmHookSdk,
  options?: OpenbidRunOptions,
) => {
  const { printPayload, dryRun, validate } = resolveRunMode(options);

  if (printPayload) {
    LogHelper.printSectionWithSeparator('- - - Updating Hook on EVM - - -');
  }

  const { data, env } = EvmValidator.validate<UpdateEvmHookSdk>(
    updateEvmHookSdkSchema,
    args,
    options,
  );

  if (validate) {
    console.log('Validation passed');
    return;
  }

  const chainId = data.chainId;
  const tokenAddress = data.tokenAddress;

  const apiPayloadResult = updateEvmHookApiSchema.safeParse({
    tokenAddress,
    chainId: data.chainId,
    ...(data.fees && { fees: data.fees }),
    ...(data.rwa && {
      rwa: {
        basketMode: data.rwa.basketMode,
        rewardAssets: data.rwa.rewardAssets.map(resolveRwaRewardAsset),
        ...(data.rwa.customWalletRewards && {
          customWalletRewards: Object.fromEntries(
            Object.entries(data.rwa.customWalletRewards).map(
              ([key, basket]) => [
                key,
                {
                  basketMode: basket.basketMode,
                  assets: basket.assets.map(resolveRwaRewardAsset),
                },
              ],
            ),
          ),
        }),
      },
    }),
  });

  if (!apiPayloadResult.success) {
    throw new Error(
      'Invalid EVM update-hook API payload: ' + apiPayloadResult.error.message,
    );
  }

  const apiPayload = { data: apiPayloadResult.data };

  if (printPayload) {
    LogHelper.printApiPayload('update-hook', apiPayload);
  }

  if (dryRun) {
    LogHelper.printDryRunSummary('update-hook', apiPayload);
    return { dryRun: true, payload: apiPayload };
  }

  const { publicClient, walletClient, account } = initEvmClients(
    chainId,
    env.PRIVATE_KEY,
  );

  const preview = await BasedBidApi.invokeApi<UpdateHookApiResponse>(
    ApiType.SDK,
    'update-hook',
    apiPayload,
    'Failed to build update-hook transactions',
    data.isSandboxMode,
  );

  if (!preview.ok) {
    throw new Error(preview.error ?? 'update-hook returned ok: false');
  }

  const transactions = preview.transactions;
  const skipConfirmation =
    data.isSandboxMode || process.env.SKIP_TX_CONFIRMATION === 'true';

  const receipts = [];
  for (const [index, tx] of transactions.entries()) {
    console.log(
      `\nSubmitting update-hook tx ${index + 1}/${transactions.length}: ${tx.functionName} (${tx.target})`,
    );

    const receipt = await sendTransaction({
      publicClient,
      walletClient,
      account,
      address: tx.address,
      abi: tx.abi,
      functionName: tx.functionName,
      args: tx.args,
      value: 0n,
      errorLabel: `Update Hook (${tx.functionName})`,
      skipConfirmation,
    });
    receipts.push(receipt);
  }

  LogHelper.printResult({
    ok: true,
    network: CHAIN_NAME_CONFIG[chainId],
    tokenAddress,
    hookAddress: preview.hookAddress,
    transactions: transactions.map((tx) => tx.functionName),
    signatures: receipts.map((r) => r.transactionHash),
  });

  return { preview, receipts };
};
