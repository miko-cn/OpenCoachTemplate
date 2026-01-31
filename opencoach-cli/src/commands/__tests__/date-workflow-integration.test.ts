/**
 * 工作流集成测试 - 时间工具集成
 * 
 * 测试时间工具在各个工作流中的正确集成和使用：
 * - create-goal 工作流中的时间工具使用
 * - create-task 工作流中的时间工具使用
 * - create-review 工作流中的时间工具使用
 */

import { execSync } from 'child_process';
import * as path from 'path';
import * as fs from 'fs-extra';

const CLI_PATH = path.join(__dirname, '../../../dist/cli.js');

describe('Workflow Integration Tests - Date Tools', () => {
  let processExitSpy: jest.SpyInstance;
  let originalCwd: string;
  let testDir: string;

  beforeAll(() => {
    if (!fs.existsSync(CLI_PATH)) {
      console.warn('CLI未编译，跳过工作流集成测试');
    }
  });

  beforeEach(() => {
    processExitSpy = jest.spyOn(process, 'exit').mockImplementation(((code?: number) => {
      throw new Error(`Process exited with code ${code}`);
    }) as any);

    originalCwd = process.cwd();

    // 创建临时测试目录
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(7);
    testDir = path.join(__dirname, `test-workflow-${timestamp}-${random}`);
    fs.ensureDirSync(testDir);
    fs.ensureDirSync(path.join(testDir, 'goals'));
    process.chdir(testDir);
  });

  afterEach(() => {
    process.chdir(originalCwd);
    processExitSpy.mockRestore();
    if (fs.existsSync(testDir)) {
      fs.removeSync(testDir);
    }
    jest.clearAllMocks();
  });

  function runCommand(args: string[]): { stdout: string; stderr: string; code: number } {
    try {
      const stdout = execSync(`node ${CLI_PATH} ${args.join(' ')}`, {
        encoding: 'utf-8',
        stdio: ['pipe', 'pipe', 'pipe'],
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

  describe('create-goal 工作流集成', () => {
    test('应该能够查询当前日期用于目标设定', () => {
      if (!fs.existsSync(CLI_PATH)) return;

      // 模拟 create-goal 工作流中获取当前日期的场景
      const result = runCommand(['date']);

      expect(result.code).toBe(0);
      // 验证返回的信息包含日期和星期
      expect(result.stdout).toMatch(/\d{4}-\d{2}-\d{2}/);
      expect(result.stdout).toMatch(/星期|Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday/);
    });

    test('应该能够计算模糊时间表述（如"三个月后"）', () => {
      if (!fs.existsSync(CLI_PATH)) return;

      // 模拟用户说"三个月后"
      const result = runCommand(['date', '--offset', '+3m', '--json']);

      expect(result.code).toBe(0);
      const json = JSON.parse(result.stdout);
      expect(json.success).toBe(true);
      expect(json.data.originalDate).toBeDefined();
      expect(json.data.offsetDate).toBeDefined();
      expect(json.data.offsetExpression).toBe('+3m');
    });

    test('应该能够计算年底日期', () => {
      if (!fs.existsSync(CLI_PATH)) return;

      // 模拟用户说"年底"或"今年底"
      const currentYear = new Date().getFullYear();
      const result = runCommand(['date', '--date', `12-31`, '--json']);

      expect(result.code).toBe(0);
      const json = JSON.parse(result.stdout);
      expect(json.success).toBe(true);
      expect(json.data.date).toContain(String(currentYear));
      expect(json.data.date).toContain('12-31');
    });

    test('应该能够计算目标持续时间', () => {
      if (!fs.existsSync(CLI_PATH)) return;

      // 模拟用户设定开始日期和截止日期
      const result = runCommand([
        'date',
        '--date', '2024-01-01',
        '--diff', '2024-12-31',
        '--json'
      ]);

      expect(result.code).toBe(0);
      const json = JSON.parse(result.stdout);
      expect(json.success).toBe(true);
      expect(json.data.diff.days).toBe(365);
      expect(json.data.diff.weeks).toBe(52);
      expect(json.data.diff.workdays).toBeGreaterThan(0);
    });

    test('应该能够以短格式展示日期建议', () => {
      if (!fs.existsSync(CLI_PATH)) return;

      // 模拟展示建议日期
      const result = runCommand(['date', '--format', 'short', '--json']);

      expect(result.code).toBe(0);
      const json = JSON.parse(result.stdout);
      expect(json.success).toBe(true);
      expect(json.data).toBeDefined();
    });

    test('应该能够以长格式展示日期建议', () => {
      if (!fs.existsSync(CLI_PATH)) return;

      const result = runCommand(['date', '--format', 'long', '--json']);

      expect(result.code).toBe(0);
      const json = JSON.parse(result.stdout);
      expect(json.success).toBe(true);
      expect(json.data).toBeDefined();
    });
  });

  describe('create-task 工作流集成', () => {
    test('应该能够计算一周后的日期', () => {
      if (!fs.existsSync(CLI_PATH)) return;

      // 模拟用户说"一周"
      const result = runCommand(['date', '--offset', '+1w']);

      expect(result.code).toBe(0);
      expect(result.stdout).toContain('偏移: +1w');
    });

    test('应该能够计算两周后的日期', () => {
      if (!fs.existsSync(CLI_PATH)) return;

      // 模拟用户说"两周"
      const result = runCommand(['date', '--offset', '+2w']);

      expect(result.code).toBe(0);
      expect(result.stdout).toContain('偏移: +2w');
    });

    test('应该能够计算一个月后的日期', () => {
      if (!fs.existsSync(CLI_PATH)) return;

      // 模拟用户说"一个月"
      const result = runCommand(['date', '--offset', '+1m']);

      expect(result.code).toBe(0);
      expect(result.stdout).toContain('偏移: +1m');
    });

    test('应该能够计算下次评估时间（每3天）', () => {
      if (!fs.existsSync(CLI_PATH)) return;

      const result = runCommand(['date', '--offset', '+3d']);

      expect(result.code).toBe(0);
      expect(result.stdout).toContain('偏移: +3d');
    });

    test('应该能够计算下次评估时间（每周）', () => {
      if (!fs.existsSync(CLI_PATH)) return;

      const result = runCommand(['date', '--offset', '+1w']);

      expect(result.code).toBe(0);
      expect(result.stdout).toContain('偏移: +1w');
    });

    test('应该能够计算下次评估时间（每2周）', () => {
      if (!fs.existsSync(CLI_PATH)) return;

      const result = runCommand(['date', '--offset', '+2w']);

      expect(result.code).toBe(0);
      expect(result.stdout).toContain('偏移: +2w');
    });

    test('应该能够从指定日期开始计算周期', () => {
      if (!fs.existsSync(CLI_PATH)) return;

      const result = runCommand([
        'date',
        '--from', '2024-01-01',
        '--offset', '+1w'
      ]);

      expect(result.code).toBe(0);
      expect(result.stdout).toContain('2024-01-01');
      expect(result.stdout).toContain('偏移: +1w');
    });

    test('应该能够计算任务进度（已过天数）', () => {
      if (!fs.existsSync(CLI_PATH)) return;

      // 模拟计算从周期开始到现在的时间
      const result = runCommand([
        'date',
        '--date', '2024-01-01',
        '--diff', '2024-01-15'
      ]);

      expect(result.code).toBe(0);
      expect(result.stdout).toContain('14 天'); // 或类似的差异
    });

    test('应该能够计算任务进度（剩余天数）', () => {
      if (!fs.existsSync(CLI_PATH)) return;

      // 模拟计算从现在到周期结束的时间
      const result = runCommand([
        'date',
        '--date', '2024-01-15',
        '--diff', '2024-01-31'
      ]);

      expect(result.code).toBe(0);
      expect(result.stdout).toContain('16 天'); // 或类似的差异
    });

    test('应该能够计算周期天数和工作日', () => {
      if (!fs.existsSync(CLI_PATH)) return;

      const result = runCommand([
        'date',
        '--date', '2024-01-01',
        '--diff', '2024-01-31',
        '--workdays'
      ]);

      expect(result.code).toBe(0);
      expect(result.stdout).toContain('工作日统计');
      expect(result.stdout).toContain('总天数');
      expect(result.stdout).toContain('工作日');
    });
  });

  describe('create-review 工作流集成', () => {
    test('应该能够检查是否到评估时间', () => {
      if (!fs.existsSync(CLI_PATH)) return;

      // 模拟计算距离下次评估时间的天数
      const nextReviewDate = '2024-12-31';
      const result = runCommand(['date', '--diff', nextReviewDate]);

      expect(result.code).toBe(0);
      // 由于2024-12-31在当前日期之前，应该输出'之前'而不是'距离'
      expect(result.stdout).toContain('之前');
    });

    test('应该能够计算周期天数和工作日', () => {
      if (!fs.existsSync(CLI_PATH)) return;

      // 模拟计算周期的统计信息
      const result = runCommand([
        'date',
        '--date', '2024-01-01',
        '--diff', '2024-01-31',
        '--workdays'
      ]);

      expect(result.code).toBe(0);
      expect(result.stdout).toContain('工作日统计');
      expect(result.stdout).toContain('总天数');
      expect(result.stdout).toContain('工作日');
      expect(result.stdout).toContain('周末');
    });

    test('应该能够计算下一个周一的日期', () => {
      if (!fs.existsSync(CLI_PATH)) return;

      // 模拟用户说"下个周期从下周一开始"
      const result = runCommand(['date', '--offset', '+1w']);

      expect(result.code).toBe(0);
      expect(result.stdout).toContain('偏移: +1w');
    });

    test('应该能够计算下周开始的日期', () => {
      if (!fs.existsSync(CLI_PATH)) return;

      // 模拟用户说"下周"
      const result = runCommand(['date', '--offset', '+1w']);

      expect(result.code).toBe(0);
      expect(result.stdout).toContain('偏移: +1w');
    });

    test('应该能够获取当前日期用于周期统计', () => {
      if (!fs.existsSync(CLI_PATH)) return;

      const result = runCommand(['date', '--json']);

      expect(result.code).toBe(0);
      const json = JSON.parse(result.stdout);
      expect(json.success).toBe(true);
      expect(json.data.date).toBeDefined();
    });

    test('应该能够从周期开始计算到当前的时间', () => {
      if (!fs.existsSync(CLI_PATH)) return;

      // 模拟：周期开始日期 -> 当前日期
      const result = runCommand([
        'date',
        '--date', '2024-01-01',
        '--diff', '2024-01-15'
      ]);

      expect(result.code).toBe(0);
      expect(result.stdout).toContain('14 天'); // 或类似
    });

    test('应该能够从当前日期计算到周期结束的时间', () => {
      if (!fs.existsSync(CLI_PATH)) return;

      // 模拟：当前日期 -> 周期结束日期
      const result = runCommand([
        'date',
        '--date', '2024-01-15',
        '--diff', '2024-01-31'
      ]);

      expect(result.code).toBe(0);
      expect(result.stdout).toContain('16 天'); // 或类似
    });
  });

  describe('跨工作流的时间工具使用场景', () => {
    test('应该能够统一使用JSON格式供Agent解析', () => {
      if (!fs.existsSync(CLI_PATH)) return;

      const commands = [
        ['date'],
        ['date', '--offset', '+1w'],
        ['date', '--diff', '2024-12-31'],
      ];

      for (const cmd of commands) {
        const result = runCommand([...cmd, '--json']);
        expect(result.code).toBe(0);
        const json = JSON.parse(result.stdout);
        expect(json.success).toBe(true);
        expect(json.mode).toBeDefined();
      }
    });

    test('应该能够正确处理所有工作流中的日期格式', () => {
      if (!fs.existsSync(CLI_PATH)) return;

      const dateFormats = [
        '2024-01-15',    // YYYY-MM-DD
        '2024/01/15',    // YYYY/MM/DD
        '01-15',         // MM-DD
      ];

      for (const dateFormat of dateFormats) {
        const result = runCommand(['date', '--date', dateFormat]);
        expect(result.code).toBe(0);
      }
    });

    test('应该能够正确处理所有工作流中的偏移表达式', () => {
      if (!fs.existsSync(CLI_PATH)) return;

      const offsets = [
        '+7d', '-7d',    // 天数偏移
        '+1w', '-1w',    // 周偏移
        '+1m', '-1m',    // 月偏移
        '+1y', '-1y',    // 年偏移
        '+1w,+2d',       // 多个偏移
      ];

      for (const offset of offsets) {
        const result = runCommand(['date', '--offset', offset]);
        expect(result.code).toBe(0);
      }
    });

    test('应该能够正确处理语言环境', () => {
      if (!fs.existsSync(CLI_PATH)) return;

      const resultZh = runCommand(['date', '--locale', 'zh']);
      expect(resultZh.code).toBe(0);
      expect(resultZh.stdout).toMatch(/星期|日|一|二|三|四|五|六/);

      const resultEn = runCommand(['date', '--locale', 'en']);
      expect(resultEn.code).toBe(0);
      expect(resultEn.stdout).toMatch(/Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday/);
    });
  });

  describe('错误处理和降级场景', () => {
    test('应该能够在用户输入无效日期时提供清晰错误信息', () => {
      if (!fs.existsSync(CLI_PATH)) return;

      const result = runCommand(['date', '--date', 'invalid-date']);

      expect(result.code).toBe(1);
      expect(result.stdout).toContain('无法解析日期');
      expect(result.stdout).toContain('支持的格式');
    });

    test('应该能够在用户输入无效偏移时提供清晰错误信息', () => {
      if (!fs.existsSync(CLI_PATH)) return;

      const result = runCommand(['date', '--offset', 'invalid']);

      expect(result.code).toBe(2);
      expect(result.stdout).toContain('无效的偏移表达式');
      expect(result.stdout).toContain('正确的格式');
    });

    test('应该能够处理闰年等特殊日期', () => {
      if (!fs.existsSync(CLI_PATH)) return;

      const result = runCommand(['date', '--date', '2024-02-29']);

      expect(result.code).toBe(0);
      expect(result.stdout).toContain('2024-02-29');
    });

    test('应该能够处理跨月跨年的日期计算', () => {
      if (!fs.existsSync(CLI_PATH)) return;

      const result1 = runCommand(['date', '--date', '2024-01-31', '--offset', '+1d']);
      expect(result1.code).toBe(0);
      expect(result1.stdout).toContain('2024-02-01');

      const result2 = runCommand(['date', '--date', '2024-12-31', '--offset', '+1d']);
      expect(result2.code).toBe(0);
      expect(result2.stdout).toContain('2025-01-01');
    });
  });
});
