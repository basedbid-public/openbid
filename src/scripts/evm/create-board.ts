import subBoardFacetAbi from 'constants/abi/SubBoardFacet.json';
import 'dotenv/config';
import { ApiType } from 'enums';
import { DryRunOptions } from 'helpers/run';
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

export const createEvmBoard = async (
  args: CreateEvmBoardSdk,
  dryRun?: DryRunOptions,
) => {
  if (dryRun?.printPayload) {
    console.log('\nEVM Create Board - Dry Run');
    console.log('-----------------------------------');
  }

  const env = validateEnvironment();

  const validated = createEvmBoardSchema.parse(args);

  console.log(
    'Creating board on EVM (chainId:',
    validated.chainId,
    '):',
    validated.title,
  );

  let logoUrl = 'ipfs://placeholder-logo-url (DRY RUN)';
  let bannerUrl = 'ipfs://placeholder-banner-url (DRY RUN)';
  let metadataUrl = 'ipfs://placeholder-metadata-url (DRY RUN)';

  if (dryRun?.dryRun) {
    console.log('Skipping IPFS logo upload (dry-run mode)');
    console.log('Logo path:', validated.logo);
  } else {
    logoUrl = await IpfsUpload.uploadImage(validated.logo);
  }

  if (dryRun?.dryRun) {
    console.log('Skipping IPFS banner upload (dry-run mode)');
    console.log('Banner path:', validated.banner);
  } else {
    bannerUrl = await IpfsUpload.uploadImage(validated.banner);
  }

  if (dryRun?.printPayload) {
    console.log('Logo URL:', logoUrl);
    console.log('Banner URL:', bannerUrl);
  }

  const metadataObject = {
    title: validated.title,
    description: validated.description,
    logo: logoUrl,
    banner: bannerUrl,
  };

  if (dryRun?.dryRun) {
    console.log('Skipping IPFS metadata upload (dry-run mode)');
    console.log('Metadata to upload:', JSON.stringify(metadataObject, null, 2));
  } else {
    metadataUrl = await IpfsUpload.uploadMetadata(metadataObject);
  }

  if (dryRun?.printPayload) {
    console.log('Metadata URL:', metadataUrl);
  }

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

  if (dryRun?.printPayload) {
    console.log('\nAPI Payload for /create-board:');
    console.log(JSON.stringify({ data: apiPayload }, null, 2));
  }

  if (dryRun?.dryRun) {
    console.log('Skipping API call to /create-board (dry-run mode)');
    console.log('\n========== DRY RUN COMPLETE ==========');
    console.log('Would have called: POST /create-board');
    console.log('Wallet:', account.address);
    console.log('Chain ID:', validated.chainId);
    console.log('Board Title:', validated.title);
    console.log('========================================\n');
    return { dryRun: true, payload: { data: apiPayload } };
  }

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
