export enum ErrorType {
  BUILD = 'build',
  OPTIMIZE = 'optimize',
  DEPLOY = 'deploy',
}

export interface IError {
  type: ErrorType;
}

export interface IBuildError extends IError {
  type: ErrorType.BUILD;
  stdout: string;
  stderr: string;
}

export interface IOptimizeError extends IError {
  type: ErrorType.OPTIMIZE;
  stdout: string;
  stderr: string;
}

export interface IDeployError extends IError {
  type: ErrorType.DEPLOY;
  stdout: string;
  stderr: string;
}

export type ExecutionError = IBuildError | IOptimizeError | IDeployError;
