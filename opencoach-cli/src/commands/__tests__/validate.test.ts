import * as fs from 'fs-extra';
import * as path from 'path';
import { createValidateCommand } from '../validate';

describe('Validate Command', () => {
  let tempDir: string;
  let goalsDir: string;

  beforeEach(() => {
    // 创建临时测试目录
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(7);
    tempDir = path.join(__dirname, `test-validate-${timestamp}-${random}`);
    fs.ensureDirSync(tempDir);
    goalsDir = path.join(tempDir, 'goals');
    fs.ensureDirSync(goalsDir);

    // 切换到临时目录
    process.chdir(tempDir);
  });

  afterEach(() => {
    // 切换回原目录
    process.chdir(__dirname);

    // 清理临时目录
    try {
      if (fs.existsSync(tempDir)) {
        fs.removeSync(tempDir);
      }
    } catch (error) {
      console.warn(`Failed to clean up ${tempDir}:`, error);
    }
  });

  describe('validate command creation', () => {
    it('should create validate command', () => {
      const command = createValidateCommand();
      expect(command).toBeDefined();
      expect(command.name()).toBe('validate');
    });

    it('should have correct options', () => {
      const command = createValidateCommand();
      const options = command.options;
      
      const optionNames = options.map(opt => opt.long);
      expect(optionNames).toContain('--workflow');
      expect(optionNames).toContain('--json');
      expect(optionNames).toContain('--quiet');
    });
  });

  describe('validate goal', () => {
    it('should validate a valid goal', async () => {
      // 创建有效的目标
      const goalPath = path.join(goalsDir, 'test-goal');
      fs.ensureDirSync(goalPath);

      const goalContent = `---
title: Test Goal
status: active
created: '2024-01-01'
---

# Test Goal

This is a test goal with some description.`;
      fs.writeFileSync(path.join(goalPath, 'goal.md'), goalContent);

      const milestonesContent = `---
title: Milestones
milestones: []
---

# Milestones

- [ ] Milestone 1`;
      fs.writeFileSync(path.join(goalPath, 'milestones.md'), milestonesContent);

      // Mock process.exit
      const mockExit = jest.spyOn(process, 'exit').mockImplementation((code?: any) => {
        return undefined as never;
      });

      // 执行验证命令
      const command = createValidateCommand();
      await command.parseAsync(['node', 'test', 'test-goal', '--quiet']);

      // 验证退出码为 0（成功）
      expect(mockExit).toHaveBeenCalledWith(0);
      
      mockExit.mockRestore();
    });
    it('should fail validation for invalid goal', async () => {
      // 创建无效的目标（缺少必需文件）
      const goalPath = path.join(goalsDir, 'test-goal-2');
      fs.ensureDirSync(goalPath);

      // Mock process.exit
      const mockExit = jest.spyOn(process, 'exit').mockImplementation((code?: any) => {
        return undefined as never;
      });

      // 执行验证命令
      const command = createValidateCommand();
      await command.parseAsync(['node', 'test', 'test-goal-2', '--quiet']);

      // 验证退出码为 1（失败）
      expect(mockExit).toHaveBeenCalledWith(1);
      
      mockExit.mockRestore();
    });

    it('should validate with workflow parameter', async () => {
      // 创建完整的目标
      const goalPath = path.join(goalsDir, 'test-goal-3');
      fs.ensureDirSync(goalPath);

      const goalContent = `---
title: Test Goal
status: active
created: '2024-01-01'
---

# Test Goal

This is a test goal with some description.`;
      fs.writeFileSync(path.join(goalPath, 'goal.md'), goalContent);

      const milestonesContent = `---
title: Milestones
milestones: []
---

# Milestones

- [ ] Milestone 1`;
      fs.writeFileSync(path.join(goalPath, 'milestones.md'), milestonesContent);

      // Mock process.exit
      const mockExit = jest.spyOn(process, 'exit').mockImplementation((code?: any) => {
        return undefined as never;
      });

      // 执行验证命令
      const command = createValidateCommand();
      await command.parseAsync(['node', 'test', 'test-goal-3', '--workflow', 'create-goal', '--quiet']);

      // 验证退出码为 0（成功）
      expect(mockExit).toHaveBeenCalledWith(0);
      
      mockExit.mockRestore();
    });
  });

  describe('error handling', () => {
    it('should fail if goal does not exist', async () => {
      const command = createValidateCommand();
      
      const mockExit = jest.spyOn(process, 'exit').mockImplementation((code?: any) => {
        throw new Error(`Process exited with code ${code}`);
      });

      await expect(
        command.parseAsync(['node', 'test', 'non-existent-goal', '--quiet'])
      ).rejects.toThrow();

      mockExit.mockRestore();
    });
  });
});
