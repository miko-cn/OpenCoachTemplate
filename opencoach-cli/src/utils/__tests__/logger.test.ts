import { Logger, LogLevel } from '../logger';

describe('Logger', () => {
  let logger: Logger;
  let consoleLogSpy: jest.SpyInstance;
  let consoleErrorSpy: jest.SpyInstance;
  let consoleWarnSpy: jest.SpyInstance;

  beforeEach(() => {
    logger = new Logger();
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
    consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
    consoleErrorSpy.mockRestore();
    consoleWarnSpy.mockRestore();
  });

  describe('基本日志输出', () => {
    test('应该输出info信息', () => {
      logger.info('测试信息');
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('测试信息'));
    });

    test('应该输出success信息', () => {
      logger.success('成功信息');
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('成功信息'));
    });

    test('应该输出warn信息', () => {
      logger.warn('警告信息');
      expect(consoleWarnSpy).toHaveBeenCalledWith(expect.stringContaining('警告信息'));
    });

    test('应该输出error信息', () => {
      logger.error('错误信息');
      expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('错误信息'));
    });
  });

  describe('静默模式', () => {
    test('静默模式下不应输出info信息', () => {
      logger.setQuiet(true);
      logger.info('测试信息');
      expect(consoleLogSpy).not.toHaveBeenCalled();
    });

    test('静默模式下仍应输出error信息', () => {
      logger.setQuiet(true);
      logger.error('错误信息');
      expect(consoleErrorSpy).toHaveBeenCalled();
    });
  });

  describe('JSON输出模式', () => {
    test('JSON模式下应输出JSON格式的错误', () => {
      logger.setJsonOutput(true);
      logger.error('错误信息', new Error('详细错误'));
      
      expect(consoleErrorSpy).toHaveBeenCalled();
      const output = consoleErrorSpy.mock.calls[0][0];
      expect(() => JSON.parse(output)).not.toThrow();
      
      const parsed = JSON.parse(output);
      expect(parsed.success).toBe(false);
      expect(parsed.error).toBe('错误信息');
    });

    test('JSON模式下应输出JSON数据', () => {
      logger.setJsonOutput(true);
      const testData = { name: 'test', value: 123 };
      logger.json(testData);
      
      expect(consoleLogSpy).toHaveBeenCalled();
      const output = consoleLogSpy.mock.calls[0][0];
      expect(JSON.parse(output)).toEqual(testData);
    });

    test('JSON模式下不应输出普通info信息', () => {
      logger.setJsonOutput(true);
      logger.info('测试信息');
      expect(consoleLogSpy).not.toHaveBeenCalled();
    });
  });

  describe('调试模式', () => {
    test('没有DEBUG环境变量时不应输出debug信息', () => {
      delete process.env.DEBUG;
      logger.debug('调试信息');
      expect(consoleLogSpy).not.toHaveBeenCalled();
    });

    test('有DEBUG环境变量时应输出debug信息', () => {
      process.env.DEBUG = '1';
      logger.debug('调试信息');
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('调试信息'));
      delete process.env.DEBUG;
    });
  });

  describe('表格输出', () => {
    test('应该输出表格数据', () => {
      const tableData = [
        ['Name', 'Status', 'Date'],
        ['Goal1', 'Active', '2024-01-01'],
        ['Goal2', 'Completed', '2024-01-02'],
      ];
      
      logger.table(tableData);
      expect(consoleLogSpy).toHaveBeenCalledTimes(3);
    });

    test('静默模式下不应输出表格', () => {
      logger.setQuiet(true);
      const tableData = [['Name', 'Status']];
      logger.table(tableData);
      expect(consoleLogSpy).not.toHaveBeenCalled();
    });
  });
});
