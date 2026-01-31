/**
 * init 命令测试
 */

import * as fs from 'fs-extra';
import * as path from 'path';
import { handleInit } from '../init';
import { getConfigManager, resetConfigManager } from '../../services/config-manager';

// Mock 依赖
jest.mock('inquirer');
jest.mock('ora');

const inquirer = require('inquirer');
const ora = require('ora');

describe('Init Command', () => {
  let testDir: string;
  let templateDir: string;
  let originalCwd: string;
  let processExitSpy: jest.SpyInstance;
  let consoleLogSpy: jest.SpyInstance;

  beforeEach(async () => {
    // Mock process.exit
    processExitSpy = jest.spyOn(process, 'exit').mockImplementation(((code?: number) => {
      throw new Error(`Process exited with code ${code}`);
    }) as any);

    // Mock console.log
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();

    // 保存原始工作目录
    originalCwd = process.cwd();

    // 创建临时测试目录
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(7);
    testDir = path.join(__dirname, `test-init-${timestamp}-${random}`);
    templateDir = path.join(testDir, 'opencoach');

    await fs.ensureDir(testDir);
    await fs.ensureDir(templateDir);

    // 创建模板文件结构
    await fs.ensureDir(path.join(templateDir, 'templates'));
    await fs.ensureDir(path.join(templateDir, 'workflows'));

    // 创建模板文件
    await fs.writeFile(
      path.join(templateDir, 'templates', 'goal.md'),
      '# Goal Template'
    );
    await fs.writeFile(
      path.join(templateDir, 'templates', 'milestones.md'),
      '# Milestones Template'
    );
    await fs.writeFile(
      path.join(templateDir, 'templates', 'preferences.md'),
      '# Preferences Template'
    );
    await fs.writeFile(
      path.join(templateDir, 'templates', 'review.md'),
      '# Review Template'
    );
    await fs.writeFile(
      path.join(templateDir, 'templates', 'tasks.md'),
      '# Tasks Template'
    );
    await fs.writeFile(
      path.join(templateDir, 'workflows', 'create-goal.md'),
      '# Create Goal Workflow'
    );
    await fs.writeFile(
      path.join(templateDir, 'workflows', 'create-review.md'),
      '# Create Review Workflow'
    );
    await fs.writeFile(
      path.join(templateDir, 'workflows', 'create-task.md'),
      '# Create Task Workflow'
    );
    await fs.writeFile(
      path.join(templateDir, 'Agent.md'),
      '# Agent Guide'
    );

    // 切换到测试目录
    process.chdir(testDir);

    // 重置 ConfigManager 单例，使其使用新的工作目录
    resetConfigManager();

    // 设置模板路径配置
    const configManager = getConfigManager();
    await configManager.set('templatePath', templateDir);

    // Mock ora
    ora.mockReturnValue({
      start: jest.fn().mockReturnThis(),
      succeed: jest.fn().mockReturnThis(),
      fail: jest.fn().mockReturnThis(),
      text: '',
    });

    // Mock inquirer
    inquirer.prompt = jest.fn().mockResolvedValue({ confirm: true });
  });

  afterEach(async () => {
    // 恢复 mocks
    processExitSpy.mockRestore();
    consoleLogSpy.mockRestore();

    // 恢复工作目录
    process.chdir(originalCwd);

    // 清理测试目录
    if (fs.existsSync(testDir)) {
      await fs.remove(testDir);
    }

    // 重置 ConfigManager 单例
    resetConfigManager();

    jest.clearAllMocks();
  });

  describe('基本功能', () => {
    test('应该成功初始化项目', async () => {
      await handleInit({ quiet: true });

      // 验证目录是否创建
      expect(fs.existsSync(path.join(testDir, 'goals'))).toBe(true);
      expect(fs.existsSync(path.join(testDir, 'templates'))).toBe(true);
      expect(fs.existsSync(path.join(testDir, 'workflows'))).toBe(true);
      expect(fs.existsSync(path.join(testDir, '.opencoach'))).toBe(true);

      // 验证模板文件是否复制
      expect(fs.existsSync(path.join(testDir, 'templates', 'goal.md'))).toBe(true);
      expect(fs.existsSync(path.join(testDir, 'templates', 'milestones.md'))).toBe(true);
      expect(fs.existsSync(path.join(testDir, 'workflows', 'create-goal.md'))).toBe(true);
      expect(fs.existsSync(path.join(testDir, '.opencoach', 'Agent.md'))).toBe(true);

      // 验证配置文件是否创建
      expect(fs.existsSync(path.join(testDir, '.opencoach', 'config.json'))).toBe(true);
    });

    test('应该正确复制模板文件内容', async () => {
      await handleInit({ quiet: true });

      const goalContent = await fs.readFile(
        path.join(testDir, 'templates', 'goal.md'),
        'utf-8'
      );
      expect(goalContent).toBe('# Goal Template');

      const agentContent = await fs.readFile(
        path.join(testDir, '.opencoach', 'Agent.md'),
        'utf-8'
      );
      expect(agentContent).toBe('# Agent Guide');
    });

    test('应该初始化配置文件', async () => {
      await handleInit({ quiet: true });

      const configPath = path.join(testDir, '.opencoach', 'config.json');
      expect(fs.existsSync(configPath)).toBe(true);

      const config = await fs.readJson(configPath);
      // 配置文件应该包含这些配置项（可能是默认值或测试中设置的值）
      expect(config).toHaveProperty('archiveDir');
      expect(config).toHaveProperty('dateFormat');
      
      // templatePath 在测试中被设置为 templateDir
      expect(config.templatePath).toBe(templateDir);
    });
  });

  describe('已存在项目处理', () => {
    test('应该检测到已存在的项目并取消初始化', async () => {
      // 先创建 goals 目录
      await fs.ensureDir(path.join(testDir, 'goals'));

      // Mock inquirer 返回取消
      inquirer.prompt = jest.fn().mockResolvedValue({ confirm: false });

      // 应该抛出错误（因为 process.exit(0) 被 mock 了）
      await expect(handleInit({ quiet: true })).rejects.toThrow('Process exited with code 0');
    });

    test('应该在 force 模式下直接覆盖', async () => {
      // 先初始化一次
      await handleInit({ force: true, quiet: true });

      // 修改一个文件
      await fs.writeFile(
        path.join(testDir, 'templates', 'goal.md'),
        'Modified Content'
      );

      // 再次初始化（force 模式）
      await handleInit({ force: true, quiet: true });

      // 验证文件被覆盖
      const content = await fs.readFile(
        path.join(testDir, 'templates', 'goal.md'),
        'utf-8'
      );
      expect(content).toBe('# Goal Template');

      // 验证 inquirer 没有被调用
      expect(inquirer.prompt).not.toHaveBeenCalled();
    });
  });

  describe('错误处理', () => {
    test('应该在模板目录不存在时抛出错误', async () => {
      // 删除模板目录
      await fs.remove(templateDir);

      await expect(handleInit({ quiet: true })).rejects.toThrow();
    });
  });

  describe('静默模式', () => {
    test('应该在静默模式下不显示进度', async () => {
      await handleInit({ quiet: true });

      // 验证 ora 没有被调用
      expect(ora).not.toHaveBeenCalled();
    });

    test('应该在非静默模式下显示进度', async () => {
      await handleInit({ quiet: false });

      // 验证 ora 被调用
      expect(ora).toHaveBeenCalled();
    });
  });
});
