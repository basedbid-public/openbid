import { SOLANA_BASE_TOKEN_PAIR, SOLANA_DECIMALS } from 'constants/solana';
import 'dotenv/config';
import { ApiType, SolanaDexType } from 'enums';
import { CreateLbpSolanaApiResponse } from 'interfaces/lbp/create/solana/api-response';
import { validateEnvironmentSolana } from 'schema/environment';
import { createLbpSolanaApiPayloadSchema } from 'schema/lbp/solana/api-request';
import { solanaFeeDistributionApiPayloadSchema } from 'schema/lbp/solana/fee-distribution';
import { CreateSolanaLbpInput } from 'schema/lbp/solana/sdk-input';
import { SolanaLbpValidator } from 'schema/lbp/solana/validator';
import { SolanaChainId } from 'types/chain-id';
import {
  BasedBidApi,
  getLaunchPackageIndex,
  IpfsUpload,
  SeedGenerator,
  SolanaWrapper,
} from 'utils';

let launchedToken: {
  chainId: SolanaChainId;
  mintAddress: string;
  signature: string;
} | null = null;

export const createLbpSolana = async (args: CreateSolanaLbpInput) => {
  try {
    const env = validateEnvironmentSolana();

    const input = SolanaLbpValidator.validateInput(args);

    const solanaWrapper = new SolanaWrapper(
      env.SOLANA_RPC_URL,
      env.SOLANA_PRIVATE_KEY,
    );
    await solanaWrapper.init();

    const data = input;
    const { token, board, boardOwner, dex, fees } = data;

    let sale = data.sale;

    if (!sale) {
      sale = {
        marketCap: '9000',
        maxAllocationPerUser: '0',
        whitelistedAddresses: [],
      };
    }

    const logoUrl = await IpfsUpload.uploadImage(token.metadata.logo);

    const seed = SeedGenerator.generateNumericSeed(5);

    const ipfsMetadata = {
      name: token.name,
      symbol: token.symbol,
      decimals: SOLANA_DECIMALS,
      totalSupply: token.totalSupply,
      logo: logoUrl,
      twitter: token.metadata.twitter ?? '',
      telegram: token.metadata.telegram ?? '',
      website: token.metadata.website ?? '',
      discord: token.metadata.discord ?? '',
      description: token.metadata.description,
      whitelist: sale.whitelistedAddresses,
      ...(board && { board }),
      ...(boardOwner && { boardOwner }),
      seed,
    };

    const metadataUrl = await IpfsUpload.uploadMetadata(ipfsMetadata);

    const apiPayload = {
      chainId: args.chainId,
      signer: solanaWrapper.publicKey,
      data: {
        isSandboxMode: data.isSandboxMode,
        seed,
        advanced: true,
        package: getLaunchPackageIndex(data.package),
        baseTokenAddress: SOLANA_BASE_TOKEN_PAIR,
        baseTokenDecimals: SOLANA_DECIMALS,
        token: {
          name: token.name,
          symbol: token.symbol,
          totalSupply: token.totalSupply,
          decimals: SOLANA_DECIMALS,
          initialBuyAmount: token.initialBuyAmount,
          metadataUrl,
          raiseTokenDecimals: SOLANA_DECIMALS,
        },
        dex: {
          routerId: dex.version,
          ...(dex.version === SolanaDexType.METEORA && {
            meteoraFeeTierIndex: dex.feeTier,
          }),
          ...(dex.version === SolanaDexType.RAYDIUM && {
            raydiumFeeTierIndex: dex.feeTier,
          }),
        },
        sale: {
          marketCap: sale.marketCap,
          softCap: sale.softCap,
          endTime: sale.endTime,
          initialBuyAmount: token.initialBuyAmount,
          startTime: sale.startTime,
          maxAllocationPerUser: sale.maxAllocationPerUser,
          baseTokenForPair: SOLANA_BASE_TOKEN_PAIR,
          baseTokenDecimals: SOLANA_DECIMALS,
          referrer: sale.referrer,
        },
        ...(fees && {
          fees: {
            buyTokenOwnerFee: fees.buyPoolCreator,
            sellTokenOwnerFee: fees.sellPoolCreator,
            buyReferralFee: fees.buyReferral,
            graduation: fees.graduation,
          },
        }),
      },
    };

    const validated = createLbpSolanaApiPayloadSchema.safeParse(apiPayload);

    if (!validated.success) {
      throw new Error('Invalyid API payload: ' + validated.error.message);
    }

    const json = await BasedBidApi.invokeApi<CreateLbpSolanaApiResponse>(
      ApiType.SDK,
      'sol/create-lbp',
      validated.data,
      'Failed to create LBP on Solana',
      args.isSandboxMode,
    );

    const {
      transaction,
      mintSignerSecretHex,
      blockhash,
      lastValidBlockHeight,
    } = json;

    const mintSigner =
      await solanaWrapper.getSignerFromPrivateKey(mintSignerSecretHex);

    const signature = await solanaWrapper.sendTransaction(
      transaction,
      blockhash,
      lastValidBlockHeight,
      [mintSigner.keyPair],
      { description: 'Create LBP', skipConfirmation: args.isSandboxMode },
    );

    launchedToken = {
      chainId: args.chainId,
      mintAddress: json.mintAddress,
      signature,
    };

    await solanaWrapper.awaitTxConfirmation(signature);

    if (!fees?.feeDistribution) {
      return;
    }

    // Call fee-distribution API to set Fee Builder params

    const feeDistributionPayload = {
      chainId: args.chainId,
      address: json.mintAddress,
      ...fees,
    };

    const solanaFeeDistributionValidated =
      solanaFeeDistributionApiPayloadSchema.safeParse(feeDistributionPayload);
    if (!solanaFeeDistributionValidated.success) {
      throw new Error(
        'Invalid fee distribution payload: ' +
          solanaFeeDistributionValidated.error.message,
      );
    }

    await BasedBidApi.invokeApi(
      ApiType.PLATFORM,
      'token/fee-distribution',
      solanaFeeDistributionValidated.data,
      'Failed to set fee distribution on Solana',
      args.isSandboxMode,
    );

    await BasedBidApi.invokeApi(
      ApiType.SDK,
      'sol/confirm-launch',
      {
        chainId: args.chainId,
        mintAddress: json.mintAddress,
        signature,
      },
      'Failed to confirm launch',
      args.isSandboxMode,
    );
  } catch (error) {
    console.error('Error creating LBP on Solana: ', error);
    if (launchedToken != null) {
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
    }
    throw error;
  }
};
