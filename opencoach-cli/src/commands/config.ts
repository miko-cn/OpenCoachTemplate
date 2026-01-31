/**
 * 配置命令模块
 * 
 * 提供配置项的管理功能：
 * - set: 设置配置项
 * - get: 获取配置项
 * - list: 列出所有配置项
 * - unset: 删除配置项
 * - reset: 重置为默认配置
 */

import { Command } from 'commander';
import { table } from 'table';
import chalk from 'chalk';
import { ConfigManager, getConfigManager, DEFAULT_CONFIG } from '../services/config-manager';
import { logger } from '../utils/logger';
import { ErrorHandler, ConfigError } from '../utils/error-handler';

/**
 * 配置命令的选项接口
 */
interface ConfigCommandOptions {
  json?: boolean;
  quiet?: boolean;
}

/**
 * 处理 config set 子命令
 * 
 * @param key - 配置项键名
 * @param value - 配置项的值
 * @param options - 命令选项
 */
async function handleSet(
  key: string,
  value: string,
  options: ConfigCommandOptions
): Promise<void> {
  const configManager = getConfigManager();

  try {
    await configManager.set(key, value);

    if (options.json) {
      logger.json({
        success: true,
        action: 'set',
        key,
        value: await configManager.get(key),
      });
    }
  } catch (error) {
    if (error instanceof ConfigError) {
      logger.error(error.message);
      
      // 如果是未知的配置项，显示可用的配置项列表
      const availableKeys = configManager.getAvailableKeys();
      logger.info('\n可用的配置项:');
      for (const [k, desc] of Object.entries(availableKeys)) {
        console.log(chalk.cyan(`  ${k}`), chalk.gray(`- ${desc}`));
      }
      
      process.exit(1);
    }
    throw error;
  }
}

/**
 * 处理 config get 子命令
 * 
 * @param key - 配置项键名
 * @param options - 命令选项
 */
async function handleGet(
  key: string,
  options: ConfigCommandOptions
): Promise<void> {
  const configManager = getConfigManager();
  const value = await configManager.get(key);

  if (value === undefined) {
    if (options.json) {
      logger.json({
        success: false,
        action: 'get',
        key,
        error: `配置项 "${key}" 不存在`,
      });
    } else {
      logger.warn(`配置项 "${key}" 不存在`);
      
      // 显示可用的配置项
      const availableKeys = configManager.getAvailableKeys();
      logger.info('\n可用的配置项:');
      for (const [k, desc] of Object.entries(availableKeys)) {
        console.log(chalk.cyan(`  ${k}`), chalk.gray(`- ${desc}`));
      }
    }
    process.exit(1);
  }

  if (options.json) {
    logger.json({
      success: true,
      action: 'get',
      key,
      value,
    });
  } else if (!options.quiet) {
    console.log(value);
  }
}

/**
 * 处理 config list 子命令
 * 
 * @param options - 命令选项
 */
async function handleList(options: ConfigCommandOptions): Promise<void> {
  const configManager = getConfigManager();
  const config = await configManager.list();
  const availableKeys = configManager.getAvailableKeys();

  if (options.json) {
    logger.json({
      success: true,
      action: 'list',
      config,
      availableKeys,
    });
    return;
  }

  if (options.quiet) {
    // 静默模式只输出键值对
    for (const [key, value] of Object.entries(config)) {
      console.log(`${key}=${value}`);
    }
    return;
  }

  // 构建表格数据
  const tableData: string[][] = [
    [
      chalk.bold('配置项'),
      chalk.bold('当前值'),
      chalk.bold('默认值'),
      chalk.bold('说明'),
    ],
  ];

  // 添加已定义的配置项
  for (const [key, desc] of Object.entries(availableKeys)) {
    const currentValue = config[key];
    const defaultValue = DEFAULT_CONFIG[key];
    const isModified = currentValue !== defaultValue;

    tableData.push([
      chalk.cyan(key),
      isModified ? chalk.yellow(String(currentValue)) : String(currentValue),
      chalk.gray(String(defaultValue)),
      chalk.gray(desc),
    ]);
  }

  // 添加自定义配置项（不在预定义列表中的）
  for (const [key, value] of Object.entries(config)) {
    if (!(key in availableKeys)) {
      tableData.push([
        chalk.magenta(key),
        String(value),
        chalk.gray('-'),
        chalk.gray('(自定义配置项)'),
      ]);
    }
  }

  // 输出表格
  console.log('\n' + chalk.bold.blue('📋 配置列表') + '\n');
  console.log(
    table(tableData, {
      border: {
        topBody: '─',
        topJoin: '┬',
        topLeft: '┌',
        topRight: '┐',
        bottomBody: '─',
        bottomJoin: '┴',
        bottomLeft: '└',
        bottomRight: '┘',
        bodyLeft: '│',
        bodyRight: '│',
        bodyJoin: '│',
        joinBody: '─',
        joinLeft: '├',
        joinRight: '┤',
        joinJoin: '┼',
      },
    })
  );

  // 显示配置文件路径
  console.log(chalk.gray(`配置文件: ${configManager.getConfigPath()}`));
}

