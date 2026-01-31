/**
 * 配置管理器测试
 * 
 * 测试 ConfigManager 类的所有功能：
 * - 配置文件的读写
 * - 配置项的增删改查
 * - 配置值的验证
 * - 默认值管理
 */

import * as fs from 'fs-extra';
import * as path from 'path';
import {
  ConfigManager,
  DEFAULT_CONFIG,
  getConfigManager,
  resetConfigManager,
} from '../../services/config-manager';

describe('ConfigManager', () => {
  // 测试用的临时目录（使用唯一ID避免冲突）
  let tempDir: string;
  let configDir: string;
  let configPath: string;

  let configManager: ConfigManager;

  // 每个测试前创建临时目录和新的 ConfigManager 实例
  beforeEach(async () => {
    // 使用时间戳和随机数创建唯一目录名
    const uniqueId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    tempDir = path.join(__dirname, `temp-config-test-${uniqueId}`);
    configDir = path.join(tempDir, '.opencoach');
    configPath = path.join(configDir, 'config.json');
    
    await fs.ensureDir(tempDir);
    configManager = new ConfigManager(tempDir);
  });

  // 每个测试后清理临时目录和重置单例
  afterEach(async () => {
    await fs.remove(tempDir);
    resetConfigManager();
  });

  describe('初始化', () => {
    test('应该创建配置目录和默认配置文件', async () => {
      await configManager.init();

      // 验证配置目录存在
      const dirExists = await fs.pathExists(configDir);
      expect(dirExists).toBe(true);

      // 验证配置文件存在
      const fileExists = await fs.pathExists(configPath);
      expect(fileExists).toBe(true);

      // 验证配置文件内容
      const content = await fs.readJson(configPath);
      expect(content).toEqual(DEFAULT_CONFIG);
    });

    test('如果配置文件已存在，不应覆盖', async () => {
      // 先创建一个自定义配置
      await fs.ensureDir(configDir);
      const customConfig = { ...DEFAULT_CONFIG, customKey: 'customValue' };
      await fs.writeJson(configPath, customConfig);

      // 执行初始化
      await configManager.init();

      // 验证配置文件未被覆盖
      const content = await fs.readJson(configPath);
      expect(content.customKey).toBe('customValue');
    });
  });

  describe('加载配置', () => {
    test('应该加载已存在的配置文件', async () => {
      // 创建配置文件
      await fs.ensureDir(configDir);
      const customConfig = { templatePath: './custom-templates' };
      await fs.writeJson(configPath, customConfig);

      // 加载配置
      const config = await configManager.load();

      // 验证配置已合并默认值
      expect(config.templatePath).toBe('./custom-templates');
      expect(config.archiveDir).toBe(DEFAULT_CONFIG.archiveDir);
    });

    test('如果配置文件不存在，应返回默认配置', async () => {
      const config = await configManager.load();
      expect(config).toEqual(DEFAULT_CONFIG);
    });

    test('应该缓存配置以提高性能', async () => {
      await configManager.init();

      // 第一次加载
      const config1 = await configManager.load();

      // 修改文件
      await fs.writeJson(configPath, { templatePath: './modified' });

      // 第二次加载应该返回缓存的配置
      const config2 = await configManager.load();
      expect(config2.templatePath).toBe(config1.templatePath);

      // 清除缓存后应该加载新配置
      configManager.clearCache();
      const config3 = await configManager.load();
      expect(config3.templatePath).toBe('./modified');
    });

    test('如果配置文件格式错误，应抛出错误', async () => {
      await fs.ensureDir(configDir);
      await fs.writeFile(configPath, 'invalid json content');

      await expect(configManager.load()).rejects.toThrow('配置文件解析失败');
    });
  });

  describe('保存配置', () => {
    test('应该保存配置到文件', async () => {
      const newConfig = { ...DEFAULT_CONFIG, templatePath: './new-templates' };
      await configManager.save(newConfig);

      // 验证文件内容
      const content = await fs.readJson(configPath);
      expect(content.templatePath).toBe('./new-templates');
    });

    test('保存后应更新缓存', async () => {
      const newConfig = { ...DEFAULT_CONFIG, templatePath: './cached-templates' };
      await configManager.save(newConfig);

      // 不清除缓存，直接加载
      const loaded = await configManager.load();
      expect(loaded.templatePath).toBe('./cached-templates');
    });
  });

  describe('获取配置项', () => {
    test('应该返回存在的配置项的值', async () => {
      await configManager.init();
      const value = await configManager.get('templatePath');
      expect(value).toBe(DEFAULT_CONFIG.templatePath);
    });

    test('应该返回 undefined 对于不存在的配置项', async () => {
      await configManager.init();
      const value = await configManager.get('nonExistentKey');
      expect(value).toBeUndefined();
    });
  });

  describe('设置配置项', () => {
    test('应该设置字符串配置项', async () => {
      await configManager.init();
      await configManager.set('templatePath', './my-templates');

      const value = await configManager.get('templatePath');
      expect(value).toBe('./my-templates');
    });

    test('应该设置数字配置项并转换类型', async () => {
      await configManager.init();
      await configManager.set('backupCount', '10');

      const value = await configManager.get('backupCount');
      expect(value).toBe(10);
      expect(typeof value).toBe('number');
    });

    test('应该设置布尔配置项并转换类型', async () => {
      await configManager.init();
      await configManager.set('debug', 'true');

      const value = await configManager.get('debug');
      expect(value).toBe(true);
      expect(typeof value).toBe('boolean');
    });

    test('应该接受不同形式的布尔值', async () => {
      await configManager.init();

      // 测试 true 的各种形式
      const trueValues = ['true', 'True', 'TRUE', '1', 'yes', 'Yes'];
      for (const val of trueValues) {
        await configManager.set('debug', val);
        expect(await configManager.get('debug')).toBe(true);
      }

      // 测试 false 的各种形式
      const falseValues = ['false', 'False', 'FALSE', '0', 'no', 'No'];
      for (const val of falseValues) {
        await configManager.set('debug', val);
        expect(await configManager.get('debug')).toBe(false);
      }
    });

    test('应该验证数字范围', async () => {
      await configManager.init();

      // backupCount 的范围是 1-100
      await expect(configManager.set('backupCount', '0')).rejects.toThrow(
        '不能小于'
      );
      await expect(configManager.set('backupCount', '101')).rejects.toThrow(
        '不能大于'
      );
    });

    test('应该验证枚举值', async () => {
      await configManager.init();

      // dateFormat 只能是预定义的值
      await expect(configManager.set('dateFormat', 'invalid')).rejects.toThrow(
        '必须是以下之一'
      );

      // 正确的值应该可以设置
      await configManager.set('dateFormat', 'DD-MM-YYYY');
      expect(await configManager.get('dateFormat')).toBe('DD-MM-YYYY');
    });

    test('应该允许设置自定义配置项', async () => {
      await configManager.init();
      await configManager.set('customKey', 'customValue');

      const value = await configManager.get('customKey');
      expect(value).toBe('customValue');
    });
  });

  describe('删除配置项', () => {
    test('应该删除存在的配置项', async () => {
      await configManager.init();
      await configManager.set('customKey', 'customValue');

      const success = await configManager.unset('customKey');
      expect(success).toBe(true);

      const value = await configManager.get('customKey');
      expect(value).toBeUndefined();
    });

    test('删除不存在的配置项应返回 false', async () => {
      await configManager.init();
      const success = await configManager.unset('nonExistentKey');
      expect(success).toBe(false);
    });
  });

  describe('列出配置项', () => {
    test('应该返回所有配置项', async () => {
      await configManager.init();
      await configManager.set('customKey', 'customValue');

      const config = await configManager.list();
      expect(config.templatePath).toBe(DEFAULT_CONFIG.templatePath);
      expect(config.customKey).toBe('customValue');
    });
  });

  describe('重置配置', () => {
    test('应该重置所有配置为默认值', async () => {
      await configManager.init();
      await configManager.set('templatePath', './modified');
      await configManager.set('customKey', 'customValue');

      // 验证设置成功
      let config = await configManager.list();
      expect(config.customKey).toBe('customValue');
      expect(config.templatePath).toBe('./modified');

      // 重置配置
      await configManager.reset();
      
      // 清除缓存以确保从文件重新加载
      configManager.clearCache();

      config = await configManager.list();
      // 重置后，所有配置项都应该恢复为默认值
      expect(config.templatePath).toBe(DEFAULT_CONFIG.templatePath);
      // 重置会清除所有配置并使用默认值，自定义配置项也会被删除
      expect(config.customKey).toBeUndefined();
    });
  });

  describe('配置文件路径', () => {
    test('应该返回正确的配置文件路径', () => {
      const configFilePath = configManager.getConfigPath();
      expect(configFilePath).toBe(configPath);
    });
  });

  describe('检查配置文件是否存在', () => {
    test('配置文件不存在时应返回 false', async () => {
      const exists = await configManager.exists();
      expect(exists).toBe(false);
    });

    test('配置文件存在时应返回 true', async () => {
      await configManager.init();
      const exists = await configManager.exists();
      expect(exists).toBe(true);
    });
  });

  describe('获取可用配置项', () => {
    test('应该返回所有可用配置项及其说明', () => {
      const keys = configManager.getAvailableKeys();
      
      expect(keys.templatePath).toBeDefined();
      expect(keys.archiveDir).toBeDefined();
      expect(keys.dateFormat).toBeDefined();
      expect(keys.debug).toBeDefined();
    });
  });
});

describe('getConfigManager 单例', () => {
  const tempDir = path.join(__dirname, 'temp-singleton-test');

  beforeEach(async () => {
    await fs.ensureDir(tempDir);
    resetConfigManager();
  });

  afterEach(async () => {
    await fs.remove(tempDir);
    resetConfigManager();
  });

  test('应该返回相同的实例', () => {
    const manager1 = getConfigManager(tempDir);
    const manager2 = getConfigManager(tempDir);
    expect(manager1).toBe(manager2);
  });

  test('重置后应该返回新实例', () => {
    const manager1 = getConfigManager(tempDir);
    resetConfigManager();
    const manager2 = getConfigManager(tempDir);
    expect(manager1).not.toBe(manager2);
  });
});
