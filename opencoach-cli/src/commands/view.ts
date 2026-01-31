import { Command } from 'commander';
import { GoalManager } from '../services/goal-manager';
import { logger } from '../utils/logger';
import { ErrorHandler } from '../utils/error-handler';
import { CommandResult } from '../types';

/**
 * 创建 view 命令
 */
export function createViewCommand(): Command {
  const command = new Command('view');

  command
    .description('查看目标详情')
    .argument('[name]', '目标名称（如果不提供，则列出所有目标）')
    .option('--json', '以 JSON 格式输出结果')
    .option('--quiet', '静默模式，仅输出必要信息')
    .addHelpText('after', `
示例:
  $ opco view                # 列出所有目标
  $ opco view my-goal       # 查看特定目标
  $ opco view my-goal --json
`)
    .action(async (name: string | undefined, options) => {
      try {
        // 设置日志模式
        logger.setJsonOutput(options.json || false);
        logger.setQuiet(options.quiet || false);

        const goalManager = GoalManager.getInstance();

        // 如果没有提供名称，列出所有目标
        if (!name) {
          const goals = await goalManager.listGoals();

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
              logger.info(`Found ${goals.length} goal(s):`);
              logger.info('');

              // 使用表格显示
              const tableData = goals.map(goal => ({
                Name: goal.name,
                Title: goal.title,
                Status: goal.status,
                Created: goal.created,
              }));

              logger.table(tableData);

              logger.info('');
              logger.info('View a specific goal with:');
              logger.info('  opco view <goal-name>');
            }
          }

          process.exit(0);
          return;
        }

        // 查看特定目标
        const { metadata, content, files } = await goalManager.viewGoal(name);

        const result: CommandResult = {
          success: true,
          message: `Goal details: ${name}`,
          data: {
            metadata,
            content,
            files,
          },
        };

        if (options.json) {
          logger.json(result);
        } else {
          logger.info(`Goal: ${metadata.title}`);
          logger.info('─'.repeat(60));
          logger.info('');

          // 显示元数据
          logger.info('Metadata:');
          logger.info(`  Name: ${metadata.name}`);
          logger.info(`  Status: ${metadata.status}`);
          logger.info(`  Created: ${metadata.created}`);
          if (metadata.updated) {
            logger.info(`  Updated: ${metadata.updated}`);
          }
          if (metadata.deadline) {
            logger.info(`  Deadline: ${metadata.deadline}`);
          }
          if (metadata.description) {
            logger.info(`  Description: ${metadata.description}`);
          }
          logger.info('');

          // 显示文件列表
          logger.info('Files:');
          files.forEach(file => {
            logger.info(`  - ${file}`);
          });
          logger.info('');

          // 显示内容（去除 frontmatter 和 agent_context）
          logger.info('Content:');
          logger.info('─'.repeat(60));
          
          // 解析内容，移除 frontmatter 和 agent_context
          let displayContent = content;
          
          // 移除 frontmatter
          displayContent = displayContent.replace(/^---\n[\s\S]*?\n---\n/, '');
          
          // 移除 agent_context
          displayContent = displayContent.replace(/<agent_context>[\s\S]*?<\/agent_context>\n*/g, '');
          
          // 移除 user_content 标签
          displayContent = displayContent.replace(/<\/?user_content>/g, '');
          
          // 清理多余的空行
          displayContent = displayContent.replace(/\n{3,}/g, '\n\n').trim();
          
          logger.info(displayContent);
        }

        process.exit(0);
      } catch (error) {
        ErrorHandler.handle(error as Error);
      }
    });

  return command;
}