/**
 * 处理 config unset 子命令
 * 
 * @param key - 要删除的配置项键名
 * @param options - 命令选项
 */
async function handleUnset(
  key: string,
  options: ConfigCommandOptions
): Promise<void> {
  const configManager = getConfigManager();
  const success = await configManager.unset(key);

  if (options.json) {
    logger.json({
      success,
      action: 'unset',
      key,
    });
  }

  if (!success) {
    process.exit(1);
  }
}

/**
 * 处理 config reset 子命令
 * 
 * @param options - 命令选项
 */
async function handleReset(options: ConfigCommandOptions): Promise<void> {
  const configManager = getConfigManager();
  await configManager.reset();

  if (options.json) {
    logger.json({
      success: true,
      action: 'reset',
      config: DEFAULT_CONFIG,
    });
  }
}

/**
 * 创建并配置 config 命令
 * 
 * @returns Command - 配置好的 config 命令
 */
export function createConfigCommand(): Command {
  const configCmd = new Command('config')
    .description('管理配置项 (set|get|list|unset|reset)');

  // set 子命令
  configCmd
    .command('set <key> <value>')
    .description('设置配置项的值')
    .action(async (key: string, value: string) => {
      const parentOpts = configCmd.parent?.opts() || {};
      await handleSet(key, value, parentOpts);
    });

  // get 子命令
  configCmd
    .command('get <key>')
    .description('获取配置项的值')
    .action(async (key: string) => {
      const parentOpts = configCmd.parent?.opts() || {};
      await handleGet(key, parentOpts);
    });

  // list 子命令
  configCmd
    .command('list')
    .description('列出所有配置项')
    .action(async () => {
      const parentOpts = configCmd.parent?.opts() || {};
      await handleList(parentOpts);
    });

  // unset 子命令
  configCmd
    .command('unset <key>')
    .description('删除配置项')
    .action(async (key: string) => {
      const parentOpts = configCmd.parent?.opts() || {};
      await handleUnset(key, parentOpts);
    });

  // reset 子命令
  configCmd
    .command('reset')
    .description('重置所有配置项为默认值')
    .action(async () => {
      const parentOpts = configCmd.parent?.opts() || {};
      await handleReset(parentOpts);
    });

  return configCmd;
}

/**
 * 执行 config 命令（兼容旧的调用方式）
 * 
 * @param action - 操作类型 (set|get|list|unset|reset)
 * @param key - 配置项键名
 * @param value - 配置项的值
 */
export async function configCommand(
  action: string,
  key?: string,
  value?: string
): Promise<void> {
  const options: ConfigCommandOptions = {};

  switch (action.toLowerCase()) {
    case 'set':
      if (!key || value === undefined) {
        logger.error('使用方法: opco config set <key> <value>');
        process.exit(1);
      }
      await handleSet(key, value, options);
      break;

    case 'get':
      if (!key) {
        logger.error('使用方法: opco config get <key>');
        process.exit(1);
      }
      await handleGet(key, options);
      break;

    case 'list':
      await handleList(options);
      break;

    case 'unset':
      if (!key) {
        logger.error('使用方法: opco config unset <key>');
        process.exit(1);
      }
      await handleUnset(key, options);
      break;

    case 'reset':
      await handleReset(options);
      break;

    default:
      logger.error(`未知的操作: ${action}`);
      logger.info('可用的操作: set, get, list, unset, reset');
      process.exit(1);
  }
}
