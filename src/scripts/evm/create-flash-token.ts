import { API_URL } from 'constants/api-url';
import 'dotenv/config';
import { validateEnvironment } from 'schema/environment';
import { BasedBidApi } from 'utils/based-bid-api';
import { initRpcClients } from 'utils/init-evm-rpc';
import { IpfsUpload } from 'utils/ipfs-upload';
import { sendTransaction } from 'utils/send-transaction';

import flashLaunchV3Abi from '@constants/abi/FlashLaunchForV3Facet.json';
import flashLaunchV4Abi from '@constants/abi/FlashLaunchForV4Facet.json';
import { EvmDexType } from '@enums/evm';
import { CreateFlashTokenEvmResponse } from '@interfaces/flash-token/create/evm/response';
import {
  CreateFlashTokenEvmApi,
  evmFlashTokenCreateApiSchema,
} from 'schema/flash-token/evm/api';
import { CreateFlashTokenEvmSdk } from 'schema/flash-token/evm/sdk';
import { normalizeByAbi } from 'utils/normalize-abi';

export const createFlashToken = async (args: CreateFlashTokenEvmSdk) => {
  const env = validateEnvironment();

  const { publicClient, walletClient, account } = initRpcClients(
    args.chainId,
    env.EVM_RPC_URL,
    env.PRIVATE_KEY,
  );

  const logoUrl = await IpfsUpload.uploadImage(args.token.metadata.logo);

  const metadataIpfs = {
    name: args.token.name,
    symbol: args.token.symbol,
    decimals: 18,
    totalSupply: args.token.totalSupply,
    logo: logoUrl,
    board: args.boardTitle,
    twitter: args.token.metadata.twitter,
    telegram: args.token.metadata.telegram,
    website: args.token.metadata.website,
    discord: args.token.metadata.discord,
    description: args.token.metadata.description,
  };

  const metadataUrl = await IpfsUpload.uploadMetadata(metadataIpfs);

  const endpoint = `${API_URL}/create-flash`;

  let sale = args.sale;
  if (!sale) {
    sale = {
      marketCap: 10_000,
      maxTxAmountPercent: 0.1,
      protectBlocks: 20,
    };
  }

  const apiPayload: CreateFlashTokenEvmApi = {
    chainId: args.chainId,
    token: {
      name: args.token.name,
      symbol: args.token.symbol,
      totalSupply: args.token.totalSupply,
      initialBuyAmount: args.token.initialBuyAmount,
      metadataUrl,
    },
    sale: {
      boardTitle: args.boardTitle,
      marketCap: sale.marketCap,
      maxTxAmountPercent: sale.maxTxAmountPercent,
      protectBlocks: sale.protectBlocks,
    },
    dex: {
      version: args.dex.version,
      feeTier: args.dex.feeTier,
    },
    fees: {
      v4: args.fees?.v4,
    },
  };

  const payload = evmFlashTokenCreateApiSchema.parse(apiPayload);

  const json = await BasedBidApi.invokeApi<CreateFlashTokenEvmResponse>(
    endpoint,
    {
      data: payload,
    },
    'Failed to create flash token on EVM',
  );

  const txValue = BigInt(json.value);

  const flashLaunchAbi = [
    EvmDexType.UNISWAP_V4,
    EvmDexType.PANCAKESWAP_V4,
  ].includes(args.dex.version)
    ? flashLaunchV4Abi
    : flashLaunchV3Abi;

  const flashLaunchFunctionAbi = flashLaunchAbi.find(
    (item) => item.type === 'function' && item.name === json.functionName,
  );

  if (!flashLaunchFunctionAbi || !('inputs' in flashLaunchFunctionAbi)) {
    throw new Error(
      `Function ${json.functionName} not found in FlashLaunchForV3Facet.json or FlashLaunchForV4Facet.json`,
    );
  }

  const tupleArgs = flashLaunchFunctionAbi.inputs.map((input, index) =>
    normalizeByAbi(json.args[index], input, `args[${index}]`),
  );

  return await sendTransaction({
    publicClient,
    walletClient,
    account,
    address: json.address,
    abi: flashLaunchAbi,
    functionName: json.functionName,
    args: tupleArgs,
    value: txValue,
  });
};
