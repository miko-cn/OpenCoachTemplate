#!/usr/bin/env node

/**
 * OpenCoach CLI 主入口
 * 
 * 基于 Commander.js 构建的命令行工具框架
 * 提供目标管理、文件验证、归档等功能
 */

import { Command } from 'commander';
import { logger } from './utils/logger';
import { ErrorHandler } from './utils/error-handler';

// 导入命令模块
import { createConfigCommand, configCommand } from './commands/config';
import { createInitCommand } from './commands/init';
import { createCreateCommand } from './commands/create';
import { createListCommand } from './commands/list';
import { createViewCommand } from './commands/view';
import { createCheckCommand } from './commands/check';
import { createUpdateCommand } from './commands/update';
import { createArchiveCommand } from './commands/archive';
import { createValidateCommand } from './commands/validate';
import { createTasksCommand } from './commands/tasks';
import { createDateCommand } from './commands/date';

// 后续实现的命令
// ... 其他命令

const program = new Command();

// ============================================
// CLI 基本配置
// ============================================
program
  .name('opco')
  .description('OpenCoach CLI - 标准化的个人成长目标管理命令行工具')
  .version('0.1.0', '-v, --version', '显示版本号')
  .option('--json', '以JSON格式输出结果')
  .option('--quiet', '静默模式，仅输出必要信息')
  .hook('preAction', (thisCommand) => {
    // 在每个命令执行前设置全局选项
    const opts = thisCommand.opts();
    if (opts.json) {
      logger.setJsonOutput(true);
    }
    if (opts.quiet) {
      logger.setQuiet(true);
    }
  });

// ============================================
// help 命令 - 显示帮助信息
// ============================================
program
  .command('help [command]')
  .description('显示帮助信息')
  .action((command?: string) => {
    if (command) {
      const cmd = program.commands.find(c => c.name() === command);
      if (cmd) {
        cmd.help();
      } else {
        logger.error(`未知命令: ${command}`);
        process.exit(1);
      }
    } else {
      program.help();
    }
  });

// ============================================
// init 命令 - 初始化项目（已实现）
// ============================================
program.addCommand(createInitCommand());

// ============================================
// create 命令 - 创建新目标（已实现）
// ============================================
program.addCommand(createCreateCommand());

// ============================================
// list 命令 - 列出所有目标（已实现）
// ============================================
program.addCommand(createListCommand());

// ============================================
// view 命令 - 查看目标状态（已实现）
// ============================================
program.addCommand(createViewCommand());

// ============================================
// check 命令 - 检查文件格式（已实现）
// ============================================
program.addCommand(createCheckCommand());

// ============================================
// archive 命令 - 归档任务（已实现）
// ============================================
program.addCommand(createArchiveCommand());


// ============================================
// update 命令 - 更新目标信息（已实现）
// ============================================
program.addCommand(createUpdateCommand());

// ============================================
// validate 命令 - 验证工作流状态（已实现）
// ============================================
program.addCommand(createValidateCommand());

// ============================================
// tasks 命令 - 任务管理（已实现）
// ============================================
program.addCommand(createTasksCommand());

// ============================================
// date 命令 - 日期查询和时间推导（已实现）
// ============================================
program.addCommand(createDateCommand());

// ============================================
// export 命令 - 导出目标数据（占位）
// ============================================
program
  .command('export <goal-name>')
  .description('导出目标数据')
  .option('--format <format>', '导出格式 (json|yaml|markdown)', 'json')
  .option('--output <path>', '输出路径')
  .action(async (goalName: string, options: any) => {
    logger.info('export命令开发中...');
    // await exportCommand(goalName, options);
  });

// ============================================
// import 命令 - 导入目标数据（占位）
// ============================================
program
  .command('import <file>')
  .description('导入目标数据')
  .option('--merge', '合并而非覆盖')
  .action(async (file: string, options: any) => {
    logger.info('import命令开发中...');
    // await importCommand(file, options);
  });

// ============================================
// config 命令 - 管理配置（已实现）
// ============================================
// 注册 config 子命令
program.addCommand(createConfigCommand());

// ============================================
// 错误处理和程序入口
// ============================================

/**
 * 程序主入口
 * 
 * 解析命令行参数并执行相应命令
 */
async function main() {
  try {
    await program.parseAsync(process.argv);
    
    // 如果没有提供任何命令，显示帮助信息
    if (process.argv.length === 2) {
      program.help();
    }
  } catch (error) {
    // 统一的错误处理
    if (error instanceof Error) {
      ErrorHandler.handle(error);
    } else {
      ErrorHandler.handle(new Error(String(error)));
    }
  }
}

// 启动程序
main();
