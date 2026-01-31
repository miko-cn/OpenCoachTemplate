import { Command } from 'commander';
import { FileValidator } from '../services/file-validator';
import { logger } from '../utils/logger';
import { ErrorHandler } from '../utils/error-handler';
import { CommandResult } from '../types';

/**
 * check 命令
 * 检查目标文件的格式和完整性
 */
export function createCheckCommand(): Command {
  const command = new Command('check');

  command
    .description('检查目标文件的格式和完整性')
    .argument('[goal-name]', '要检查的目标名称（可选，默认为当前目录）')
    .option('--fix', '自动修复可修复的问题')
    .option('--json', '以 JSON 格式输出结果')
    .option('--quiet', '静默模式，仅输出必要信息')
    .addHelpText('after', `
示例:
  $ opco check                # 检查当前目录
  $ opco check my-goal       # 检查特定目标
  $ opco check my-goal --fix # 检查并自动修复
  $ opco check my-goal --json
`)
    .action(async (goalName: string | undefined, options: any) => {
      logger.setQuiet(options.quiet || false);
      logger.setJsonOutput(options.json || false);

      try {
        const validator = FileValidator.getInstance();

        // 如果指定了 --fix，先尝试修复
        if (options.fix) {
          logger.info(`Checking and fixing ${goalName || 'current directory'}...`);
          const fixedCount = await validator.fixGoal(goalName);
          
          if (fixedCount > 0) {
            logger.success(`Fixed ${fixedCount} issue(s).`);
          }
        }

        // 检查文件
        logger.info(`Checking ${goalName || 'current directory'}...`);
        const issues = await validator.checkGoal(goalName);

        // 输出结果
        if (issues.length === 0) {
          const result: CommandResult = {
            success: true,
            message: 'All files are valid. No issues found.',
          };

          if (options.json) {
            logger.json(result);
          } else {
            logger.success('✓ All files are valid. No issues found.');
          }

          process.exit(0);
        } else {
          // 按文件分组问题
          const issuesByFile = new Map<string, typeof issues>();
          for (const issue of issues) {
            if (!issuesByFile.has(issue.file)) {
              issuesByFile.set(issue.file, []);
            }
            issuesByFile.get(issue.file)!.push(issue);
          }

          const result: CommandResult = {
            success: false,
            message: `Found ${issues.length} issue(s) in ${issuesByFile.size} file(s).`,
            data: {
              totalIssues: issues.length,
              filesWithIssues: issuesByFile.size,
              issues,
            },
          };

          if (options.json) {
            logger.json(result);
          } else {
            logger.error(`✗ Found ${issues.length} issue(s) in ${issuesByFile.size} file(s):\n`);

            // 按文件输出问题
            for (const [file, fileIssues] of issuesByFile) {
              logger.error(`  ${file}:`);
              for (const issue of fileIssues) {
                const location = issue.line ? `:${issue.line}` : '';
                const prefix = issue.line ? '    ' : '  ';
                logger.error(`${prefix}  [${issue.type}]${location} ${issue.message}`);
              }
              logger.error('');
            }

            if (!options.fix) {
              logger.info('Tip: Use --fix to automatically fix some issues.');
            }
          }

          process.exit(1);
        }
      } catch (error) {
        ErrorHandler.handle(error as Error, options.json);
      }
    });

  return command;
}