import subBoardFacetAbi from '@constants/abi/SubBoardFacet.json';

import 'dotenv/config';

import { CreateBoardApiResponse } from '@interfaces/board/response';
import { API_URL } from 'constants/api-url';
import { writeFileSync } from 'fs';
import { CreateBoardRequest } from 'interfaces/board/request';
import { createBoardSchema } from 'schema/board/api';
import { validateEnvironment } from 'schema/environment';
import { BasedBidApi } from 'utils/based-bid-api';
import { initRpcClients } from 'utils/init-evm-rpc';
import { IpfsUpload } from 'utils/ipfs-upload';
import { normalizeByAbi } from 'utils/normalize-abi';
import { sendTransaction } from 'utils/send-transaction';

export const createBoard = async (args: CreateBoardRequest) => {
  const env = validateEnvironment();

  const validated = createBoardSchema.parse(args);

  console.log('Creating board:', validated.title);
  console.log('Chain ID:', validated.chainId);
  console.log('Uploading logo to IPFS...');

  const logoUrl = await IpfsUpload.uploadImage(validated.logo);

  console.log('Logo uploaded:', logoUrl);

  let bannerUrl: string | undefined;
  if (validated.banner) {
    console.log('Uploading banner to IPFS...');
    bannerUrl = await IpfsUpload.uploadImage(validated.banner);
    console.log('Banner uploaded:', bannerUrl);
  }

  const metadata = {
    title: validated.title,
    description: validated.description,
    logo: logoUrl,
    banner: bannerUrl,
  };

  console.log('Uploading metadata to IPFS...');

  const metadataUrl = await IpfsUpload.uploadMetadata(metadata);

  console.log('Metadata uploaded:', metadataUrl);

  const endpoint = `${API_URL}/create-board`;

  const { publicClient, walletClient, account } = initRpcClients(
    validated.chainId,
    env.RPC_URL,
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

  console.log('Calling API for board creation transaction data...');

  writeFileSync(
    'board-api-create-payload.json',
    JSON.stringify(apiPayload, null, 2),
  );

  const json = await BasedBidApi.invokeApi<CreateBoardApiResponse>(endpoint, {
    data: apiPayload,
  }).catch(() => {
    return null;
  });

  if (!json) {
    throw new Error('Failed to create board (BasedBid API)');
  }

  writeFileSync(
    'board-api-create-response.json',
    JSON.stringify(json, null, 2),
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
