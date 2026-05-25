import creationFacetAbi from 'constants/abi/CreationFacet.json';
import 'dotenv/config';
import { ApiType } from 'enums';
import { EvmApiResponse } from 'interfaces';
import { validateEnvironment } from 'schema/environment';
import { CreateLbpEvmApi, evmLbpCreateApiSchema } from 'schema/lbp/evm/api';
import { CreateLbpEvmSdk, evmLbpCreateSchema } from 'schema/lbp/evm/sdk';
import {
  BasedBidApi,
  getLaunchPackageIndex,
  initRpcClients,
  IpfsUpload,
  normalizeByAbi,
  sendTransaction,
} from 'utils';

export const createLbp = async (args: CreateLbpEvmSdk) => {
  const env = validateEnvironment();

  const argsValidated = evmLbpCreateSchema.safeParse(args);
  if (!argsValidated.success) {
    throw new Error('Invalid input arguments: ' + argsValidated.error.message);
  }

  const input = argsValidated.data;
  const { token, sale, dex, fees } = input;

  const { publicClient, walletClient, account } = initRpcClients(
    input.chainId,
    env.EVM_RPC_URL,
    env.PRIVATE_KEY,
  );

  const logoUrl = await IpfsUpload.uploadImage(token.metadata.logo);

  const metadataIpfs = {
    name: token.name,
    symbol: token.symbol,
    decimals: 18,
    totalSupply: token.totalSupply,
    logo: logoUrl,
    board: token.boardTitle,
    twitter: token.metadata.twitter ?? '',
    telegram: token.metadata.telegram ?? '',
    website: token.metadata.website ?? '',
    discord: token.metadata.discord ?? '',
    description: token.metadata.description ?? '',
    whitelist: sale.whitelistedAddresses ?? [],
  };

  const metadataUrl = await IpfsUpload.uploadMetadata(metadataIpfs);

  const apiPayload: CreateLbpEvmApi = {
    isSandboxMode: input.isSandboxMode,
    package: getLaunchPackageIndex(input.package),
    chainId: input.chainId,
    token: {
      name: token.name,
      symbol: token.symbol,
      totalSupply: token.totalSupply,
      initialBuyAmount: token.initialBuyAmount,
      metadataUrl,
    },
    sale: {
      boardTitle: token.boardTitle,
      marketCap: token.marketCap,
      startTime: sale.startTime,
      maxAllocationPerUser: sale.maxAllocationPerUser,
      maxAllocationPerWhitelistedUser: sale.maxAllocationPerWhitelistedUser,
      delayTradeTime: sale.delayTradeTime ?? 0,
      whitelistedAddresses: sale.whitelistedAddresses,
      ...(sale.softCap && { softCap: sale.softCap }),
    },
    dex: {
      version: dex.version,
      feeTier: dex.feeTier,
    },
    fees: {
      buyPoolCreator: fees.buyPoolCreator,
      sellPoolCreator: fees.sellPoolCreator,
      buyReferral: fees.buyReferral,
      graduation: fees.graduation,
      v4: fees.v4,
    },
  };

  const validated = evmLbpCreateApiSchema.parse(apiPayload);

  const json = await BasedBidApi.invokeApi<EvmApiResponse>(
    ApiType.SDK,
    'create-lbp',
    {
      data: validated,
    },
    'Failed to create flash token on EVM',
    args.isSandboxMode,
  );

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
