/**
 * 项目初始化命令模块
 * 
 * 提供项目初始化功能：
 * - 创建标准目录结构（goals/, templates/, workflows/, .opencoach/）
 * - 复制默认模板文件
 * - 初始化配置文件
 */

import { Command } from 'commander';
import * as fs from 'fs-extra';
import * as path from 'path';
import chalk from 'chalk';
import inquirer from 'inquirer';
import ora from 'ora';
import { logger } from '../utils/logger';
import { ErrorHandler, CLIError } from '../utils/error-handler';
import { PathUtils } from '../utils/path-utils';
import { getConfigManager } from '../services/config-manager';

/**
 * 初始化命令的选项接口
 */
interface InitCommandOptions {
  force?: boolean;  // 强制初始化，覆盖已存在的文件
  json?: boolean;   // JSON 输出模式
  quiet?: boolean;  // 静默模式
}

/**
 * 需要创建的目录列表
 */
const DIRECTORIES = [
  'goals',
  'templates',
  'workflows',
  '.opencoach',
];

/**
 * 需要复制的模板文件映射
 * key: 源文件路径（相对于 opencoach 目录）
 * value: 目标文件路径（相对于项目根目录）
 */
const TEMPLATE_FILES: Record<string, string> = {
  'templates/goal.md': 'templates/goal.md',
  'templates/milestones.md': 'templates/milestones.md',
  'templates/preferences.md': 'templates/preferences.md',
  'templates/review.md': 'templates/review.md',
  'templates/tasks.md': 'templates/tasks.md',
  'workflows/create-goal.md': 'workflows/create-goal.md',
  'workflows/create-review.md': 'workflows/create-review.md',
  'workflows/create-task.md': 'workflows/create-task.md',
  'Agent.md': '.opencoach/Agent.md',
};

/**
 * 检查项目是否已经初始化
 * 
 * @param projectRoot - 项目根目录
 * @returns 是否已初始化
 */
function isProjectInitialized(projectRoot: string): boolean {
  const goalsDir = path.join(projectRoot, 'goals');
  const configDir = path.join(projectRoot, '.opencoach');
  
  return fs.existsSync(goalsDir) || fs.existsSync(configDir);
}

/**
 * 获取已存在的目录和文件列表
 * 
 * @param projectRoot - 项目根目录
 * @returns 已存在的目录和文件列表
 */
function getExistingItems(projectRoot: string): {
  directories: string[];
  files: string[];
} {
  const existingDirs: string[] = [];
  const existingFiles: string[] = [];

  // 检查目录
  for (const dir of DIRECTORIES) {
    const dirPath = path.join(projectRoot, dir);
    if (fs.existsSync(dirPath)) {
      existingDirs.push(dir);
    }
  }

  // 检查文件
  for (const targetPath of Object.values(TEMPLATE_FILES)) {
    const filePath = path.join(projectRoot, targetPath);
    if (fs.existsSync(filePath)) {
      existingFiles.push(targetPath);
    }
  }

  return { directories: existingDirs, files: existingFiles };
}

/**
 * 创建目录结构
 * 
 * @param projectRoot - 项目根目录
 * @param spinner - 加载动画实例
 */
async function createDirectories(
  projectRoot: string,
  spinner?: ora.Ora
): Promise<void> {
  for (const dir of DIRECTORIES) {
    const dirPath = path.join(projectRoot, dir);
    
    if (spinner) {
      spinner.text = `创建目录: ${dir}`;
    }
    
    await fs.ensureDir(dirPath);
    logger.debug(`已创建目录: ${dirPath}`);
  }
}

/**
 * 复制模板文件
 * 
 * @param projectRoot - 项目根目录
 * @param templateRoot - 模板文件根目录
 * @param spinner - 加载动画实例
 */
async function copyTemplateFiles(
  projectRoot: string,
  templateRoot: string,
  spinner?: ora.Ora
): Promise<void> {
  for (const [sourcePath, targetPath] of Object.entries(TEMPLATE_FILES)) {
    const sourceFile = path.join(templateRoot, sourcePath);
    const targetFile = path.join(projectRoot, targetPath);
    
    if (spinner) {
      spinner.text = `复制文件: ${targetPath}`;
    }
    
    // 检查源文件是否存在
    if (!fs.existsSync(sourceFile)) {
      logger.warn(`模板文件不存在: ${sourceFile}`);
      continue;
    }
    
    // 确保目标目录存在
    await fs.ensureDir(path.dirname(targetFile));
    
    // 复制文件
    await fs.copy(sourceFile, targetFile, { overwrite: true });
    logger.debug(`已复制文件: ${sourceFile} -> ${targetFile}`);
  }
}

/**
 * 初始化配置文件
 * 
 * @param projectRoot - 项目根目录
 */
async function initializeConfig(projectRoot: string): Promise<void> {
  const configManager = getConfigManager();
  
  // 确保配置文件存在（会使用默认配置）
  await configManager.load();
  await configManager.save(await configManager.list());
  
  logger.debug('已初始化配置文件');
}

/**
 * 显示初始化成功消息
 * 
 * @param projectRoot - 项目根目录
 * @param options - 命令选项
 */
