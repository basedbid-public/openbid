import subBoardFacetAbi from 'constants/abi/SubBoardFacet.json';
import 'dotenv/config';
import { ApiType } from 'enums';
import { EvmApiResponse } from 'interfaces';
import { createEvmBoardSchema, CreateEvmBoardSdk } from 'schema/board/evm/sdk';
import { validateEnvironment } from 'schema/environment';
import {
  BasedBidApi,
  initRpcClients,
  IpfsUpload,
  normalizeByAbi,
  sendTransaction,
} from 'utils';

export const createBoard = async (args: CreateEvmBoardSdk) => {
  const env = validateEnvironment();

  const validated = createEvmBoardSchema.parse(args);

  console.log(
    'Creating board on EVM (chainId:',
    validated.chainId,
    '):',
    validated.title,
  );

  const logoUrl = await IpfsUpload.uploadImage(validated.logo);
  const bannerUrl = await IpfsUpload.uploadImage(validated.banner);

  const metadataUrl = await IpfsUpload.uploadMetadata({
    title: validated.title,
    description: validated.description,
    logo: logoUrl,
    banner: bannerUrl,
  });

  const { publicClient, walletClient, account } = initRpcClients(
    validated.chainId,
    env.EVM_RPC_URL,
    env.PRIVATE_KEY,
  );

  const apiPayload = {
    chainId: validated.chainId,
    account: account.address,
    title: validated.title,
    description: validated.description,
    logoUrl,
    bannerUrl,
    metaUri: metadataUrl,
    fees: validated.fees,
    isSandboxMode: validated.isSandboxMode,
  };

  const json = await BasedBidApi.invokeApi<EvmApiResponse>(
    ApiType.SDK,
    'create-board',
    {
      data: apiPayload,
    },
    'Failed to create board on EVM',
    args.isSandboxMode,
  );

  const txValue = BigInt(json.value);

  const applySubBoardAbi = subBoardFacetAbi.abi.find(
    (item) => item.type === 'function' && item.name === json.functionName,
  );

  if (!applySubBoardAbi || !('inputs' in applySubBoardAbi)) {
    throw new Error(
      `Function ${json.functionName} not found in SubBoardFacet ABI`,
    );
  }

  const tupleArgs = applySubBoardAbi.inputs.map((input, index) =>
    normalizeByAbi(json.args[index], input, `args[${index}]`),
  );

  return await sendTransaction({
    publicClient,
    walletClient,
    account,
    address: json.address,
    abi: subBoardFacetAbi.abi,
    functionName: json.functionName,
    args: tupleArgs,
    value: txValue,
    errorLabel: 'Create Board',
    skipConfirmation: args.isSandboxMode,
  });
};
