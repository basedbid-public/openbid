import creationFacetAbi from '@constants/abi/CreationFacet.json';

import 'dotenv/config';

import { LaunchPackageType } from '@enums/launch-package.type';
import { CreateLbpEvmSdk } from '@interfaces/lbp/create/evm/sdk';
import { API_URL } from 'constants/api-url';
import { validateEnvironment } from 'schema/environment';
import { evmLbpCreateApiSchema } from 'schema/lbp/create/api';
import { evmLbpCreateSchema } from 'schema/lbp/create/sdk';
import { BasedBidApi } from 'utils/based-bid-api';
import { initRpcClients } from 'utils/init-evm-rpc';
import { IpfsUpload } from 'utils/ipfs-upload';
import { normalizeByAbi } from 'utils/normalize-abi';
import { sendTransaction } from 'utils/send-transaction';
import { base } from 'viem/chains';
import { CreateLbpEvmApi, CreateLbpEvmResponse } from './interfaces';

export const createLbp = async (args: CreateLbpEvmSdk) => {
  const env = validateEnvironment();

  const argsValidated = evmLbpCreateSchema.safeParse(args);
  if (!argsValidated.success) {
    throw new Error('Invalid input arguments: ' + argsValidated.error.message);
  }

  const { publicClient, walletClient, account } = initRpcClients(
    args.chainId,
    env.RPC_URL,
    env.PRIVATE_KEY,
  );

  const logoUrl = await IpfsUpload.uploadImage(args.token.metadata.logo);

  const metadataIpfs = {
    name: args.token.name,
    symbol: args.token.symbol,
    decimals: 18,
    totalSupply: args.token.totalSupply,
    logo: logoUrl,
    board: args.token.boardTitle,
    twitter: args.token.metadata.twitter ?? '',
    telegram: args.token.metadata.telegram ?? '',
    website: args.token.metadata.website ?? '',
    discord: args.token.metadata.discord ?? '',
    description: args.token.metadata.description ?? '',
    whitelist: [],
  };

  const metadataUrl = await IpfsUpload.uploadMetadata(metadataIpfs);

  const endpoint = `${API_URL}/create-lbp`;

  const apiPayload: CreateLbpEvmApi = {
    package:
      args.package === LaunchPackageType.BASED
        ? 0
        : args.package === LaunchPackageType.SUPER_BASED
          ? 1
          : 2,
    chainId: base.id,
    token: {
      name: args.token.name,
      symbol: args.token.symbol,
      totalSupply: args.token.totalSupply,
      initialBuyAmount: args.token.initialBuyAmount,
      metadataUrl: metadataUrl,
    },
    sale: {
      boardTitle: args.token.boardTitle ?? 'based',
      marketCap: args.token.marketCap,
      startTime: Math.floor(Date.now() / 1000),
      maxAllocationPerUser: 0,
      maxAllocationPerWhitelistedUser: 0,
      delayTradeTime: 0,
      whitelistedAddresses: [],
      softCap: {
        amount: 1,
        endTime: Math.floor(Date.now() / 1000) + 25 * 60 * 60,
      },
    },
    dex: {
      version: args.dex.version,
      feeTier: args.dex.feeTier,
    },
    fees: {
      buyPoolCreator: args.fees.buyPoolCreator,
      sellPoolCreator: args.fees.sellPoolCreator,
      buyReferral: args.fees.buyReferral,
      graduation: args.fees.graduation,
      v4: args.fees.v4,
    },
  };

  const validated = evmLbpCreateApiSchema.parse(apiPayload);

  const json = await BasedBidApi.invokeApi<CreateLbpEvmResponse>(endpoint, {
    data: validated,
  }).catch(() => {
    return null;
  });

  if (!json) {
    throw new Error('Failed to create LBP (BasedBid API)');
  }

  const txValue = BigInt(json.value);

  const createMemeAbi = creationFacetAbi.find(
    (item) => item.type === 'function' && item.name === json.functionName,
  );

  if (!createMemeAbi || !('inputs' in createMemeAbi)) {
    throw new Error(
      `Function ${json.functionName} not found in CreationFacet ABI`,
    );
  }

  const tupleArgs = createMemeAbi.inputs.map((input, index) =>
    normalizeByAbi(json.args[index], input, `args[${index}]`),
  );

  return await sendTransaction({
    publicClient,
    walletClient,
    account,
    address: json.address,
    abi: creationFacetAbi,
    functionName: json.functionName,
    args: tupleArgs,
    value: txValue,
  });
};
