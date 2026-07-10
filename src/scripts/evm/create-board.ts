import 'dotenv/config';

import subBoardFacetAbi from 'constants/abi/SubBoardFacet.json';
import { CHAIN_NAME_CONFIG } from 'constants/chain-config';
import { ApiType } from 'enums';
import {
  EvmApiResponse,
  OpenbidRunOptions,
  resolveRunMode,
} from 'interfaces/common';
import { createEvmBoardSchema, CreateEvmBoardSdk } from 'schema/board/evm/sdk';
import {
  BasedBidApi,
  EvmValidator,
  initEvmClients,
  IpfsUpload,
  LogHelper,
  normalizeByAbi,
  sendTransaction,
} from 'utils';

export const createEvmBoard = async (
  args: CreateEvmBoardSdk,
  options?: OpenbidRunOptions,
) => {
  const { printPayload, dryRun, validate } = resolveRunMode(options);

  if (printPayload) {
    LogHelper.printSectionWithSeparator('- - - Creating Board on EVM - - -');
  }

  const { data, env } = EvmValidator.validate<CreateEvmBoardSdk>(
    createEvmBoardSchema,
    args,
    options,
  );

  if (validate) {
    console.log('Validation passed');
    return;
  }

  let logoUrl = 'https://ipfs.based.bid/ipfs/null';
  if (dryRun) {
    console.log('Skipping logo upload (dry-run mode)');
    console.log('Logo path:', data.logo);
  } else {
    logoUrl = await IpfsUpload.uploadImage(data.logo);
  }

  let bannerUrl = 'https://ipfs.based.bid/ipfs/null';
  if (dryRun) {
    console.log('Skipping banner upload (dry-run mode)');
    console.log('Banner path:', data.banner);
  } else {
    bannerUrl = await IpfsUpload.uploadImage(data.banner);
  }

  const metadata = {
    title: data.title,
    description: data.description,
    logo: logoUrl,
    banner: bannerUrl,
  };

  let metadataUrl = 'https://ipfs.based.bid/ipfs/null';
  if (dryRun) {
    console.log('Skipping IPFS metadata upload (dry-run mode)');
    console.log('Metadata to upload:', JSON.stringify(metadata, null, 2));
  } else {
    metadataUrl = await IpfsUpload.uploadMetadata(metadata);
  }

  const { publicClient, walletClient, account } = initEvmClients(
    data.chainId,
    env.PRIVATE_KEY,
  );

  const apiPayload = {
    account: account.address,
    chainId: data.chainId,
    title: data.title,
    description: data.description,
    fees: data.fees,
    logoUrl,
    bannerUrl,
    metaUri: metadataUrl,
  };

  if (printPayload) {
    LogHelper.printApiPayload('create-board', apiPayload);
  }

  if (dryRun) {
    LogHelper.printDryRunSummary('create-board', apiPayload);
    return { dryRun: true, payload: apiPayload };
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

  const result = await sendTransaction({
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

  LogHelper.printResult({
    ok: true,
    network: CHAIN_NAME_CONFIG[data.chainId],
    boardAddress: json.address,
    signature: result.transactionHash,
    metadataUrl,
    basedBidUrl: `${BasedBidApi.platformApiUrl(args.isSandboxMode)}/b/${data.title.toLowerCase()}`,
  });

  return result;
};
