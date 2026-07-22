import collectFeeForLBPFacetAbi from '@constants/abi/CollectFeeForLBPFacet.json';
import creationFacetAbi from '@constants/abi/CreationFacet.json';
import flashLaunchV3Abi from '@constants/abi/FlashLaunchForV3Facet.json';
import flashLaunchV4Abi from '@constants/abi/FlashLaunchForV4Facet.json';
import collectFeeForLBPFacetRobinhoodAbi from '@constants/abi/robinhood/CollectFeeForLBPFacet.json';
import creationFacetRobinhoodAbi from '@constants/abi/robinhood/CreationFacet.json';
import flashLaunchV3RobinhoodAbi from '@constants/abi/robinhood/FlashLaunchForV3Facet.json';
import flashLaunchV4RobinhoodAbi from '@constants/abi/robinhood/FlashLaunchForV4Facet.json';
import subBoardFacetRobinhoodAbi from '@constants/abi/robinhood/SubBoardFacet.json';
import tradeFacetRobinhoodAbi from '@constants/abi/robinhood/TradeFacet.json';
import subBoardFacetAbi from '@constants/abi/SubBoardFacet.json';
import tradeFacetAbi from '@constants/abi/TradeFacet.json';
import { EvmChainId } from '@typedefs';
import type { Abi } from 'viem';

export const ROBINHOOD_CHAIN_ID = 4663;

type AbiSource = Abi | { abi: Abi };

const unwrapAbi = (source: AbiSource): Abi =>
  Array.isArray(source) ? source : (source as { abi: Abi }).abi;

const resolveAbi = (
  chainId: EvmChainId,
  defaultAbi: AbiSource,
  robinhoodAbi: AbiSource,
): Abi => unwrapAbi(chainId === ROBINHOOD_CHAIN_ID ? robinhoodAbi : defaultAbi);

export const getCreationFacetAbi = (chainId: EvmChainId): Abi =>
  resolveAbi(
    chainId,
    creationFacetAbi as AbiSource,
    creationFacetRobinhoodAbi as AbiSource,
  );

export const getFlashLaunchV3Abi = (chainId: EvmChainId): Abi =>
  resolveAbi(
    chainId,
    flashLaunchV3Abi as AbiSource,
    flashLaunchV3RobinhoodAbi as AbiSource,
  );

export const getFlashLaunchV4Abi = (chainId: EvmChainId): Abi =>
  resolveAbi(
    chainId,
    flashLaunchV4Abi as AbiSource,
    flashLaunchV4RobinhoodAbi as AbiSource,
  );

export const getSubBoardFacetAbi = (chainId: EvmChainId): Abi =>
  resolveAbi(
    chainId,
    subBoardFacetAbi as AbiSource,
    subBoardFacetRobinhoodAbi as AbiSource,
  );

export const getTradeFacetAbi = (chainId: EvmChainId): Abi =>
  resolveAbi(
    chainId,
    tradeFacetAbi as AbiSource,
    tradeFacetRobinhoodAbi as AbiSource,
  );

export const getCollectFeeForLBPFacetAbi = (chainId: EvmChainId): Abi =>
  resolveAbi(
    chainId,
    collectFeeForLBPFacetAbi as AbiSource,
    collectFeeForLBPFacetRobinhoodAbi as AbiSource,
  );
