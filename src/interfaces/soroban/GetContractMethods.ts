import { z } from 'zod';

import { GetContractMethodsSchema } from '../../stellar/soroban/schemas';

export type GetContractMethodsArgs = z.infer<typeof GetContractMethodsSchema>;
