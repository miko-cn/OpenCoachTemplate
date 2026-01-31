import {
  ErrorHandler,
  CLIError,
  FileNotFoundError,
  DirectoryNotFoundError,
  ValidationError,
  ConfigError,
} from '../error-handler';

describe('ErrorHandler', () => {
  let processExitSpy: jest.SpyInstance;
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    // 使用类型断言来兼容 Node.js 类型定义
    processExitSpy = jest.spyOn(process, 'exit').mockImplementation(((code?: string | number | null) => {
      throw new Error(`Process.exit called with code ${code}`);
    }) as () => never);
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
  });

  afterEach(() => {
    processExitSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });

  describe('handle方法', () => {
    test('应该处理Error对象', () => {
      const error = new Error('测试错误');
      expect(() => ErrorHandler.handle(error)).toThrow('Process.exit called with code 1');
      expect(consoleErrorSpy).toHaveBeenCalled();
    });

    test('应该处理字符串错误', () => {
      expect(() => ErrorHandler.handle('测试错误')).toThrow('Process.exit called with code 1');
      expect(consoleErrorSpy).toHaveBeenCalled();
    });

    test('应该使用自定义退出码', () => {
      expect(() => ErrorHandler.handle('测试错误', 2)).toThrow('Process.exit called with code 2');
    });
  });

  describe('handleAsync方法', () => {
    test('应该返回成功的Promise结果', async () => {
      const result = await ErrorHandler.handleAsync(Promise.resolve('success'));
      expect(result).toBe('success');
    });

    test('应该处理失败的Promise', async () => {
      const promise = Promise.reject(new Error('异步错误'));
      await expect(ErrorHandler.handleAsync(promise)).rejects.toThrow();
    });

    test('应该使用自定义错误消息', async () => {
      const promise = Promise.reject(new Error('原始错误'));
      await expect(
        ErrorHandler.handleAsync(promise, '自定义错误消息')
      ).rejects.toThrow();
    });
  });

  describe('assert方法', () => {
    test('条件为true时不应抛出错误', () => {
      expect(() => ErrorHandler.assert(true, '错误消息')).not.toThrow();
    });

    test('条件为false时应抛出错误', () => {
      expect(() => ErrorHandler.assert(false, '错误消息')).toThrow('错误消息');
    });
  });
});

describe('自定义错误类', () => {
  describe('CLIError', () => {
    test('应该创建带有消息的错误', () => {
      const error = new CLIError('测试错误');
      expect(error.message).toBe('测试错误');
      expect(error.name).toBe('CLIError');
      expect(error.code).toBe('CLI_ERROR');
      expect(error.exitCode).toBe(1);
    });

    test('应该支持自定义错误码和退出码', () => {
      const error = new CLIError('测试错误', 'CUSTOM_ERROR', 2);
      expect(error.code).toBe('CUSTOM_ERROR');
      expect(error.exitCode).toBe(2);
    });
  });

  describe('FileNotFoundError', () => {
    test('应该创建文件不存在错误', () => {
      const error = new FileNotFoundError('/path/to/file.txt');
      expect(error.message).toContain('/path/to/file.txt');
      expect(error.name).toBe('FileNotFoundError');
      expect(error.code).toBe('FILE_NOT_FOUND');
    });
  });

  describe('DirectoryNotFoundError', () => {
    test('应该创建目录不存在错误', () => {
      const error = new DirectoryNotFoundError('/path/to/dir');
      expect(error.message).toContain('/path/to/dir');
      expect(error.name).toBe('DirectoryNotFoundError');
      expect(error.code).toBe('DIR_NOT_FOUND');
    });
  });

  describe('ValidationError', () => {
    test('应该创建验证错误', () => {
      const error = new ValidationError('验证失败');
      expect(error.message).toBe('验证失败');
      expect(error.name).toBe('ValidationError');
      expect(error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('ConfigError', () => {
    test('应该创建配置错误', () => {
      const error = new ConfigError('配置无效');
      expect(error.message).toBe('配置无效');
      expect(error.name).toBe('ConfigError');
      expect(error.code).toBe('CONFIG_ERROR');
    });
  });

  describe('错误继承', () => {
    test('所有自定义错误应该是Error的实例', () => {
      expect(new CLIError('test')).toBeInstanceOf(Error);
      expect(new FileNotFoundError('test')).toBeInstanceOf(Error);
      expect(new DirectoryNotFoundError('test')).toBeInstanceOf(Error);
      expect(new ValidationError('test')).toBeInstanceOf(Error);
      expect(new ConfigError('test')).toBeInstanceOf(Error);
    });

    test('所有自定义错误应该是CLIError的实例', () => {
      expect(new FileNotFoundError('test')).toBeInstanceOf(CLIError);
      expect(new DirectoryNotFoundError('test')).toBeInstanceOf(CLIError);
      expect(new ValidationError('test')).toBeInstanceOf(CLIError);
      expect(new ConfigError('test')).toBeInstanceOf(CLIError);
    });
  });
});
