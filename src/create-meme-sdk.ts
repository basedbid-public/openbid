import 'dotenv/config';
import { validateEnvironment } from 'schema/environment';
import {
  DexConfigBuilder,
  InitialDataBuilder,
  IpfsMetadataBuilder,
  OpenClawSDK,
  V4HookDataBuilder,
} from './sdk';

const env = validateEnvironment();

const sdk = new OpenClawSDK({
  chainId: SUPPORTED_CHAINS.BASE,
  rpcUrl: RPC_URL,
  privateKey: PRIVATE_KEY,
  contractAddress: CONTRACT_ADDRESS,
});

async function createMemeWithSDK() {
  // 1. Build IPFS metadata
  const metadata = IpfsMetadataBuilder.create()
    .withTokenInfo('maximus', 'MAX', 18)
    .withSupply('1000000000000000000000000', '1234567890')
    .withLogo(
      'https://ipfs.based.bid/ipfs/bafkreifaailwvemorihbittkhovlvdm2rcgvux4hsufnzytxih7rzdijji',
    )
    .withBoard('based', 'based')
    .build();

  // Note: In production, upload this metadata to IPFS and get the metadataId
  const metadataId =
    'https://ipfs.based.bid/ipfs/bafkreiaxxveuebhyucc53ndf2w7qmvnv45v77kebqnnoubnbgwd4uwgybq';

  // 2. Build DEX configurations
  const dexConfigs = DexConfigBuilder.create()
    .addDex(
      '0x03a520b32c04bf3beef7beb72e919cf822ed34f1', // Uniswap V3 Position Manager on Base
      500, // 0.05% fee tier
      10, // tick spacing
      1000000,
      { poolId: BigInt(0), isLPBurn: false },
    )
    .build();

  // 3. Build InitialMemeTokenData
  const now = Math.floor(Date.now() / 1000);
  const initialData = InitialDataBuilder.create()
    .withBaseToken(CONTRACT_ADDRESS)
    .withLiquidity('1000000000000000000000000', '1000000000000000000000000')
    .withMarketCap('2000000000000000000000000')
    .withTiming(now, 2 ** 40 - 1) // now to max uint40
    .withAllocations(BigInt(0), BigInt(0))
    .withDex(dexConfigs)
    .withMetadata(metadataId)
    .build();

  // 4. Build V4HookData (disabled in this example)
  const v4HookData = V4HookDataBuilder.create().withV4Hook(false).build();

  // 5. Create the meme token
  console.log('Creating meme token with OpenClaw SDK...');
  console.log('From address:', sdk.getAddress());

  const result = await sdk.createMeme({
    initCode: INIT_CODE,
    subBoardTitle: metadata.board,
    totalSupply: BigInt(metadata.totalSupply),
    name: metadata.name,
    symbol: metadata.symbol,
    decimals: metadata.decimals,
    initialData: OpenClawSDK.buildInitialData(initialData),
    v4HookData: [OpenClawSDK.buildV4HookData(v4HookData)],
    referrer: ZERO_ADDRESS,
  });

  console.log('Meme token created successfully!');
  console.log('Transaction hash:', result.hash);
  console.log('Block number:', result.blockNumber.toString());
  console.log('Gas used:', result.gasUsed.toString());
  console.log('Explorer URL:', result.explorerUrl);

  return result;
}

// Run the example
createMemeWithSDK().catch((error) => {
  console.error('Error creating meme:', error);
  process.exit(1);
});
