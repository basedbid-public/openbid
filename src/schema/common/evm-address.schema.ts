import z from 'zod';

export const evmAddressSchema = z
  .string()
  .regex(/^0x[a-fA-F0-9]{40}$/, 'Invalid EVM address');
