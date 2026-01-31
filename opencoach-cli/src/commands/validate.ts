import { Command } from 'commander';
import { logger } from '../utils/logger';
import { ErrorHandler, FileNotFoundError } from '../utils/error-handler';
import { WorkflowValidator, WorkflowStage } from '../services/workflow-validator';
import { CommandResult } from '../types';

/**
 * validate 命令
 * 验证目标的工作流状态和完整性
 */
export function createValidateCommand(): Command {
  const command = new Command('validate');

  command
    .description('验证目标的工作流状态和完整性')
    .argument('<goal-name>', '要验证的目标名称')
    .option('--workflow <workflow-id>', '验证特定工作流的前置条件 (create-goal|create-task|create-review)')
    .option('--json', '以 JSON 格式输出结果')
    .option('--quiet', '静默模式，仅输出必要信息')
    .addHelpText('after', `
示例:
  $ opco validate my-goal
  $ opco validate my-goal --workflow create-goal
  $ opco validate my-goal --workflow create-task
  $ opco validate my-goal --workflow create-review
  $ opco validate my-goal --json

工作流阶段:
  NOT_STARTED        - 未开始
  GOAL_CREATED       - 目标已创建
  MILESTONES_DEFINED - 里程碑已定义
  TASKS_CREATED      - 任务已创建
  IN_PROGRESS        - 进行中
  REVIEW_READY       - 准备回顾
  COMPLETED          - 已完成
  ARCHIVED           - 已归档
`)
    .action(async (goalName: string, options: any) => {
      logger.setQuiet(options.quiet || false);
      logger.setJsonOutput(options.json || false);

      try {
        const validator = WorkflowValidator.getInstance();

        // 验证工作流
        const result = options.workflow
          ? await validator.validateWorkflow(goalName, options.workflow)
          : await validator.validateGoal(goalName);

        // 构建输出结果
        const commandResult: CommandResult = {
          success: result.isValid,
          message: result.isValid
            ? `Goal "${goalName}" workflow is valid.`
            : `Goal "${goalName}" workflow has issues.`,
          data: {
            goalName,
            stage: result.stage,
            isValid: result.isValid,
            missingFiles: result.missingFiles,
            missingConditions: result.missingConditions,
            suggestions: result.suggestions,
            issues: result.issues,
          },
        };

        if (options.json) {
          logger.json(commandResult);
        } else {
          // 显示验证结果
          if (result.isValid) {
            logger.success(`✓ Goal "${goalName}" workflow is valid.`);
          } else {
            logger.error(`✗ Goal "${goalName}" workflow has issues.`);
          }

          // 显示当前阶段
          logger.info(`\nCurrent Stage: ${getStageDisplayName(result.stage)}`);

          // 显示缺失的文件
          if (result.missingFiles.length > 0) {
            logger.warn('\nMissing Files:');
            result.missingFiles.forEach((file) => {
              logger.warn(`  - ${file}`);
            });
          }

          // 显示缺失的条件
          if (result.missingConditions.length > 0) {
            logger.warn('\nMissing Conditions:');
            result.missingConditions.forEach((condition) => {
              logger.warn(`  - ${condition}`);
            });
          }

          // 显示格式问题
          if (result.issues.length > 0) {
            logger.warn('\nFormat Issues:');
            const issuesByFile = result.issues.reduce((acc, issue) => {
              if (!acc[issue.file]) {
                acc[issue.file] = [];
              }
              acc[issue.file].push(issue);
              return acc;
            }, {} as Record<string, typeof result.issues>);

            Object.entries(issuesByFile).forEach(([file, issues]) => {
              logger.warn(`\n  ${file}:`);
              issues.forEach((issue) => {
                const location = issue.line ? ` (line ${issue.line})` : '';
                logger.warn(`    - ${issue.message}${location}`);
              });
            });
          }

          // 显示建议
          if (result.suggestions.length > 0) {
            logger.info('\nSuggestions:');
            result.suggestions.forEach((suggestion) => {
              logger.info(`  • ${suggestion}`);
            });
          }
        }

        process.exit(result.isValid ? 0 : 1);
      } catch (error) {
        ErrorHandler.handle(error as Error, options.json);
      }
    });

  return command;
}

/**
 * 获取阶段的显示名称
 */
function getStageDisplayName(stage: WorkflowStage): string {
  const stageNames: Record<WorkflowStage, string> = {
    [WorkflowStage.NOT_STARTED]: 'Not Started',
    [WorkflowStage.GOAL_CREATED]: 'Goal Created',
    [WorkflowStage.MILESTONES_DEFINED]: 'Milestones Defined',
    [WorkflowStage.TASKS_CREATED]: 'Tasks Created',
    [WorkflowStage.IN_PROGRESS]: 'In Progress',
    [WorkflowStage.REVIEW_READY]: 'Review Ready',
    [WorkflowStage.COMPLETED]: 'Completed',
    [WorkflowStage.ARCHIVED]: 'Archived',
  };

  return stageNames[stage] || 'Unknown';
}
