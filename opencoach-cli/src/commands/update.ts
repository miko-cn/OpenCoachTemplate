import { Command } from 'commander';
import * as fs from 'fs-extra';
import * as path from 'path';
import { logger } from '../utils/logger';
import { ErrorHandler, FileNotFoundError, ValidationError } from '../utils/error-handler';
import { PathUtils } from '../utils/path-utils';
import { CommandResult } from '../types';

// 使用 require 导入 gray-matter 以避免 ES 模块兼容性问题
const matter = require('gray-matter') as any;

/**
 * update 命令
 * 更新目标文件的字段
 */
export function createUpdateCommand(): Command {
  const command = new Command('update');

  command
    .description('更新目标文件的字段')
    .argument('<goal-name>', '要更新的目标名称')
    .option('--field <field>', '要更新的字段名')
    .option('--value <value>', '字段的新值')
    .option('--status <status>', '更新状态 (active|completed|paused|archived)')
    .option('--deadline <date>', '更新截止日期 (YYYY-MM-DD)')
    .option('--json', '以 JSON 格式输出结果')
    .option('--quiet', '静默模式，仅输出必要信息')
    .addHelpText('after', `
示例:
  $ opco update my-goal --status completed
  $ opco update my-goal --deadline 2024-12-31
  $ opco update my-goal --field title --value "新标题"
  $ opco update my-goal --field tags --value "work,important"
  $ opco update my-goal --json

允许更新的字段:
  title, description, status, deadline, priority, tags, category
`)
    .action(async (goalName: string, options: any) => {
      logger.setQuiet(options.quiet || false);
      logger.setJsonOutput(options.json || false);

      try {
        // 验证参数
        if (!options.field && !options.status && !options.deadline) {
          throw new ValidationError(
            'Please specify at least one field to update (--field, --status, or --deadline)'
          );
        }

        // 获取目标路径
        const goalsDir = PathUtils.getGoalsDir();
        if (!fs.existsSync(goalsDir)) {
          throw new FileNotFoundError('Goals directory not found. Please run "opco init" first.');
        }

        const goalPath = path.join(goalsDir, PathUtils.sanitizeFileName(goalName));
        if (!fs.existsSync(goalPath)) {
          throw new FileNotFoundError(`Goal "${goalName}" not found.`);
        }

        const goalFile = path.join(goalPath, 'goal.md');
        if (!fs.existsSync(goalFile)) {
          throw new FileNotFoundError(`Goal file not found: ${goalFile}`);
        }

        // 读取文件
        const content = await fs.readFile(goalFile, 'utf-8');
        const parsed = matter(content);

        // 更新字段
        let updated = false;

        // 处理 --status 参数
        if (options.status) {
          const validStatuses = ['active', 'completed', 'paused', 'archived'];
          if (!validStatuses.includes(options.status)) {
            throw new ValidationError(
              `Invalid status "${options.status}". Must be one of: ${validStatuses.join(', ')}`
            );
          }
          parsed.data.status = options.status;
          updated = true;
          logger.info(`Updated status to: ${options.status}`);
        }

        // 处理 --deadline 参数
        if (options.deadline) {
          const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
          if (!dateRegex.test(options.deadline)) {
            throw new ValidationError(
              `Invalid date format "${options.deadline}". Expected format: YYYY-MM-DD`
            );
          }
          const date = new Date(options.deadline);
          if (isNaN(date.getTime())) {
            throw new ValidationError(`Invalid date: ${options.deadline}`);
          }
          parsed.data.deadline = options.deadline;
          updated = true;
          logger.info(`Updated deadline to: ${options.deadline}`);
        }

        // 处理 --field 和 --value 参数
        if (options.field && options.value) {
          // 验证字段名
          const allowedFields = [
            'title',
            'description',
            'status',
            'deadline',
            'priority',
            'tags',
            'category',
          ];
          if (!allowedFields.includes(options.field)) {
            throw new ValidationError(
              `Invalid field "${options.field}". Allowed fields: ${allowedFields.join(', ')}`
            );
          }

          // 特殊处理某些字段
          if (options.field === 'status') {
            const validStatuses = ['active', 'completed', 'paused', 'archived'];
            if (!validStatuses.includes(options.value)) {
              throw new ValidationError(
                `Invalid status "${options.value}". Must be one of: ${validStatuses.join(', ')}`
              );
            }
          }

          if (options.field === 'deadline') {
            const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
            if (!dateRegex.test(options.value)) {
              throw new ValidationError(
                `Invalid date format "${options.value}". Expected format: YYYY-MM-DD`
              );
            }
          }

          // 处理数组字段（如 tags）
          if (options.field === 'tags') {
            parsed.data[options.field] = options.value.split(',').map((t: string) => t.trim());
          } else {
            parsed.data[options.field] = options.value;
          }
          updated = true;
          logger.info(`Updated ${options.field} to: ${options.value}`);
        }

        if (!updated) {
          throw new ValidationError('No fields were updated.');
        }

        // 更新 updated 字段
        const now = new Date();
        parsed.data.updated = now.toISOString().split('T')[0];

        // 保存文件
        const newContent = matter.stringify(parsed.content, parsed.data);
        await fs.writeFile(goalFile, newContent, 'utf-8');

        const result: CommandResult = {
          success: true,
          message: `Goal "${goalName}" updated successfully.`,
          data: {
            goalName,
            updated: parsed.data.updated,
            changes: {
              ...(options.status && { status: options.status }),
              ...(options.deadline && { deadline: options.deadline }),
              ...(options.field && { [options.field]: options.value }),
            },
          },
        };

        if (options.json) {
          logger.json(result);
        } else {
          logger.success(`✓ Goal "${goalName}" updated successfully.`);
          logger.info(`Updated: ${parsed.data.updated}`);
        }

        process.exit(0);
      } catch (error) {
        ErrorHandler.handle(error as Error, options.json);
      }
    });

  return command;
}