import { logger } from './logger';

/**
 * 错误处理器
 */
export class ErrorHandler {
  /**
   * 处理错误并退出
   */
  static handle(error: Error | string, exitCode = 1): never {
    const errorMessage = error instanceof Error ? error.message : error;
    const errorObj = error instanceof Error ? error : new Error(error);
    
    logger.error(errorMessage, errorObj);
    process.exit(exitCode);
  }

  /**
   * 处理异步错误
   */
  static async handleAsync<T>(
    promise: Promise<T>,
    errorMessage?: string
  ): Promise<T> {
    try {
      return await promise;
    } catch (error) {
      const message = errorMessage || '操作失败';
      ErrorHandler.handle(
        error instanceof Error ? error : new Error(String(error))
      );
    }
  }

  /**
   * 验证条件，失败则抛出错误
   */
  static assert(condition: boolean, message: string): asserts condition {
    if (!condition) {
      throw new Error(message);
    }
  }
}

/**
 * 自定义错误类
 */
export class CLIError extends Error {
  constructor(
    message: string,
    public code: string = 'CLI_ERROR',
    public exitCode: number = 1
  ) {
    super(message);
    this.name = 'CLIError';
  }
}

/**
 * 文件不存在错误
 */
export class FileNotFoundError extends CLIError {
  constructor(filePath: string) {
    super(`文件不存在: ${filePath}`, 'FILE_NOT_FOUND', 1);
    this.name = 'FileNotFoundError';
  }
}

/**
 * 目录不存在错误
 */
export class DirectoryNotFoundError extends CLIError {
  constructor(dirPath: string) {
    super(`目录不存在: ${dirPath}`, 'DIR_NOT_FOUND', 1);
    this.name = 'DirectoryNotFoundError';
  }
}

/**
 * 验证错误
 */
export class ValidationError extends CLIError {
  constructor(message: string) {
    super(message, 'VALIDATION_ERROR', 1);
    this.name = 'ValidationError';
  }
}

/**
 * 配置错误
 */
export class ConfigError extends CLIError {
  constructor(message: string) {
    super(message, 'CONFIG_ERROR', 1);
    this.name = 'ConfigError';
  }
}
