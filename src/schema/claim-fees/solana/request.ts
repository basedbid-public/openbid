import { solanaChainIdSchema } from 'schema/common/sdk-input/solana-chain-id.schema';
import { solanaAddressSchema } from 'schema/common/solana-address.schema';
import z from 'zod';

export const claimFeesSolanaRequestSchema = z.object({
  chainId: solanaChainIdSchema,
  address: solanaAddressSchema,
});

export type ClaimFeesSolanaRequest = z.infer<
  typeof claimFeesSolanaRequestSchema
>;
