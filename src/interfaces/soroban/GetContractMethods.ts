import { z } from 'zod';

import { GetContractMethodsSchema } from '../../stellar/soroban/schemas.js';

export type IGetContractMethodsArgs = z.infer<typeof GetContractMethodsSchema>;
