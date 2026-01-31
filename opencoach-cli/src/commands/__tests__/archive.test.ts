import * as fs from 'fs-extra';
import * as path from 'path';
import { createArchiveCommand } from '../archive';

describe('Archive Command', () => {
  let tempDir: string;
  let goalsDir: string;

  beforeEach(() => {
    // 创建临时测试目录
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(7);
    tempDir = path.join(__dirname, `test-archive-${timestamp}-${random}`);
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

  describe('archive command creation', () => {
    it('should create archive command', () => {
      const command = createArchiveCommand();
      expect(command).toBeDefined();
      expect(command.name()).toBe('archive');
    });

    it('should have correct options', () => {
      const command = createArchiveCommand();
      const options = command.options;
      
      const optionNames = options.map(opt => opt.long);
      expect(optionNames).toContain('--review');
      expect(optionNames).toContain('--json');
      expect(optionNames).toContain('--quiet');
    });
  });

  describe('archive tasks', () => {
    it('should archive tasks file', async () => {
      // 创建测试目标
      const goalPath = path.join(goalsDir, 'test-goal');
      fs.ensureDirSync(goalPath);

      const tasksContent = `---
period: 2024-01-01 to 2024-01-31
---

# Tasks

- [ ] Task 1
- [ ] Task 2`;
      fs.writeFileSync(path.join(goalPath, 'tasks.md'), tasksContent);

      // Mock process.exit
      const mockExit = jest.spyOn(process, 'exit').mockImplementation((code?: any) => {
        throw new Error(`Process exited with code ${code}`);
      });

      // 执行归档命令
      const command = createArchiveCommand();
      try {
        await command.parseAsync(['node', 'test', 'test-goal', '--quiet']);
      } catch (error) {
        // 预期会抛出错误
      }

      mockExit.mockRestore();

      // 验证归档文件已创建
      const archivesDir = path.join(goalPath, 'archives');
      expect(fs.existsSync(archivesDir)).toBe(true);

      const files = fs.readdirSync(archivesDir);
      expect(files.length).toBeGreaterThan(0);
      expect(files[0]).toMatch(/^tasks-\d{4}-\d{2}-\d{2}\.md$/);

      // 验证原任务文件已删除
      expect(fs.existsSync(path.join(goalPath, 'tasks.md'))).toBe(false);
    });

    it('should create unique filename if archive already exists', async () => {
      // 创建测试目标
      const goalPath = path.join(goalsDir, 'test-goal-2');
      fs.ensureDirSync(goalPath);
      fs.ensureDirSync(path.join(goalPath, 'archives'));

      const tasksContent = `---
period: 2024-01-01 to 2024-01-31
---

# Tasks

- [ ] Task 1`;
      fs.writeFileSync(path.join(goalPath, 'tasks.md'), tasksContent);

      // 创建已存在的归档文件
      const dateStr = new Date().toISOString().split('T')[0];
      fs.writeFileSync(
        path.join(goalPath, 'archives', `tasks-${dateStr}.md`),
        'Existing archive'
      );

      // Mock process.exit
      const mockExit = jest.spyOn(process, 'exit').mockImplementation((code?: any) => {
        throw new Error(`Process exited with code ${code}`);
      });

      // 执行归档命令
      const command = createArchiveCommand();
      try {
        await command.parseAsync(['node', 'test', 'test-goal-2', '--quiet']);
      } catch (error) {
        // 预期会抛出错误
      }

      mockExit.mockRestore();

      // 验证创建了唯一文件名
      const files = fs.readdirSync(path.join(goalPath, 'archives'));
      expect(files.length).toBe(2);
      expect(files.some(f => f.startsWith(`tasks-${dateStr}-`))).toBe(true);
    });

    it('should create review file when --review is specified', async () => {
      // 创建测试目标
      const goalPath = path.join(goalsDir, 'test-goal-3');
      fs.ensureDirSync(goalPath);

      const tasksContent = `---
period: 2024-01-01 to 2024-01-31
---

# Tasks

- [x] Task 1
- [x] Task 2`;
      fs.writeFileSync(path.join(goalPath, 'tasks.md'), tasksContent);

      // Mock process.exit
      const mockExit = jest.spyOn(process, 'exit').mockImplementation((code?: any) => {
        throw new Error(`Process exited with code ${code}`);
      });

      // 执行归档命令并创建 review
      const command = createArchiveCommand();
      try {
        await command.parseAsync(['node', 'test', 'test-goal-3', '--review', '2024-01-31', '--quiet']);
      } catch (error) {
        // 预期会抛出错误
      }

      mockExit.mockRestore();

      // 验证归档文件已创建
      const archivesDir = path.join(goalPath, 'archives');
      expect(fs.existsSync(archivesDir)).toBe(true);

      // 验证 review 文件已创建
      const reviewsDir = path.join(goalPath, 'reviews');
      expect(fs.existsSync(reviewsDir)).toBe(true);
      expect(fs.existsSync(path.join(reviewsDir, '2024-01-31.md'))).toBe(true);

      // 验证 review 文件内容
      const reviewContent = fs.readFileSync(path.join(reviewsDir, '2024-01-31.md'), 'utf-8');
      expect(reviewContent).toContain('date: 2024-01-31');
      expect(reviewContent).toContain('archived_tasks:');
    });

    it('should not create review file if date format is invalid', async () => {
      // 创建测试目标
      const goalPath = path.join(goalsDir, 'test-goal-4');
      fs.ensureDirSync(goalPath);

      const tasksContent = `---
period: 2024-01-01 to 2024-01-31
---

# Tasks

- [x] Task 1`;
      fs.writeFileSync(path.join(goalPath, 'tasks.md'), tasksContent);

      // Mock process.exit
      const mockExit = jest.spyOn(process, 'exit').mockImplementation((code?: any) => {
        throw new Error(`Process exited with code ${code}`);
      });

      // 执行归档命令（无效日期格式）
      const command = createArchiveCommand();
      try {
        await command.parseAsync(['node', 'test', 'test-goal-4', '--review', '01/31/2024', '--quiet']);
      } catch (error) {
        // 预期会抛出错误
      }

      mockExit.mockRestore();

      // 验证归档文件已创建
      const archivesDir = path.join(goalPath, 'archives');
      expect(fs.existsSync(archivesDir)).toBe(true);

      // 验证 review 文件未创建
      const reviewsDir = path.join(goalPath, 'reviews');
      expect(fs.existsSync(reviewsDir)).toBe(false);
    });

    it('should not overwrite existing review file', async () => {
      // 创建测试目标
      const goalPath = path.join(goalsDir, 'test-goal-5');
      fs.ensureDirSync(goalPath);
      fs.ensureDirSync(path.join(goalPath, 'reviews'));

      const tasksContent = `---
period: 2024-01-01 to 2024-01-31
---

# Tasks

- [x] Task 1`;
      fs.writeFileSync(path.join(goalPath, 'tasks.md'), tasksContent);

      // 创建已存在的 review 文件
      fs.writeFileSync(
        path.join(goalPath, 'reviews', '2024-01-31.md'),
        'Existing review'
      );

      // Mock process.exit
      const mockExit = jest.spyOn(process, 'exit').mockImplementation((code?: any) => {
        throw new Error(`Process exited with code ${code}`);
      });

      // 执行归档命令
      const command = createArchiveCommand();
      try {
        await command.parseAsync(['node', 'test', 'test-goal-5', '--review', '2024-01-31', '--quiet']);
      } catch (error) {
        // 预期会抛出错误
      }

      mockExit.mockRestore();

      // 验证 review 文件未被覆盖
      const reviewContent = fs.readFileSync(
        path.join(goalPath, 'reviews', '2024-01-31.md'),
        'utf-8'
      );
      expect(reviewContent).toBe('Existing review');
    });
  });

  describe('error handling', () => {
    it('should fail if goal does not exist', async () => {
      const command = createArchiveCommand();
      
      const mockExit = jest.spyOn(process, 'exit').mockImplementation((code?: any) => {
        throw new Error(`Process exited with code ${code}`);
      });

      await expect(
        command.parseAsync(['node', 'test', 'non-existent-goal', '--quiet'])
      ).rejects.toThrow();

      mockExit.mockRestore();
    });

    it('should fail if tasks.md does not exist', async () => {
      // 创建测试目标（但没有 tasks.md）
      const goalPath = path.join(goalsDir, 'test-goal-6');
      fs.ensureDirSync(goalPath);

      const command = createArchiveCommand();
      
      const mockExit = jest.spyOn(process, 'exit').mockImplementation((code?: any) => {
        throw new Error(`Process exited with code ${code}`);
      });

      await expect(
        command.parseAsync(['node', 'test', 'test-goal-6', '--quiet'])
      ).rejects.toThrow();

      mockExit.mockRestore();
    });
  });
});