import { z } from 'zod';

import { GetContractMethodsSchema } from '../../stellar/soroban/schemas';

export type IGetContractMethodsArgs = z.infer<typeof GetContractMethodsSchema>;
