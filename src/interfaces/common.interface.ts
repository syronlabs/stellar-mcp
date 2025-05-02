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
