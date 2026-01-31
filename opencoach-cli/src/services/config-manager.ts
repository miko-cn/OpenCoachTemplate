/**
 * 配置管理器
 * 
 * 负责管理 .opencoach/config.json 文件的读写操作
 * 支持配置项的增删改查和验证
 */

import * as fs from 'fs-extra';
import * as path from 'path';
import { Config } from '../types';
import { PathUtils } from '../utils/path-utils';
import { logger } from '../utils/logger';
import { ConfigError } from '../utils/error-handler';

/**
 * 默认配置项
 */
export const DEFAULT_CONFIG: Config = {
  // 模板文件路径（相对于项目根目录）
  templatePath: './templates',
  // 归档目录名称
  archiveDir: 'archives',
  // 日期格式
  dateFormat: 'YYYY-MM-DD',
  // 默认编辑器
  defaultEditor: '',
  // 是否启用调试模式
  debug: false,
  // 日志文件路径（空表示不记录日志文件）
  logFile: '',
  // 是否自动备份
  autoBackup: true,
  // 备份保留数量
  backupCount: 5,
};

/**
 * 配置项验证规则
 */
interface ConfigValidation {
  type: 'string' | 'number' | 'boolean' | 'path';
  required?: boolean;
  enum?: string[];
  min?: number;
  max?: number;
  description: string;
}

/**
 * 配置项验证规则映射
 */
const CONFIG_VALIDATIONS: Record<string, ConfigValidation> = {
  templatePath: {
    type: 'path',
    required: false,
    description: '模板文件路径（相对于项目根目录）',
  },
  archiveDir: {
    type: 'string',
    required: false,
    description: '归档目录名称',
  },
  dateFormat: {
    type: 'string',
    required: false,
    enum: ['YYYY-MM-DD', 'DD-MM-YYYY', 'MM-DD-YYYY', 'YYYY/MM/DD'],
    description: '日期格式',
  },
  defaultEditor: {
    type: 'string',
    required: false,
    description: '默认编辑器命令',
  },
  debug: {
    type: 'boolean',
    required: false,
    description: '是否启用调试模式',
  },
  logFile: {
    type: 'path',
    required: false,
    description: '日志文件路径',
  },
  autoBackup: {
    type: 'boolean',
    required: false,
    description: '是否启用自动备份',
  },
  backupCount: {
    type: 'number',
    required: false,
    min: 1,
    max: 100,
    description: '备份保留数量',
  },
};

/**
 * 配置管理器类
 * 
 * 功能：
 * - 读取和写入配置文件
 * - 配置项的增删改查
 * - 配置值的验证
 * - 默认值管理
 */
export class ConfigManager {
  /** 配置文件路径 */
  private configPath: string;
  /** 配置目录路径 */
  private configDir: string;
  /** 缓存的配置数据 */
  private config: Config | null = null;

  /**
   * 创建配置管理器实例
   * 
   * @param baseDir - 项目根目录路径，默认为当前工作目录
   */
  constructor(baseDir?: string) {
    this.configDir = PathUtils.getConfigDir(baseDir);
    this.configPath = PathUtils.getConfigFile(baseDir);
  }

  /**
   * 初始化配置目录和文件
   * 
   * 如果配置目录不存在，则创建目录
   * 如果配置文件不存在，则创建默认配置文件
   * 
   * @returns Promise<void>
   */
  async init(): Promise<void> {
    // 确保配置目录存在
    await PathUtils.ensureDir(this.configDir);

    // 如果配置文件不存在，创建默认配置
    if (!(await PathUtils.fileExists(this.configPath))) {
      await this.save({ ...DEFAULT_CONFIG });
      logger.debug(`创建默认配置文件: ${this.configPath}`);
    }
  }

