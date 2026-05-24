import subBoardFacetAbi from '@constants/abi/SubBoardFacet.json';

import 'dotenv/config';

import { CreateBoardApiResponse } from '@interfaces/board/evm/api-response';
import { API_URL } from 'constants/api-url';
import { createEvmBoardSchema, CreateEvmBoardSdk } from 'schema/board/evm/sdk';
import { validateEnvironment } from 'schema/environment';
import { BasedBidApi } from 'utils/based-bid-api';
import { initRpcClients } from 'utils/init-evm-rpc';
import { IpfsUpload } from 'utils/ipfs-upload';
import { normalizeByAbi } from 'utils/normalize-abi';
import { sendTransaction } from 'utils/send-transaction';

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

  const endpoint = `${API_URL}/create-board`;

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
  };

  const json = await BasedBidApi.invokeApi<CreateBoardApiResponse>(
    endpoint,
    {
      data: apiPayload,
    },
    'Failed to create board on EVM',
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
  });
};
