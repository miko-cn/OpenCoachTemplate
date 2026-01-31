import { Command } from 'commander';
import { GoalManager } from '../services/goal-manager';
import { logger } from '../utils/logger';
import { ErrorHandler } from '../utils/error-handler';
import { CommandResult } from '../types';

/**
 * 创建 create 命令
 */
export function createCreateCommand(): Command {
  const command = new Command('create');

  command
    .description('创建新的目标')
    .argument('<name>', '目标名称')
    .option('--with-preferences', '同时创建 preferences.md 文件')
    .option('--title <title>', '目标标题（默认使用目标名称）')
    .option('--description <description>', '目标描述')
    .option('--json', '以 JSON 格式输出结果')
    .option('--quiet', '静默模式，仅输出必要信息')
    .addHelpText('after', `
示例:
  $ opco create my-goal
  $ opco create my-goal --with-preferences
  $ opco create my-goal --title "我的目标" --description "学习 TypeScript"
  $ opco create my-goal --json
`)
    .action(async (name: string, options) => {
      try {
        // 设置日志模式
        logger.setJsonOutput(options.json || false);
        logger.setQuiet(options.quiet || false);

        const goalManager = GoalManager.getInstance();

        // 创建目标
        const { goalPath, goalId } = await goalManager.createGoal(name, {
          withPreferences: options.withPreferences,
          title: options.title,
          description: options.description,
        });

        const result: CommandResult = {
          success: true,
          message: `Goal created successfully: ${name}`,
          data: {
            name,
            goalId,
            path: goalPath,
            files: [
              'goal.md',
              'milestones.md',
              'tasks.md',
              ...(options.withPreferences ? ['preferences.md'] : []),
            ],
          },
        };

        if (options.json) {
          logger.json(result);
        } else {
          logger.success(`✓ Goal created: ${name}`);
          logger.info(`  Path: ${goalPath}`);
          logger.info(`  Goal ID: ${goalId}`);
          logger.info('');
          logger.info('Files created:');
          logger.info('  - goal.md (goal details)');
          logger.info('  - milestones.md (milestones and timeline)');
          logger.info('  - tasks.md (task list)');
          if (options.withPreferences) {
            logger.info('  - preferences.md (user preferences)');
          }
          logger.info('');
          logger.info('Next steps:');
          logger.info(`  1. Edit goal.md to define your goal`);
          logger.info(`  2. Edit milestones.md to set milestones`);
          logger.info(`  3. Run 'opco view ${name}' to view the goal`);
        }

        process.exit(0);
      } catch (error) {
        ErrorHandler.handle(error as Error);
      }
    });

  return command;
}