function showSuccessMessage(
  projectRoot: string,
  options: InitCommandOptions
): void {
  if (options.json) {
    logger.json({
      success: true,
      action: 'init',
      projectRoot,
      message: 'OpenCoach 项目初始化成功',
    });
    return;
  }

  if (options.quiet) {
    return;
  }

  console.log('\n' + chalk.green.bold('✅ OpenCoach 项目初始化成功！') + '\n');
  console.log(chalk.cyan('📁 已创建以下目录结构：'));
  console.log(chalk.gray('  ├── goals/          (存放目标文件)'));
  console.log(chalk.gray('  ├── templates/      (模板文件)'));
  console.log(chalk.gray('  ├── workflows/      (工作流文件)'));
  console.log(chalk.gray('  └── .opencoach/     (配置文件)\n'));
  
  console.log(chalk.cyan('📝 下一步操作：'));
  console.log(chalk.white('  1. 创建新目标: ') + chalk.yellow('opco create <goal-name>'));
  console.log(chalk.white('  2. 查看所有目标: ') + chalk.yellow('opco list'));
  console.log(chalk.white('  3. 查看帮助信息: ') + chalk.yellow('opco --help\n'));
}

/**
 * 处理 init 命令
 * 
 * @param options - 命令选项
 */
export async function handleInit(options: InitCommandOptions): Promise<void> {
  const projectRoot = process.cwd();
  
  // 查找模板文件根目录
  // 优先级：
  // 1. 配置的 templatePath
  // 2. CLI 工具内置的模板目录（打包在 npm 包中）
  // 3. 项目根目录的 opencoach 目录
  // 4. 父目录的 opencoach 目录
  const configManager = getConfigManager();
  let templateRoot = await configManager.get('templatePath') as string | undefined;
  
  if (!templateRoot) {
    // 尝试使用 CLI 工具内置的模板目录
    // __dirname 在编译后指向 dist/commands/
    // 模板文件在 src/templates/ 目录，打包后会在包的根目录
    const builtinTemplatePath = path.join(__dirname, '..', '..', 'src', 'templates');
    
    if (fs.existsSync(builtinTemplatePath)) {
      templateRoot = builtinTemplatePath;
      logger.debug(`使用内置模板目录: ${templateRoot}`);
    } else {
      // 尝试在项目根目录的 opencoach 目录中查找
      const defaultTemplatePath = path.join(projectRoot, 'opencoach');
      if (fs.existsSync(defaultTemplatePath)) {
        templateRoot = defaultTemplatePath;
      } else {
        // 尝试在父目录中查找
        const parentTemplatePath = path.join(projectRoot, '..', 'opencoach');
        if (fs.existsSync(parentTemplatePath)) {
          templateRoot = parentTemplatePath;
        } else {
          throw new CLIError(
            '找不到模板文件目录。请使用 opco config set templatePath <path> 设置模板路径。'
          );
        }
      }
    }
  }
  
  // 检查模板目录是否存在
  if (!fs.existsSync(templateRoot)) {
    throw new CLIError(`模板目录不存在: ${templateRoot}`);
  }
  
  logger.debug(`使用模板目录: ${templateRoot}`);
  
  // 检查项目是否已初始化
  if (isProjectInitialized(projectRoot) && !options.force) {
    const existing = getExistingItems(projectRoot);
    
    if (options.json) {
      logger.json({
        success: false,
        action: 'init',
        error: '项目已初始化',
        existing,
      });
      process.exit(1);
    }
    
    // 显示已存在的项目
    console.log(chalk.yellow('\n⚠️  检测到项目已初始化\n'));
    
    if (existing.directories.length > 0) {
      console.log(chalk.cyan('已存在的目录:'));
      existing.directories.forEach(dir => {
        console.log(chalk.gray(`  - ${dir}`));
      });
      console.log();
    }
    
    if (existing.files.length > 0) {
      console.log(chalk.cyan('已存在的文件:'));
      existing.files.forEach(file => {
        console.log(chalk.gray(`  - ${file}`));
      });
      console.log();
    }
    
    // 询问用户是否继续
    const { confirm } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'confirm',
        message: '是否继续初始化？（已存在的文件将被覆盖）',
        default: false,
      },
    ]);
    
    if (!confirm) {
      logger.info('已取消初始化');
      process.exit(0);
    }
  }
  
  // 开始初始化
  const spinner = options.quiet ? undefined : ora('正在初始化项目...').start();
  
  try {
    // 1. 创建目录结构
    await createDirectories(projectRoot, spinner);
    
    // 2. 复制模板文件
    await copyTemplateFiles(projectRoot, templateRoot, spinner);
    
    // 3. 初始化配置文件
    if (spinner) {
      spinner.text = '初始化配置文件';
    }
    await initializeConfig(projectRoot);
    
    if (spinner) {
      spinner.succeed(chalk.green('项目初始化完成'));
    }
    
    // 显示成功消息
    showSuccessMessage(projectRoot, options);
    
  } catch (error) {
    if (spinner) {
      spinner.fail(chalk.red('初始化失败'));
    }
    throw error;
  }
}

/**
 * 创建并配置 init 命令
 * 
 * @returns Command - 配置好的 init 命令
 */
export function createInitCommand(): Command {
  return new Command('init')
    .description('初始化 OpenCoach 项目结构')
    .option('-f, --force', '强制初始化，覆盖已存在的文件')
    .addHelpText('after', `
示例:
  $ opco init              # 初始化项目
  $ opco init --force      # 强制初始化（覆盖已存在的文件）
  $ opco init --json       # JSON 格式输出

创建的目录结构:
  goals/          - 目标目录
  templates/      - 模板文件
  workflows/      - 工作流定义
  .opencoach/     - 配置文件
`)
    .action(async (options: InitCommandOptions) => {
      try {
        // 从父命令获取全局选项
        const parentOpts = (options as any).parent?.opts() || {};
        const mergedOptions = { ...options, ...parentOpts };
        await handleInit(mergedOptions);
      } catch (error) {
        if (error instanceof Error) {
          ErrorHandler.handle(error);
        } else {
          ErrorHandler.handle(new Error(String(error)));
        }
      }
    });
}
