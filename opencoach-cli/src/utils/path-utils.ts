import * as path from 'path';
import * as fs from 'fs-extra';

/**
 * 路径工具类
 */
export class PathUtils {
  /**
   * 获取goals目录路径
   */
  static getGoalsDir(baseDir?: string): string {
    const base = baseDir || process.cwd();
    return path.join(base, 'goals');
  }

  /**
   * 获取templates目录路径
   */
  static getTemplatesDir(baseDir?: string): string {
    const base = baseDir || process.cwd();
    return path.join(base, 'templates');
  }

  /**
   * 获取workflows目录路径
   */
  static getWorkflowsDir(baseDir?: string): string {
    const base = baseDir || process.cwd();
    return path.join(base, 'workflows');
  }

  /**
   * 获取配置目录路径
   */
  static getConfigDir(baseDir?: string): string {
    const base = baseDir || process.cwd();
    return path.join(base, '.opencoach');
  }

  /**
   * 获取配置文件路径
   */
  static getConfigFile(baseDir?: string): string {
    return path.join(PathUtils.getConfigDir(baseDir), 'config.json');
  }

  /**
   * 获取目标目录路径
   */
  static getGoalDir(goalName: string, baseDir?: string): string {
    return path.join(PathUtils.getGoalsDir(baseDir), goalName);
  }

  /**
   * 获取归档目录路径
   */
  static getArchiveDir(goalName: string, baseDir?: string): string {
    return path.join(PathUtils.getGoalDir(goalName, baseDir), 'archives');
  }

  /**
   * 获取回顾目录路径
   */
  static getReviewDir(goalName: string, baseDir?: string): string {
    return path.join(PathUtils.getGoalDir(goalName, baseDir), 'reviews');
  }

  /**
   * 安全化文件名（移除特殊字符）
   */
  static sanitizeFileName(name: string): string {
    return name
      .replace(/[<>:"/\\|?*\x00-\x1F()[\]{}!@#$%^&+=;,]/g, '-')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
      .toLowerCase();
  }

  /**
   * 验证路径安全性（防止目录遍历攻击）
   */
  static isPathSafe(targetPath: string, baseDir: string): boolean {
    const resolvedTarget = path.resolve(targetPath);
    const resolvedBase = path.resolve(baseDir);
    return resolvedTarget.startsWith(resolvedBase);
  }

  /**
   * 检查目录是否存在
   */
  static async dirExists(dirPath: string): Promise<boolean> {
    try {
      const stat = await fs.stat(dirPath);
      return stat.isDirectory();
    } catch {
      return false;
    }
  }

  /**
   * 检查文件是否存在
   */
  static async fileExists(filePath: string): Promise<boolean> {
    try {
      const stat = await fs.stat(filePath);
      return stat.isFile();
    } catch {
      return false;
    }
  }

  /**
   * 确保目录存在
   */
  static async ensureDir(dirPath: string): Promise<void> {
    await fs.ensureDir(dirPath);
  }
}
