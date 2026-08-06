import 'dotenv/config';

import { SOLANA_CHAIN_NAME_CONFIG } from '@constants';
import { ApiType, SolanaFlashDexType } from '@enums';
import {
  CreateSolanaFlashTx1ApiResponse,
  OpenbidRunOptions,
  resolveRunMode,
  SolanaVanityUpdateData,
} from '@interfaces';
import {
  buildSolanaFeeDistributionFields,
  CreateSolanaFlashInput,
  createSolanaFlashInputSchema,
  CreateSolanaFlashTx1Api,
  CreateSolanaFlashTx2Api,
} from '@schema';
import { KeyPairSigner } from '@solana/kit';
import {
  BasedBidApi,
  IpfsUpload,
  LogHelper,
  printNextSteps,
  retryAsync,
  SolanaValidator,
  SolanaWrapper,
} from '@utils';

let launchedToken: SolanaVanityUpdateData | null = null;

export const createSolanaFlashToken = async (
  args: CreateSolanaFlashInput,
  options?: OpenbidRunOptions,
) => {
  let launchConfirmed = false;

  const { printPayload, dryRun, validate } = resolveRunMode(options);

  if (printPayload) {
    LogHelper.printSectionWithSeparator(
      '- - - Creating Flash Token on Solana - - -',
    );
  }

  try {
    const { data, env } = SolanaValidator.validate<CreateSolanaFlashInput>(
      createSolanaFlashInputSchema,
      args,
      options,
    );

    if (validate) {
      console.log('Validation passed');
      return;
    }

    const solanaWrapper = new SolanaWrapper(env.SOLANA_PRIVATE_KEY);
    await solanaWrapper.init(data.chainId);

    const { token, raydium, meteora, board, fees, flashDex } = data;

    // Validate the full Fee Builder wire payload BEFORE any SOL is spent.
    // Previously it was only validated at step 4, after tx1/tx2 were signed and
    // paid for, so a bad fee config launched the token and then lost its fees.
    const feeDistributionFields = fees?.feeDistribution
      ? buildSolanaFeeDistributionFields(fees)
      : null;

    const skipConfirmation = process.env.SKIP_TX_CONFIRMATION === 'true';

    const apiKey = board ? process.env.BASEDBID_API_KEY : undefined;

    let logoUrl = 'https://ipfs.based.bid/ipfs/null';
    if (dryRun) {
      console.log('Skipping logo upload (dry-run mode)');
      console.log('Logo path:', data.token.metadata.logo);
    } else {
      logoUrl = await IpfsUpload.uploadImage(data.token.metadata.logo, apiKey);
    }

    const metadata = {
      name: token.name,
      symbol: token.symbol,
      decimals: 9,
      totalSupply: token.totalSupply,
      logo: logoUrl,
      twitter: token.metadata.twitter ?? '',
      telegram: token.metadata.telegram ?? '',
      website: token.metadata.website ?? '',
      discord: token.metadata.discord ?? '',
      description: token.metadata.description,
      ...(board && { board }),
    };

    let metadataUrl = 'https://ipfs.based.bid/ipfs/null';
    if (dryRun) {
      console.log('Skipping IPFS metadata upload (dry-run mode)');
      console.log('Metadata to upload:', JSON.stringify(metadata, null, 2));
    } else {
      metadataUrl = await IpfsUpload.uploadMetadata(metadata, apiKey);
    }

    const tx1Payload: CreateSolanaFlashTx1Api = {
      chainId: args.chainId,
      signer: solanaWrapper.publicKey,
      flashDex,
      token: {
        name: token.name,
        symbol: token.symbol,
        metadataUrl: metadataUrl,
        totalSupply: token.totalSupply,
        decimals: 9,
        initialBuySupplyPercent: token.initialBuySupplyPercent,
      },
      hasInitialSwap: Number(token.initialBuySupplyPercent) > 0,
      ...(flashDex === SolanaFlashDexType.RAYDIUM &&
        raydium && {
          raydiumFeeTierIndex: raydium.feeTierIndex,
          finalStartPrice: raydium.finalStartPrice,
        }),
      ...(flashDex === SolanaFlashDexType.METEORA &&
        meteora && {
          baseTokenMint: 'So11111111111111111111111111111111111111112',
          virtualUsd: meteora.virtualUsd,
          nativeSolPriceUsd: meteora.nativeSolPriceUsd,
          meteoraFeeTierIndex: meteora.feeTierIndex,
          hasHookDynamicFee: meteora.hasHookDynamicFee,
          boardSeed: meteora.boardSeed,
        }),
    };

    if (printPayload) {
      LogHelper.printApiPayload('sol/create-flash-tx1', tx1Payload);
    }

    if (dryRun) {
      LogHelper.printDryRunSummary('sol/create-flash-tx1', tx1Payload);
      return { dryRun: true, payload: tx1Payload };
    }

    console.log('\nStep 1 of 3: Creating the token mint');
    console.log(
      'This prepares the token contract address for your Flash Token.',
    );

    const tx1Response =
      await BasedBidApi.invokeApi<CreateSolanaFlashTx1ApiResponse>(
        ApiType.SDK,
        'sol/create-flash-tx1',
        tx1Payload,
        'Failed to create flash token mint transaction',
        args.isSandboxMode,
      );

    if (!tx1Response || !tx1Response.transaction) {
      throw new Error(
        'basedbid API Error: Failed to create flash token mint transaction',
      );
    }

    const mintSigner = await solanaWrapper.getSignerFromPrivateKey(
      tx1Response.mintSignerSecretHex,
    );

    let positionNftSigner: KeyPairSigner<string> | null = null;
    if (tx1Response.positionNftSignerSecretHex) {
      positionNftSigner = await solanaWrapper.getSignerFromPrivateKey(
        tx1Response.positionNftSignerSecretHex,
      );
    }

    const tx1Signature = await solanaWrapper.sendTransaction(
      tx1Response.transaction,
      tx1Response.blockhash,
      tx1Response.lastValidBlockHeight,
      `${tx1Response.txCost?.totalRequired.sol} SOL`,
      [
        mintSigner.keyPair,
        ...(positionNftSigner ? [positionNftSigner.keyPair] : []),
      ],
      {
        description: 'Create Flash Token Mint',
        skipConfirmation,
      },
    );

    launchedToken = {
      chainId: args.chainId,
      mintAddress: tx1Response.mintAddress,
      signature: tx1Signature,
    };

    await solanaWrapper.awaitTxConfirmation(tx1Signature);

    // For Meteora, tx2 is only the optional initial-buy swap. The server
    // resolves the effective buy amount and reports `tx2Required: false` when
    // it is 0 (e.g. tiny virtualUsd rounds the swap input to 0 lamports) -
    // in that case skip straight to confirm-launch.
    let tx2Signature: Awaited<
      ReturnType<typeof solanaWrapper.sendTransaction>
    > | null = null;

    if (tx1Response.tx2Required === false) {
      console.log(
        '\nStep 2 of 3: Skipping market initialization (server reported tx2 not required - no initial swap resolved)',
      );
    } else {
      console.log('\nStep 2 of 3: Initializing the Flash Token market');
      console.log(
        'This connects the new token to the selected DEX trading setup.',
      );

      tx2Signature = await runFlashTx2();
    }

    async function runFlashTx2() {
      const tx2Payload: CreateSolanaFlashTx2Api = {
        chainId: args.chainId,
        signer: solanaWrapper.publicKey,
        flashDex: data.flashDex,
        tx1Signature,
        flashSeed: tx1Response.flashSeed,
        mintAddress: tx1Response.mintAddress,
        baseTokenMint: 'So11111111111111111111111111111111111111112',
        raiseTokenDecimals: 9,
        token: {
          totalSupply: args.token.totalSupply,
          decimals: 9,
          initialBuySupplyPercent: token.initialBuySupplyPercent,
        },
        ...(data.flashDex === SolanaFlashDexType.RAYDIUM &&
          args.raydium && {
            raydiumFeeTierIndex: args.raydium.feeTierIndex,
            finalStartPrice: args.raydium.finalStartPrice,
          }),
        ...(data.flashDex === SolanaFlashDexType.METEORA &&
          args.meteora && {
            virtualUsd: args.meteora.virtualUsd,
            meteoraFeeTierIndex: args.meteora.feeTierIndex,
            meteoraTokenAccountSeed: tx1Response.meteoraTokenAccountSeed,
            finalStartPrice: args.meteora.finalStartPrice,
          }),
      };

      console.log(
        'Requesting market initialization transaction from basedbid...',
      );
      const tx2Response =
        await BasedBidApi.invokeApi<CreateSolanaFlashTx1ApiResponse>(
          ApiType.SDK,
          'sol/create-flash-tx2',
          tx2Payload,
          'Failed to create flash token market transaction',
          args.isSandboxMode,
        );

      if (!tx2Response || !tx2Response.transaction) {
        throw new Error(
          'basedbid API Error: Failed to create flash token market transaction',
        );
      }

      console.log('Market initialization transaction received.');

      const tx2Signers = [];

      if (tx2Response.positionNftSignerSecretHex) {
        const tx2PositionNftSigner =
          await solanaWrapper.getSignerFromPrivateKey(
            tx2Response.positionNftSignerSecretHex,
          );

        tx2Signers.push(tx2PositionNftSigner.keyPair);
      }

      const signature = await solanaWrapper.sendTransaction(
        tx2Response.transaction,
        tx2Response.blockhash,
        tx2Response.lastValidBlockHeight,
        undefined,
        tx2Signers,
        {
          description: 'Initialize Flash Token Market',
          skipConfirmation,
        },
      );

      await solanaWrapper.awaitTxConfirmation(signature);

      return signature;
    }

    console.log(
      `\nStep 3 of ${feeDistributionFields ? '4' : '3'}: Confirming the launch with basedbid`,
    );
    console.log('This makes the token visible to basedbid services.');

    await BasedBidApi.invokeApi(
      ApiType.SDK,
      'sol/confirm-launch',
      {
        chainId: args.chainId,
        mintAddress: tx1Response.mintAddress,
        signature: tx1Signature,
      },
      'Failed to confirm launch',
      args.isSandboxMode,
    );
    launchConfirmed = true;

    let feeDistributionApplied = false;
    if (feeDistributionFields) {
      console.log('\nStep 4 of 4: Applying Fee Builder settings');
      console.log('This routes post-launch fees using basedbid Fee Builder.');

      // Fields were fully validated before tx1; only chainId/address are added here.
      const feeDistributionPayload = {
        chainId: args.chainId,
        address: tx1Response.mintAddress,
        ...feeDistributionFields,
      };

      try {
        await retryAsync(
          () =>
            BasedBidApi.invokeApi(
              ApiType.PLATFORM,
              'token/fee-distribution',
              feeDistributionPayload,
              'Failed to set fee distribution on Solana Flash Token',
              args.isSandboxMode,
            ),
          { label: 'Fee Builder setup' },
        );
        feeDistributionApplied = true;
      } catch (feeError) {
        // The token is live and confirmed - a fee-builder failure must not fail
        // the launch (or worse, trigger vanity release); surface recovery steps.
        console.error(
          '\nWARNING: Token launched, but applying Fee Builder settings failed after retries.',
        );
        console.error(
          feeError instanceof Error ? feeError.message : String(feeError),
        );
        printNextSteps('Recover Fee Builder Settings', [
          `Token mint ${tx1Response.mintAddress} launched successfully - do NOT relaunch.`,
          'Re-apply the same fee settings from the token owner panel on based.bid.',
        ]);
      }
    }

    const result = {
      mintAddress: tx1Response.mintAddress,
      tx1Signature,
      tx2Signature,
      metadataUrl,
      meteoraTokenAccountSeed: tx1Response.meteoraTokenAccountSeed,
      positionNftMintAddress: tx1Response.positionNftMintAddress,
      ...(feeDistributionFields && { feeDistributionApplied }),
    };

    LogHelper.printResult({
      ok: true,
      type: 'flash-token',
      network: SOLANA_CHAIN_NAME_CONFIG[args.chainId],
      mintAddress: result.mintAddress,
      signature: result.tx2Signature ?? result.tx1Signature,
      metadataUrl: result.metadataUrl,
    });

    return result;
  } catch (error) {
    LogHelper.printResult({
      ok: false,
      network: SOLANA_CHAIN_NAME_CONFIG[args.chainId],
      error,
      retryable: launchedToken === null,
      nextSteps:
        launchedToken !== null
          ? [
              'The mint transaction may have succeeded. Try releasing the vanity address and retry.',
            ]
          : ['Check your configuration and try again'],
    });

    if (launchedToken != null && !launchConfirmed) {
      LogHelper.printSectionWithSeparator(
        'Flash Token launch did not complete',
      );
      console.log(
        'The mint transaction succeeded, but a later setup step failed.',
      );
      console.log(`Mint address: ${launchedToken.mintAddress}`);
      console.log(`Mint tx:      ${launchedToken.signature}`);
      console.log('');
      console.log('Releasing the reserved vanity address with basedbid...');

      await BasedBidApi.invokeApi(
        ApiType.SDK,
        'sol/release-vanity',
        {
          chainId: launchedToken.chainId,
          mintAddress: launchedToken.mintAddress,
          signature: launchedToken.signature,
        },
        'Failed to release vanity',
        args.isSandboxMode,
      );

      console.log('Reserved vanity address released.');
      console.log('You can safely retry the same command.\n');
    }

    throw error;
  }
};
