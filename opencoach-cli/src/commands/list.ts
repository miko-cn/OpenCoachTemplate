import { Command } from 'commander';
import { GoalManager } from '../services/goal-manager';
import { logger } from '../utils/logger';
import { ErrorHandler } from '../utils/error-handler';
import { CommandResult } from '../types';

/**
 * 创建 list 命令
 */
export function createListCommand(): Command {
  const command = new Command('list');

  command
    .description('列出所有目标')
    .option('--active', '仅显示活跃目标')
    .option('--completed', '仅显示已完成目标')
    .option('--json', '以 JSON 格式输出结果')
    .option('--quiet', '静默模式，仅输出必要信息')
    .addHelpText('after', `
示例:
  $ opco list
  $ opco list --active
  $ opco list --completed
  $ opco list --json
`)
    .action(async (options) => {
      try {
        // 设置日志模式
        logger.setJsonOutput(options.json || false);
        logger.setQuiet(options.quiet || false);

        const goalManager = GoalManager.getInstance();

        // 获取目标列表
        const goals = await goalManager.listGoals({
          active: options.active,
          completed: options.completed,
        });

        const result: CommandResult = {
          success: true,
          message: `Found ${goals.length} goal(s)`,
          data: { goals, count: goals.length },
        };

        if (options.json) {
          logger.json(result);
        } else {
          if (goals.length === 0) {
            logger.info('No goals found.');
            logger.info('');
            logger.info('Create a new goal with:');
            logger.info('  opco create <goal-name>');
          } else {
            // 显示过滤信息
            let filterInfo = '';
            if (options.active) {
              filterInfo = ' (active only)';
            } else if (options.completed) {
              filterInfo = ' (completed only)';
            }

            logger.info(`Found ${goals.length} goal(s)${filterInfo}:`);
            logger.info('');

            // 使用表格显示
            const tableData = goals.map(goal => ({
              Name: goal.name,
              Title: goal.title,
              Status: goal.status,
              Created: goal.created,
              Deadline: goal.deadline || '-',
            }));

            logger.table(tableData);

            logger.info('');
            logger.info('View a goal with:');
            logger.info('  opco view <goal-name>');
          }
        }

        process.exit(0);
      } catch (error) {
        ErrorHandler.handle(error as Error);
      }
    });

  return command;
}
