import creationFacetAbi from '@constants/abi/CreationFacet.json';
import 'dotenv/config';
import { ZeroAddress } from 'ethers';
import { CreateMemeArgs } from 'interfaces/create-meme-args';
import { IpfsMetadata } from 'interfaces/ipfs-metadata';
import { validateEnvironment } from 'schema/environment';
import {
  createPublicClient,
  createWalletClient,
  http,
  parseUnits,
  type TransactionReceipt,
} from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { base } from 'viem/chains';

const env = validateEnvironment();

// Setup clients
const publicClient = createPublicClient({
  chain: base,
  transport: http(env.RPC_URL),
});

const account = privateKeyToAccount(env.PRIVATE_KEY);

const walletClient = createWalletClient({
  chain: base,
  transport: http(env.RPC_URL),
  account,
});

async function createMeme(args: CreateMemeArgs): Promise<TransactionReceipt> {
  console.log('Creating meme token...');
  console.log('From address:', account.address);
  console.log('Contract:', env.CONTRACT_ADDRESS);

  console.log('Args prepared, estimating gas...');

  // Convert CreateMemeArgs object to array for contract call
  const argsArray = [
    args.package,
    args.initCode,
    args.salt,
    args.subBoardTitle,
    args.referrer,
    args.totalSupply,
    args.name,
    args.symbol,
    args.decimals,
    args.initialBuyAmount,
    args.isXSale,
    args.initialData,
    args.v4HookData,
    args.minTokenBalanceForDividends,
  ];

  try {
    // Estimate gas
    const gasEstimate = await publicClient.estimateContractGas({
      address: env.CONTRACT_ADDRESS,
      abi: creationFacetAbi,
      functionName: 'createMeme',
      args: argsArray,
      account,
    });

    console.log('Gas estimate:', gasEstimate.toString());

    // Send transaction
    console.log('Sending transaction...');
    const hash = await walletClient.writeContract({
      address: env.CONTRACT_ADDRESS,
      abi: creationFacetAbi,
      functionName: 'createMeme',
      args: argsArray,
      gas: gasEstimate,
    });

    console.log('Transaction sent! Hash:', hash);
    console.log('Waiting for confirmation...');

    // Wait for receipt
    const receipt = await publicClient.waitForTransactionReceipt({
      hash,
      timeout: 120_000, // 2 minutes
    });

    console.log('Transaction confirmed!');
    console.log('Block number:', receipt.blockNumber);
    console.log('Gas used:', receipt.gasUsed.toString());
    console.log('Status:', receipt.status === 'success' ? 'Success' : 'Failed');
    console.log('Tx URL:', `https://basescan.org/tx/${hash}`);

    if (receipt.status === 'reverted') {
      throw new Error(`Transaction reverted at block ${receipt.blockNumber}`);
    }

    return receipt;
  } catch (error) {
    console.error('Error creating meme:', error);
    throw error;
  }
}

// Main execution
(async () => {
  const ipfs: IpfsMetadata = {
    name: 'maximus',
    symbol: 'MAX',
    decimals: 18,
    totalSupply: '1000000000000000000000000',
    seed: '1234567890',
    logo: 'https://ipfs.based.bid/ipfs/bafkreifaailwvemorihbittkhovlvdm2rcgvux4hsufnzytxih7rzdijji',
    board: 'based',
    boardOwner: 'based',
    twitter: '',
    telegram: '',
    website: '',
    discord: '',
    description: '',
    whitelist: [],
  };

  const metadataId =
    'https://ipfs.based.bid/ipfs/bafkreiaxxveuebhyucc53ndf2w7qmvnv45v77kebqnnoubnbgwd4uwgybq';

  // Generate a random salt using timestamp + random number
  const generateSalt = () => {
    const timestamp = Math.floor(Date.now() / 1000);
    const random = Math.floor(Math.random() * 1000000);
    const saltNum = BigInt(timestamp * 1000000 + random);
    return `0x${saltNum.toString(16).padStart(64, '0')}`;
  };

  const salt = generateSalt();
  console.log('Generated salt:', salt);

  const now = Math.floor(Date.now() / 1000);

  const args: CreateMemeArgs = {
    package: BigInt(0),
    initCode: env.INIT_CODE,
    salt,
    subBoardTitle: ipfs.board,
    referrer: ZeroAddress,
    totalSupply: parseUnits(ipfs.totalSupply, ipfs.decimals),
    name: ipfs.name,
    symbol: ipfs.symbol,
    decimals: ipfs.decimals,
    initialBuyAmount: BigInt(0),
    isXSale: false,
    initialData: [
      env.CONTRACT_ADDRESS, // baseTokenForPair
      '1000000000000000000000000', // liquidityForHardcap
      '1000000000000000000000000', // liquidityForSoftcap
      '2000000000000000000000000', // marketCap
      BigInt(0), // maxAllocationPerUser
      BigInt(0), // maxAllocationPerWhitelistedUser
      '0x0000000000000000000000000000000000000000000000000000000000000000', // whitelistMerkleRoot
      0, // buyReferralFeePer
      0, // sellMemeTokenOwnerFeePer
      0, // buyMemeTokenOwnerFeePer
      0, // finalizeFeePer
      0, // delayTradeTime
      now, // startTime
      2 ** 40 - 1, // endTime
      false, // isWhitelist
      0, // _padding
      [
        [
          '0x03a520b32c04bf3beef7beb72e919cf822ed34f1', // routerOrPositionManager
          BigInt(0), // poolId
          500, // fee
          10, // tickSpacing
          1000000, // per
          false, // isLPBurn
          0, // _padding
        ],
      ],
      metadataId,
    ],
    v4HookData: [
      [
        false, // hasV4Hook
        [
          100, // liquidityFeeBps
          100, // buybackFeeBps
          100, // rewardFeeBps
          [], // customWallets
          [], // customWalletBps
        ],
        BigInt(0), // feeThreshold
        '0x0000000000000000000000000000000000000000', // rewardToken
        [
          '0x0000000000000000000000000000000000000000', // currency0
          env.CONTRACT_ADDRESS, // currency1
          3000, // fee
          60, // tickSpacing
          '0x0000000000000000000000000000000000000000', // hooks
        ],
        0, // feeKind (Static)
        3000, // staticPoolFeeBpsBuy
        3000, // staticPoolFeeBpsSell
        100, // hookFeeBpsBuy
        100, // hookFeeBpsSell
        [
          100, // minBaseFeeBpsBuy
          100, // minBaseFeeBpsSell
          10000, // maxBaseFeeBpsBuy
          10000, // maxBaseFeeBpsSell
          1000000, // baseFeeFactorBuy
          1000000, // baseFeeFactorSell
          3000, // defaultBaseFeeBpsBuy
          3000, // defaultBaseFeeBpsSell
          3600, // surgeDecayPeriodSeconds
          2000000, // surgeMultiplierPpm
          false, // perSwapMode
          100000, // capAutoTuneStepPpm
          86400, // capAutoTuneIntervalSeconds
        ],
        [
          [], // buyFeesBps
          [], // sellFeesBps
          [], // buyFeeTierAmountLevels
          [], // sellFeeTierAmountLevels
        ],
        0, // protectPeriod
        BigInt(0), // maxBuyPerOrigin
        false, // isAntiSandwich
        0, // cooldownSeconds
        0, // penaltyFeeBps
        [
          3600, // volumeIntervalSeconds
          [], // volumeLevels
          [], // volumeMultiplierBps
        ],
      ],
    ],
    minTokenBalanceForDividends: BigInt(0),
  };

  await createMeme(args);
})().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
