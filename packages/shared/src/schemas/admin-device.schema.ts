import { z } from 'zod';

export const registerDeviceSchema = z.object({
  expoPushToken: z.string().min(10),
  platform: z.enum(['android', 'ios']).default('android'),
  appVersion: z.string().optional(),
});

export type RegisterDeviceInput = z.infer<typeof registerDeviceSchema>;
