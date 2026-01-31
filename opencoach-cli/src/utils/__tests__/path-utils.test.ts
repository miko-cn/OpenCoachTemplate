import { PathUtils } from '../path-utils';
import * as path from 'path';
import * as fs from 'fs-extra';

describe('PathUtils', () => {
  const testBaseDir = '/test/base';

  describe('路径获取方法', () => {
    test('应该返回正确的goals目录路径', () => {
      const goalsDir = PathUtils.getGoalsDir(testBaseDir);
      expect(goalsDir).toBe(path.join(testBaseDir, 'goals'));
    });

    test('应该返回正确的templates目录路径', () => {
      const templatesDir = PathUtils.getTemplatesDir(testBaseDir);
      expect(templatesDir).toBe(path.join(testBaseDir, 'templates'));
    });

    test('应该返回正确的workflows目录路径', () => {
      const workflowsDir = PathUtils.getWorkflowsDir(testBaseDir);
      expect(workflowsDir).toBe(path.join(testBaseDir, 'workflows'));
    });

    test('应该返回正确的配置目录路径', () => {
      const configDir = PathUtils.getConfigDir(testBaseDir);
      expect(configDir).toBe(path.join(testBaseDir, '.opencoach'));
    });

    test('应该返回正确的配置文件路径', () => {
      const configFile = PathUtils.getConfigFile(testBaseDir);
      expect(configFile).toBe(path.join(testBaseDir, '.opencoach', 'config.json'));
    });

    test('应该返回正确的目标目录路径', () => {
      const goalDir = PathUtils.getGoalDir('my-goal', testBaseDir);
      expect(goalDir).toBe(path.join(testBaseDir, 'goals', 'my-goal'));
    });

    test('应该返回正确的归档目录路径', () => {
      const archiveDir = PathUtils.getArchiveDir('my-goal', testBaseDir);
      expect(archiveDir).toBe(path.join(testBaseDir, 'goals', 'my-goal', 'archives'));
    });

    test('应该返回正确的回顾目录路径', () => {
      const reviewDir = PathUtils.getReviewDir('my-goal', testBaseDir);
      expect(reviewDir).toBe(path.join(testBaseDir, 'goals', 'my-goal', 'reviews'));
    });
  });

  describe('文件名安全化', () => {
    test('应该移除特殊字符', () => {
      const sanitized = PathUtils.sanitizeFileName('test<>:"/\\|?*file');
      expect(sanitized).not.toMatch(/[<>:"/\\|?*]/);
    });

    test('应该将空格转换为连字符', () => {
      const sanitized = PathUtils.sanitizeFileName('my test file');
      expect(sanitized).toBe('my-test-file');
    });

    test('应该将多个连字符合并为一个', () => {
      const sanitized = PathUtils.sanitizeFileName('my---test---file');
      expect(sanitized).toBe('my-test-file');
    });

    test('应该移除首尾的连字符', () => {
      const sanitized = PathUtils.sanitizeFileName('-my-test-file-');
      expect(sanitized).toBe('my-test-file');
    });

    test('应该转换为小写', () => {
      const sanitized = PathUtils.sanitizeFileName('MyTestFile');
      expect(sanitized).toBe('mytestfile');
    });

    test('应该处理复杂的文件名', () => {
      const sanitized = PathUtils.sanitizeFileName('My Test: File (2024)');
      expect(sanitized).toBe('my-test-file-2024');
    });
  });

  describe('路径安全性验证', () => {
    test('应该允许基础目录内的路径', () => {
      const targetPath = path.join(testBaseDir, 'goals', 'my-goal');
      const isSafe = PathUtils.isPathSafe(targetPath, testBaseDir);
      expect(isSafe).toBe(true);
    });

    test('应该拒绝基础目录外的路径', () => {
      const targetPath = '/other/directory';
      const isSafe = PathUtils.isPathSafe(targetPath, testBaseDir);
      expect(isSafe).toBe(false);
    });

    test('应该拒绝使用..的路径遍历', () => {
      const targetPath = path.join(testBaseDir, '..', '..', 'etc', 'passwd');
      const isSafe = PathUtils.isPathSafe(targetPath, testBaseDir);
      expect(isSafe).toBe(false);
    });

    test('应该允许相对路径（在基础目录内）', () => {
      const baseDir = path.resolve(testBaseDir);
      const targetPath = path.join(baseDir, 'goals', '..', 'templates');
      const isSafe = PathUtils.isPathSafe(targetPath, baseDir);
      expect(isSafe).toBe(true);
    });
  });

  describe('文件和目录检查', () => {
    const tempDir = path.join(__dirname, 'temp-test');
    const tempFile = path.join(tempDir, 'test.txt');

    beforeAll(async () => {
      await fs.ensureDir(tempDir);
      await fs.writeFile(tempFile, 'test content');
    });

    afterAll(async () => {
      await fs.remove(tempDir);
    });

    test('dirExists应该检测存在的目录', async () => {
      const exists = await PathUtils.dirExists(tempDir);
      expect(exists).toBe(true);
    });

    test('dirExists应该检测不存在的目录', async () => {
      const exists = await PathUtils.dirExists(path.join(tempDir, 'nonexistent'));
      expect(exists).toBe(false);
    });

    test('fileExists应该检测存在的文件', async () => {
      const exists = await PathUtils.fileExists(tempFile);
      expect(exists).toBe(true);
    });

    test('fileExists应该检测不存在的文件', async () => {
      const exists = await PathUtils.fileExists(path.join(tempDir, 'nonexistent.txt'));
      expect(exists).toBe(false);
    });

    test('dirExists对文件应该返回false', async () => {
      const exists = await PathUtils.dirExists(tempFile);
      expect(exists).toBe(false);
    });

    test('fileExists对目录应该返回false', async () => {
      const exists = await PathUtils.fileExists(tempDir);
      expect(exists).toBe(false);
    });

    test('ensureDir应该创建不存在的目录', async () => {
      const newDir = path.join(tempDir, 'new-dir');
      await PathUtils.ensureDir(newDir);
      const exists = await PathUtils.dirExists(newDir);
      expect(exists).toBe(true);
    });

    test('ensureDir对已存在的目录应该不报错', async () => {
      await expect(PathUtils.ensureDir(tempDir)).resolves.not.toThrow();
    });
  });
});
