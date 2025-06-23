import { ExecException } from 'child_process';

export type OutputMessage = {
  type: 'text';
  text: string;
};

export enum GetTransactionStatus {
  SUCCESS = 'SUCCESS',
  FAILED = 'FAILED',
  NOT_FOUND = 'NOT_FOUND',
}

export enum Platform {
  WINDOWS = 'win32',
  LINUX = 'linux',
  MACOS = 'darwin',
}

export interface ICommandResult {
  error: ExecException | null;
  stdout: string;
  stderr: string;
}
