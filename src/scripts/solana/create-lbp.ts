import { SolanaDexType } from '@enums/solana/dex.type';
import { CreateLbpSolanaApiResponse } from '@interfaces/lbp/create/solana/api-response';
import { getLaunchPackageIndex } from '@utils/get-launch-package-index';
import { API_URL } from 'constants/api-url';
import { SOLANA_DECIMALS } from 'constants/solana';
import { SOLANA_BASE_TOKEN_PAIR } from 'constants/solana/base-token-pair';
import 'dotenv/config';
import { validateEnvironmentSolana } from 'schema/environment';
import { createLbpSolanaApiPayloadSchema } from 'schema/lbp/solana/api-request';
import { solanaFeeDistributionApiPayloadSchema } from 'schema/lbp/solana/fee-distribution';
import { CreateSolanaLbpInput } from 'schema/lbp/solana/sdk-input';
import { SolanaLbpValidator } from 'schema/lbp/solana/validator';
import { BasedBidApi, IpfsUpload, SeedGenerator, SolanaWrapper } from 'utils';

export const createLbpSolana = async (args: CreateSolanaLbpInput) => {
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
    twitter: token.metadata.twitter,
    telegram: token.metadata.telegram,
    website: token.metadata.website,
    discord: token.metadata.discord,
    description: token.metadata.description,
    whitelist: sale.whitelistedAddresses,
    board,
    boardOwner,
    seed,
  };

  const metadataUrl = await IpfsUpload.uploadMetadata(ipfsMetadata);

  const endpoint = `${API_URL}/sol/create-lbp`;

  const apiPayload = {
    chainId: 5011,
    signer: solanaWrapper.publicKey,
    data: {
      seed,
      advanced: true,
      package: getLaunchPackageIndex(data.package),
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

  const validated = createLbpSolanaApiPayloadSchema.parse(apiPayload);

  const json = await BasedBidApi.invokeApi<CreateLbpSolanaApiResponse>(
    endpoint,
    validated,
    'Failed to create LBP on Solana',
  );

  const { transaction, mintSignerSecretHex, blockhash, lastValidBlockHeight } =
    json;

  const mintSigner =
    await solanaWrapper.getSignerFromPrivateKey(mintSignerSecretHex);

  const signature = await solanaWrapper.sendTransaction(
    transaction,
    blockhash,
    lastValidBlockHeight,
    [mintSigner.keyPair],
  );

  await solanaWrapper.awaitTxConfirmation(signature);

  if (!fees?.feeDistribution) {
    return;
  }

  // Call fee-distribution API to set Fee Builder params
  const feeDistributionEndpoint = `https://testnet.based.bid/api/token/fee-distribution`;

  const feeDistributionPayload = {
    chainId: 5011,
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
    feeDistributionEndpoint,
    solanaFeeDistributionValidated.data,
    'Failed to set fee distribution on Solana',
  );
};
