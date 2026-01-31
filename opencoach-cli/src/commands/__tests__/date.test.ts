/**
 * date 命令测试
 * 
 * 测试 date 命令的所有功能：
 * - 基础查询模式
 * - 时间偏移模式
 * - 日期比较模式
 * - 格式化输出
 * - 错误处理
 * - 参数组合验证
 */

import { execSync } from 'child_process';
import * as path from 'path';
import * as fs from 'fs-extra';

// 指向编译后的 CLI
const CLI_PATH = path.join(__dirname, '../../../dist/cli.js');

describe('Date Command Integration Tests', () => {
  let processExitSpy: jest.SpyInstance;
  let originalCwd: string;

  beforeAll(() => {
    // 确保CLI已编译
    if (!fs.existsSync(CLI_PATH)) {
      console.warn('CLI未编译，跳过集成测试');
    }
  });

  beforeEach(() => {
    // Mock process.exit
    processExitSpy = jest.spyOn(process, 'exit').mockImplementation(((code?: number) => {
      throw new Error(`Process exited with code ${code}`);
    }) as any);

    // 保存原始工作目录
    originalCwd = process.cwd();
  });

  afterEach(() => {
    // 恢复工作目录
    process.chdir(originalCwd);

    // 恢复 mocks
    processExitSpy.mockRestore();
    jest.clearAllMocks();
  });

  function runCommand(args: string[]): { stdout: string; stderr: string; code: number } {
    try {
      // 对参数进行转义，处理包含空格的参数值
      const escapedArgs = args.map(arg => {
        // 如果参数包含空格，用双引号括起来
        if (arg.includes(' ')) {
          return `"${arg}"`;
        }
        return arg;
      });
      
      const stdout = execSync(`node ${CLI_PATH} ${escapedArgs.join(' ')}`, {
        encoding: 'utf-8',
        stdio: ['pipe', 'pipe', 'pipe'],
        // 设置环境变量以正确处理中文
        env: { ...process.env, NODE_OPTIONS: '--max-old-space-size=4096' },
      });
      return { stdout, stderr: '', code: 0 };
    } catch (error: any) {
      return {
        stdout: error.stdout || '',
        stderr: error.stderr || '',
        code: error.status || 1,
      };
    }
  }

  describe('基础查询模式', () => {
    test('应该显示当前日期', () => {
      if (!fs.existsSync(CLI_PATH)) return;

      const result = runCommand(['date']);

      expect(result.code).toBe(0);
      // 输出应该包含日期和星期几
      expect(result.stdout).toMatch(/\d{4}-\d{2}-\d{2}/);
      expect(result.stdout).toMatch(/星期|Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday/);
    });

    test('应该支持指定日期', () => {
      if (!fs.existsSync(CLI_PATH)) return;

      const result = runCommand(['date', '--date', '2024-01-15']);

      expect(result.code).toBe(0);
      expect(result.stdout).toContain('2024-01-15');
      expect(result.stdout).toContain('星期一');
    });

    test('应该支持简写日期格式 MM-DD', () => {
      if (!fs.existsSync(CLI_PATH)) return;

      const result = runCommand(['date', '--date', '01-15']);

      expect(result.code).toBe(0);
      // 应该包含当前的年份
      const currentYear = new Date().getFullYear();
      expect(result.stdout).toContain(String(currentYear));
      expect(result.stdout).toContain('01-15');
    });

    test('应该支持短格式输出', () => {
      if (!fs.existsSync(CLI_PATH)) return;

      const result = runCommand(['date', '--format', 'short']);

      expect(result.code).toBe(0);
      expect(result.stdout).toMatch(/\d{2}月\d{2}日/);
    });

    test('应该支持长格式输出', () => {
      if (!fs.existsSync(CLI_PATH)) return;

      const result = runCommand(['date', '--format', 'long']);

      expect(result.code).toBe(0);
      expect(result.stdout).toMatch(/\d{4}年\d{2}月\d{2}日/);
    });

    test('应该支持英文输出', () => {
      if (!fs.existsSync(CLI_PATH)) return;

      const result = runCommand(['date', '--locale', 'en']);

      expect(result.code).toBe(0);
      expect(result.stdout).toMatch(/January|February|March|April|May|June|July|August|September|October|November|December/);
      expect(result.stdout).toMatch(/Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday/);
    });

    test('应该支持JSON格式输出', () => {
      if (!fs.existsSync(CLI_PATH)) return;

      const result = runCommand(['date', '--json']);

      expect(result.code).toBe(0);
      const json = JSON.parse(result.stdout);
      expect(json).toHaveProperty('success', true);
      expect(json).toHaveProperty('mode', 'basic');
      expect(json.data).toHaveProperty('date');
      expect(json.data).toHaveProperty('weekday');
      expect(json.data).toHaveProperty('weekdayIndex');
      expect(json.data).toHaveProperty('year');
      expect(json.data).toHaveProperty('month');
      expect(json.data).toHaveProperty('day');
      expect(json.data).toHaveProperty('timestamp');
    });
  });

  describe('时间偏移模式', () => {
    test('应该支持天数偏移 +7d', () => {
      if (!fs.existsSync(CLI_PATH)) return;

      const result = runCommand(['date', '--offset', '+7d']);

      expect(result.code).toBe(0);
      expect(result.stdout).toContain('偏移: +7d');
    });

    test('应该支持负的天数偏移 -7d', () => {
      if (!fs.existsSync(CLI_PATH)) return;

      const result = runCommand(['date', '--offset', '-7d']);

      expect(result.code).toBe(0);
      expect(result.stdout).toContain('偏移: -7d');
    });

    test('应该支持周偏移 +1w', () => {
      if (!fs.existsSync(CLI_PATH)) return;

      const result = runCommand(['date', '--offset', '+1w']);

      expect(result.code).toBe(0);
      expect(result.stdout).toContain('偏移: +1w');
    });

    test('应该支持月偏移 +1m', () => {
      if (!fs.existsSync(CLI_PATH)) return;

      const result = runCommand(['date', '--offset', '+1m']);

      expect(result.code).toBe(0);
      expect(result.stdout).toContain('偏移: +1m');
    });

    test('应该支持年偏移 +1y', () => {
      if (!fs.existsSync(CLI_PATH)) return;

      const result = runCommand(['date', '--offset', '+1y']);

      expect(result.code).toBe(0);
      expect(result.stdout).toContain('偏移: +1y');
    });

    test('应该支持多个偏移表达式', () => {
      if (!fs.existsSync(CLI_PATH)) return;

      const result = runCommand(['date', '--offset', '+1w,+2d']);

      expect(result.code).toBe(0);
      expect(result.stdout).toContain('偏移: +1w + 2d');
    });

    test('应该支持从指定日期开始计算偏移', () => {
      if (!fs.existsSync(CLI_PATH)) return;

      const result = runCommand(['date', '--offset', '+1w', '--from', '2024-01-01']);

      expect(result.code).toBe(0);
      expect(result.stdout).toContain('2024-01-01');
      expect(result.stdout).toContain('偏移: +1w');
    });

    test('应该支持JSON格式的偏移输出', () => {
      if (!fs.existsSync(CLI_PATH)) return;

      const result = runCommand(['date', '--offset', '+1w', '--json']);

      expect(result.code).toBe(0);
      const json = JSON.parse(result.stdout);
      expect(json).toHaveProperty('success', true);
      expect(json).toHaveProperty('mode', 'offset');
      expect(json.data).toHaveProperty('originalDate');
      expect(json.data).toHaveProperty('offsetDate');
      expect(json.data).toHaveProperty('offsetExpression');
    });

    test('应该正确计算偏移后的日期', () => {
      if (!fs.existsSync(CLI_PATH)) return;

      const result = runCommand(['date', '--date', '2024-01-15', '--offset', '+7d', '--json']);

      expect(result.code).toBe(0);
      const json = JSON.parse(result.stdout);
      expect(json.data.originalDate.date).toBe('2024-01-15');
      expect(json.data.offsetDate.date).toBe('2024-01-22');
    });
  });

  describe('日期比较模式', () => {
    test('应该支持日期差异计算', () => {
      if (!fs.existsSync(CLI_PATH)) return;

      const result = runCommand(['date', '--diff', '2024-12-31']);

      expect(result.code).toBe(0);
      expect(result.stdout).toContain('日期1:');
      expect(result.stdout).toContain('日期2:');
      // 由于2024-12-31在当前日期之前，应该输出'之前'而不是'距离'
      expect(result.stdout).toContain('之前');
    });

    test('应该支持指定起始日期进行比较', () => {
      if (!fs.existsSync(CLI_PATH)) return;

      const result = runCommand(['date', '--date', '2024-01-01', '--diff', '2024-12-31']);

      expect(result.code).toBe(0);
      expect(result.stdout).toContain('2024-01-01');
      expect(result.stdout).toContain('2024-12-31');
      expect(result.stdout).toContain('365 天');
    });

    test('应该支持工作日计算', () => {
      if (!fs.existsSync(CLI_PATH)) return;

      const result = runCommand(['date', '--date', '2024-01-01', '--diff', '2024-12-31', '--workdays']);

      expect(result.code).toBe(0);
      expect(result.stdout).toContain('工作日统计');
      expect(result.stdout).toContain('总天数');
      expect(result.stdout).toContain('工作日');
      expect(result.stdout).toContain('周末');
    });

    test('应该支持JSON格式的差异输出', () => {
      if (!fs.existsSync(CLI_PATH)) return;

      const result = runCommand(['date', '--date', '2024-01-01', '--diff', '2024-12-31', '--json']);

      expect(result.code).toBe(0);
      const json = JSON.parse(result.stdout);
      expect(json).toHaveProperty('success', true);
      expect(json).toHaveProperty('mode', 'diff');
      expect(json.data).toHaveProperty('date1');
      expect(json.data).toHaveProperty('date2');
      expect(json.data).toHaveProperty('diff');
      expect(json.data.diff).toHaveProperty('days');
      expect(json.data.diff).toHaveProperty('weeks');
      expect(json.data.diff).toHaveProperty('workdays');
      expect(json.data.diff).toHaveProperty('calendarDays');
    });

    test('应该正确计算工作日统计', () => {
      if (!fs.existsSync(CLI_PATH)) return;

      const result = runCommand(['date', '--date', '2024-01-01', '--diff', '2024-12-31', '--workdays', '--json']);

      expect(result.code).toBe(0);
      const json = JSON.parse(result.stdout);
      expect(json.data.workdays).toHaveProperty('totalDays');
      expect(json.data.workdays).toHaveProperty('workdays');
      expect(json.data.workdays).toHaveProperty('weekends');
      expect(json.data.workdays.totalDays).toBe(366); // 2024是闰年
    });
  });

  describe('错误处理', () => {
    test('应该拒绝无效的日期格式', () => {
      if (!fs.existsSync(CLI_PATH)) return;

      const result = runCommand(['date', '--date', 'invalid-date']);

      expect(result.code).toBe(1); // ExitCode.DATE_PARSE_ERROR
      expect(result.stdout).toContain('无法解析日期');
    });

    test('应该拒绝无效的偏移表达式', () => {
      if (!fs.existsSync(CLI_PATH)) return;

      const result = runCommand(['date', '--offset', 'invalid']);

      expect(result.code).toBe(2); // ExitCode.OFFSET_EXPRESSION_ERROR
      expect(result.stdout).toContain('无效的偏移表达式');
    });

    test('应该拒绝错误的偏移单位', () => {
      if (!fs.existsSync(CLI_PATH)) return;

      const result = runCommand(['date', '--offset', '+7x']);

      expect(result.code).toBe(2); // ExitCode.OFFSET_EXPRESSION_ERROR
      expect(result.stdout).toContain('无效的偏移表达式');
    });

    test('应该拒绝同时使用 --diff 和 --offset', () => {
      if (!fs.existsSync(CLI_PATH)) return;

      const result = runCommand(['date', '--diff', '2024-12-31', '--offset', '+1w']);

      expect(result.code).toBe(3); // ExitCode.PARAMETER_COMBINATION_ERROR
      expect(result.stdout).toContain('参数错误');
      expect(result.stdout).toContain('--diff 和 --offset 不能同时使用');
    });

    test('应该拒绝单独使用 --workdays', () => {
      if (!fs.existsSync(CLI_PATH)) return;

      const result = runCommand(['date', '--workdays']);

      expect(result.code).toBe(3); // ExitCode.PARAMETER_COMBINATION_ERROR
      expect(result.stdout).toContain('参数错误');
      expect(result.stdout).toContain('--workdays 必须和 --diff 一起使用');
    });

    test('应该拒绝单独使用 --from', () => {
      if (!fs.existsSync(CLI_PATH)) return;

      const result = runCommand(['date', '--from', '2024-01-01']);

      expect(result.code).toBe(3); // ExitCode.PARAMETER_COMBINATION_ERROR
      expect(result.stdout).toContain('参数错误');
      expect(result.stdout).toContain('--from 必须和 --offset 一起使用');
    });
  });

  describe('边界情况', () => {
    test('应该处理闰年日期', () => {
      if (!fs.existsSync(CLI_PATH)) return;

      const result = runCommand(['date', '--date', '2024-02-29']);

      expect(result.code).toBe(0);
      expect(result.stdout).toContain('2024-02-29');
    });

    test('应该处理跨月偏移', () => {
      if (!fs.existsSync(CLI_PATH)) return;

      const result = runCommand(['date', '--date', '2024-01-31', '--offset', '+1d']);

      expect(result.code).toBe(0);
      expect(result.stdout).toContain('2024-02-01');
    });

    test('应该处理跨年偏移', () => {
      if (!fs.existsSync(CLI_PATH)) return;

      const result = runCommand(['date', '--date', '2024-12-31', '--offset', '+1d']);

      expect(result.code).toBe(0);
      expect(result.stdout).toContain('2025-01-01');
    });

    test('应该处理负日期差异', () => {
      if (!fs.existsSync(CLI_PATH)) return;

      const result = runCommand(['date', '--date', '2024-12-31', '--diff', '2024-01-01']);

      expect(result.code).toBe(0);
      expect(result.stdout).toContain('之前');
    });

    test('应该处理相同日期', () => {
      if (!fs.existsSync(CLI_PATH)) return;

      const result = runCommand(['date', '--date', '2024-01-01', '--diff', '2024-01-01']);

      expect(result.code).toBe(0);
      expect(result.stdout).toContain('两个日期相同');
    });
  });

  describe('自定义格式化', () => {
    test('应该支持自定义格式字符串', () => {
      if (!fs.existsSync(CLI_PATH)) return;

      const result = runCommand(['date', '--format', 'YYYY-MM-DD dddd']);

      expect(result.code).toBe(0);
      expect(result.stdout).toMatch(/\d{4}-\d{2}-\d{2}/);
      expect(result.stdout).toMatch(/星期|Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday/);
    });

    test('应该支持ISO格式', () => {
      if (!fs.existsSync(CLI_PATH)) return;

      const result = runCommand(['date', '--format', 'iso']);

      expect(result.code).toBe(0);
      expect(result.stdout).toMatch(/\d{4}-\d{2}-\d{2}/);
    });
  });
});