  /**
   * 加载配置文件
   * 
   * 从文件系统读取配置，如果文件不存在则返回默认配置
   * 配置会被缓存以提高性能
   * 
   * @returns Promise<Config> - 配置对象的副本（修改返回值不会影响缓存）
   */
  async load(): Promise<Config> {
    // 如果有缓存，返回副本
    if (this.config !== null) {
      return { ...this.config };
    }

    try {
      // 检查配置文件是否存在
      if (await PathUtils.fileExists(this.configPath)) {
        const content = await fs.readFile(this.configPath, 'utf-8');
        const loadedConfig = JSON.parse(content);
        
        // 合并默认配置和加载的配置
        this.config = { ...DEFAULT_CONFIG, ...loadedConfig };
        logger.debug(`加载配置文件: ${this.configPath}`);
      } else {
        // 配置文件不存在，使用默认配置
        this.config = { ...DEFAULT_CONFIG };
        logger.debug('使用默认配置');
      }

      // 返回缓存的副本
      return { ...this.config };
    } catch (error) {
      // 配置文件解析失败
      throw new ConfigError(
        `配置文件解析失败: ${this.configPath}\n原因: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * 保存配置到文件
   * 
   * @param config - 要保存的配置对象
   * @returns Promise<void>
   */
  async save(config: Config): Promise<void> {
    try {
      // 确保配置目录存在
      await PathUtils.ensureDir(this.configDir);

      // 格式化 JSON 输出（2 空格缩进）
      const content = JSON.stringify(config, null, 2);
      await fs.writeFile(this.configPath, content, 'utf-8');

      // 更新缓存（创建副本以防止外部修改影响缓存）
      this.config = { ...config };
      logger.debug(`保存配置文件: ${this.configPath}`);
    } catch (error) {
      throw new ConfigError(
        `配置文件保存失败: ${this.configPath}\n原因: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * 获取单个配置项的值
   * 
   * @param key - 配置项的键名
   * @returns Promise<any> - 配置项的值，如果不存在返回 undefined
   */
  async get(key: string): Promise<any> {
    const config = await this.load();
    return config[key];
  }

  /**
   * 设置单个配置项的值
   * 
   * @param key - 配置项的键名
   * @param value - 配置项的值
   * @returns Promise<void>
   */
  async set(key: string, value: any): Promise<void> {
    // 验证配置项
    this.validateValue(key, value);

    // 加载现有配置
    const config = await this.load();

    // 转换值的类型
    const convertedValue = this.convertValue(key, value);

    // 更新配置
    config[key] = convertedValue;

    // 保存配置
    await this.save(config);
    logger.success(`配置项 "${key}" 已设置为 "${convertedValue}"`);
  }

  /**
   * 删除单个配置项
   * 
   * @param key - 要删除的配置项键名
   * @returns Promise<boolean> - 是否成功删除
   */
  async unset(key: string): Promise<boolean> {
    const config = await this.load();

    // 检查键是否存在
    if (!(key in config)) {
      logger.warn(`配置项 "${key}" 不存在`);
      return false;
    }

    // 删除配置项
    delete config[key];

    // 保存配置
    await this.save(config);
    logger.success(`配置项 "${key}" 已删除`);
    return true;
  }

  /**
   * 获取所有配置项
   * 
   * @returns Promise<Config> - 完整的配置对象
   */
  async list(): Promise<Config> {
    return await this.load();
  }

  /**
   * 重置配置为默认值
   * 
   * @returns Promise<void>
   */
  async reset(): Promise<void> {
    await this.save({ ...DEFAULT_CONFIG });
    logger.success('配置已重置为默认值');
  }

  /**
   * 清除配置缓存
   * 
   * 用于强制从文件重新加载配置
   */
  clearCache(): void {
    this.config = null;
  }

  /**
   * 获取配置文件路径
   * 
   * @returns string - 配置文件的完整路径
   */
  getConfigPath(): string {
    return this.configPath;
  }

  /**
   * 检查配置文件是否存在
   * 
   * @returns Promise<boolean>
   */
  async exists(): Promise<boolean> {
    return await PathUtils.fileExists(this.configPath);
  }

  /**
   * 获取所有可用的配置项及其说明
   * 
   * @returns Record<string, string> - 配置项名称到描述的映射
   */
  getAvailableKeys(): Record<string, string> {
    const keys: Record<string, string> = {};
    for (const [key, validation] of Object.entries(CONFIG_VALIDATIONS)) {
      keys[key] = validation.description;
    }
    return keys;
  }

  /**
   * 验证配置值是否合法
   * 
   * @param key - 配置项键名
   * @param value - 要验证的值
   * @throws ConfigError 如果验证失败
   */
  private validateValue(key: string, value: any): void {
    const validation = CONFIG_VALIDATIONS[key];

    // 如果没有验证规则，允许任意值
    if (!validation) {
      logger.warn(`配置项 "${key}" 没有预定义的验证规则`);
      return;
    }

    // 根据类型进行验证
    switch (validation.type) {
      case 'string':
      case 'path':
        if (typeof value !== 'string') {
          throw new ConfigError(`配置项 "${key}" 必须是字符串类型`);
        }
        // 枚举值验证
        if (validation.enum && !validation.enum.includes(value)) {
          throw new ConfigError(
            `配置项 "${key}" 的值必须是以下之一: ${validation.enum.join(', ')}`
          );
        }
        break;

      case 'number':
        const numValue = Number(value);
        if (isNaN(numValue)) {
          throw new ConfigError(`配置项 "${key}" 必须是数字类型`);
        }
        if (validation.min !== undefined && numValue < validation.min) {
          throw new ConfigError(
            `配置项 "${key}" 的值不能小于 ${validation.min}`
          );
        }
        if (validation.max !== undefined && numValue > validation.max) {
          throw new ConfigError(
            `配置项 "${key}" 的值不能大于 ${validation.max}`
          );
        }
        break;

      case 'boolean':
        const boolValue = String(value).toLowerCase();
        if (!['true', 'false', '1', '0', 'yes', 'no'].includes(boolValue)) {
          throw new ConfigError(
            `配置项 "${key}" 必须是布尔类型（true/false/1/0/yes/no）`
          );
        }
        break;
    }
  }

  /**
   * 转换配置值为正确的类型
   * 
   * @param key - 配置项键名
   * @param value - 原始值
   * @returns 转换后的值
   */
  private convertValue(key: string, value: any): any {
    const validation = CONFIG_VALIDATIONS[key];

    if (!validation) {
      return value;
    }

    switch (validation.type) {
      case 'number':
        return Number(value);

      case 'boolean':
        const boolValue = String(value).toLowerCase();
        return ['true', '1', 'yes'].includes(boolValue);

      case 'string':
      case 'path':
      default:
        return String(value);
    }
  }
}

// 导出默认实例（单例模式）
let defaultInstance: ConfigManager | null = null;

/**
 * 获取配置管理器实例（单例模式）
 * 
 * @param baseDir - 基础目录路径（可选）
 * @returns ConfigManager 实例
 */
export function getConfigManager(baseDir?: string): ConfigManager {
  if (!defaultInstance) {
    defaultInstance = new ConfigManager(baseDir);
  }
  return defaultInstance;
}

/**
 * 重置配置管理器实例（仅用于测试）
 */
export function resetConfigManager(): void {
  defaultInstance = null;
}
