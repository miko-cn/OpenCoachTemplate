import * as fs from 'fs-extra';
import * as path from 'path';
import { createUpdateCommand } from '../update';

describe('Update Command', () => {
  let tempDir: string;
  let goalsDir: string;

  beforeEach(() => {
    // 创建临时测试目录
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(7);
    tempDir = path.join(__dirname, `test-update-${timestamp}-${random}`);
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

  describe('update command creation', () => {
    it('should create update command', () => {
      const command = createUpdateCommand();
      expect(command).toBeDefined();
      expect(command.name()).toBe('update');
    });

    it('should have correct options', () => {
      const command = createUpdateCommand();
      const options = command.options;
      
      const optionNames = options.map(opt => opt.long);
      expect(optionNames).toContain('--field');
      expect(optionNames).toContain('--value');
      expect(optionNames).toContain('--status');
      expect(optionNames).toContain('--deadline');
      expect(optionNames).toContain('--json');
      expect(optionNames).toContain('--quiet');
    });
  });

  describe('update status', () => {
    it('should update goal status', async () => {
      // 创建测试目标
      const goalPath = path.join(goalsDir, 'test-goal');
      fs.ensureDirSync(goalPath);

      const goalContent = `---
title: Test Goal
status: active
created: "2024-01-01"
---

# Test Goal`;
      fs.writeFileSync(path.join(goalPath, 'goal.md'), goalContent);

      // Mock process.exit
      const mockExit = jest.spyOn(process, 'exit').mockImplementation((code?: any) => {
        throw new Error(`Process exited with code ${code}`);
      });

      // 执行更新命令
      const command = createUpdateCommand();
      try {
        await command.parseAsync(['node', 'test', 'test-goal', '--status', 'completed', '--quiet']);
      } catch (error) {
        // 预期会抛出错误（因为 process.exit）
      }

      mockExit.mockRestore();

      // 验证文件已更新
      const updatedContent = fs.readFileSync(path.join(goalPath, 'goal.md'), 'utf-8');
      expect(updatedContent).toContain('status: completed');
      expect(updatedContent).toContain('updated:');
    });

    it('should reject invalid status', async () => {
      // 创建测试目标
      const goalPath = path.join(goalsDir, 'test-goal-2');
      fs.ensureDirSync(goalPath);

      const goalContent = `---
title: Test Goal
status: active
created: "2024-01-01"
---

# Test Goal`;
      fs.writeFileSync(path.join(goalPath, 'goal.md'), goalContent);

      // 执行更新命令（应该失败）
      const command = createUpdateCommand();
      
      // 捕获 process.exit
      const mockExit = jest.spyOn(process, 'exit').mockImplementation((code?: any) => {
        throw new Error(`Process exited with code ${code}`);
      });

      await expect(
        command.parseAsync(['node', 'test', 'test-goal-2', '--status', 'invalid', '--quiet'])
      ).rejects.toThrow();

      mockExit.mockRestore();
    });
  });

  describe('update deadline', () => {
    it('should update goal deadline', async () => {
      // 创建测试目标
      const goalPath = path.join(goalsDir, 'test-goal-3');
      fs.ensureDirSync(goalPath);

      const goalContent = `---
title: Test Goal
status: active
created: "2024-01-01"
---

# Test Goal`;
      fs.writeFileSync(path.join(goalPath, 'goal.md'), goalContent);

      // Mock process.exit
      const mockExit = jest.spyOn(process, 'exit').mockImplementation((code?: any) => {
        throw new Error(`Process exited with code ${code}`);
      });

      // 执行更新命令
      const command = createUpdateCommand();
      try {
        await command.parseAsync(['node', 'test', 'test-goal-3', '--deadline', '2024-12-31', '--quiet']);
      } catch (error) {
        // 预期会抛出错误
      }

      mockExit.mockRestore();

      // 验证文件已更新
      const updatedContent = fs.readFileSync(path.join(goalPath, 'goal.md'), 'utf-8');
      expect(updatedContent).toContain("deadline: '2024-12-31'");
    });

    it('should reject invalid date format', async () => {
      // 创建测试目标
      const goalPath = path.join(goalsDir, 'test-goal-4');
      fs.ensureDirSync(goalPath);

      const goalContent = `---
title: Test Goal
status: active
created: "2024-01-01"
---

# Test Goal`;
      fs.writeFileSync(path.join(goalPath, 'goal.md'), goalContent);

      // 执行更新命令（应该失败）
      const command = createUpdateCommand();
      
      const mockExit = jest.spyOn(process, 'exit').mockImplementation((code?: any) => {
        throw new Error(`Process exited with code ${code}`);
      });

      await expect(
        command.parseAsync(['node', 'test', 'test-goal-4', '--deadline', '12/31/2024', '--quiet'])
      ).rejects.toThrow();

      mockExit.mockRestore();
    });
  });

  describe('update custom field', () => {
    it('should update custom field', async () => {
      // 创建测试目标
      const goalPath = path.join(goalsDir, 'test-goal-5');
      fs.ensureDirSync(goalPath);

      const goalContent = `---
title: Test Goal
status: active
created: "2024-01-01"
---

# Test Goal`;
      fs.writeFileSync(path.join(goalPath, 'goal.md'), goalContent);

      // Mock process.exit
      const mockExit = jest.spyOn(process, 'exit').mockImplementation((code?: any) => {
        throw new Error(`Process exited with code ${code}`);
      });

      // 执行更新命令
      const command = createUpdateCommand();
      try {
        await command.parseAsync(['node', 'test', 'test-goal-5', '--field', 'priority', '--value', 'high', '--quiet']);
      } catch (error) {
        // 预期会抛出错误
      }

      mockExit.mockRestore();

      // 验证文件已更新
      const updatedContent = fs.readFileSync(path.join(goalPath, 'goal.md'), 'utf-8');
      expect(updatedContent).toContain('priority: high');
    });

    it('should update tags field as array', async () => {
      // 创建测试目标
      const goalPath = path.join(goalsDir, 'test-goal-6');
      fs.ensureDirSync(goalPath);

      const goalContent = `---
title: Test Goal
status: active
created: "2024-01-01"
---

# Test Goal`;
      fs.writeFileSync(path.join(goalPath, 'goal.md'), goalContent);

      // Mock process.exit
      const mockExit = jest.spyOn(process, 'exit').mockImplementation((code?: any) => {
        throw new Error(`Process exited with code ${code}`);
      });

      // 执行更新命令
      const command = createUpdateCommand();
      try {
        await command.parseAsync(['node', 'test', 'test-goal-6', '--field', 'tags', '--value', 'work,important', '--quiet']);
      } catch (error) {
        // 预期会抛出错误
      }

      mockExit.mockRestore();

      // 验证文件已更新
      const updatedContent = fs.readFileSync(path.join(goalPath, 'goal.md'), 'utf-8');
      expect(updatedContent).toContain('tags:');
      expect(updatedContent).toContain('- work');
      expect(updatedContent).toContain('- important');
    });

    it('should reject invalid field name', async () => {
      // 创建测试目标
      const goalPath = path.join(goalsDir, 'test-goal-7');
      fs.ensureDirSync(goalPath);

      const goalContent = `---
title: Test Goal
status: active
created: "2024-01-01"
---

# Test Goal`;
      fs.writeFileSync(path.join(goalPath, 'goal.md'), goalContent);

      // 执行更新命令（应该失败）
      const command = createUpdateCommand();
      
      const mockExit = jest.spyOn(process, 'exit').mockImplementation((code?: any) => {
        throw new Error(`Process exited with code ${code}`);
      });

      await expect(
        command.parseAsync(['node', 'test', 'test-goal-7', '--field', 'invalid_field', '--value', 'test', '--quiet'])
      ).rejects.toThrow();

      mockExit.mockRestore();
    });
  });

  describe('error handling', () => {
    it('should fail if goal does not exist', async () => {
      const command = createUpdateCommand();
      
      const mockExit = jest.spyOn(process, 'exit').mockImplementation((code?: any) => {
        throw new Error(`Process exited with code ${code}`);
      });

      await expect(
        command.parseAsync(['node', 'test', 'non-existent-goal', '--status', 'completed', '--quiet'])
      ).rejects.toThrow();

      mockExit.mockRestore();
    });

    it('should fail if no update parameters provided', async () => {
      // 创建测试目标
      const goalPath = path.join(goalsDir, 'test-goal-8');
      fs.ensureDirSync(goalPath);

      const goalContent = `---
title: Test Goal
status: active
created: "2024-01-01"
---

# Test Goal`;
      fs.writeFileSync(path.join(goalPath, 'goal.md'), goalContent);

      const command = createUpdateCommand();
      
      const mockExit = jest.spyOn(process, 'exit').mockImplementation((code?: any) => {
        throw new Error(`Process exited with code ${code}`);
      });

      await expect(
        command.parseAsync(['node', 'test', 'test-goal-8', '--quiet'])
      ).rejects.toThrow();

      mockExit.mockRestore();
    });
  });
});