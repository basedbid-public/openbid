import {
  boardFeePerLaunchPackageSchema,
  numberStringSchema,
} from 'schema/common';
import { z } from 'zod';

export const createSolanaBoardSdkSchema = z.object({
  title: z.string().min(1, 'Title is required').max(100, 'Title too long'),
  description: z
    .string()
    .min(1, 'Description is required')
    .max(1000, 'Description too long'),
  logo: z.string().min(1, 'Logo file path is required'),
  banner: z.string().min(1, 'Banner file path is required'),
  fees: boardFeePerLaunchPackageSchema,
  flashLaunchFeePer: numberStringSchema,
});

export type CreateSolanaBoardSdk = z.infer<typeof createSolanaBoardSdkSchema>;
