import { Command } from 'commander';
import * as fs from 'fs-extra';
import * as path from 'path';
import { logger } from '../utils/logger';
import { ErrorHandler, FileNotFoundError } from '../utils/error-handler';
import { PathUtils } from '../utils/path-utils';
import { CommandResult } from '../types';

/**
 * archive 命令
 * 归档任务文件到 archives/ 目录
 */
export function createArchiveCommand(): Command {
  const archiveCmd = new Command('archive');
  archiveCmd
    .description('归档任务文件到 archives/ 目录')
    .argument('<goal-name>', '目标名称')
    .option('--review <date>', '创建回顾文件，指定日期 (YYYY-MM-DD)')
    .addHelpText('after', `
示例:
  $ opco archive my-goal
  $ opco archive my-goal --review 2024-01-31
  $ opco archive my-goal --json
`)    .option('--json', 'Output result in JSON format')
    .option('--quiet', 'Suppress non-essential output')
    .action(async (goalName: string, options: any) => {
      logger.setQuiet(options.quiet || false);
      logger.setJsonOutput(options.json || false);

      try {
        // 获取目标路径
        const goalsDir = PathUtils.getGoalsDir();
        if (!fs.existsSync(goalsDir)) {
          throw new FileNotFoundError('Goals directory not found. Please run "opco init" first.');
        }

        const goalPath = path.join(goalsDir, PathUtils.sanitizeFileName(goalName));
        if (!fs.existsSync(goalPath)) {
          throw new FileNotFoundError(`Goal "${goalName}" not found.`);
        }

        const tasksFile = path.join(goalPath, 'tasks.md');
        if (!fs.existsSync(tasksFile)) {
          throw new FileNotFoundError(
            `Tasks file not found: ${tasksFile}. Nothing to archive.`
          );
        }

        // 创建 archives 目录
        const archivesDir = path.join(goalPath, 'archives');
        await fs.ensureDir(archivesDir);

        // 生成归档文件名
        const now = new Date();
        const dateStr = now.toISOString().split('T')[0];
        const archiveFileName = `tasks-${dateStr}.md`;
        const archiveFilePath = path.join(archivesDir, archiveFileName);

        // 检查归档文件是否已存在
        if (fs.existsSync(archiveFilePath)) {
          // 添加时间戳避免冲突
          const timestamp = now.toISOString().replace(/[:.]/g, '-');
          const uniqueFileName = `tasks-${dateStr}-${timestamp}.md`;
          const uniqueFilePath = path.join(archivesDir, uniqueFileName);
          
          logger.warn(`Archive file already exists: ${archiveFileName}`);
          logger.info(`Creating unique file: ${uniqueFileName}`);
          
          await fs.copy(tasksFile, uniqueFilePath);
          await fs.remove(tasksFile);
          
          const result: CommandResult = {
            success: true,
            message: `Tasks archived successfully to ${uniqueFileName}`,
            data: {
              goalName,
              archiveFile: uniqueFileName,
              archivePath: uniqueFilePath,
              date: dateStr,
            },
          };

          if (options.json) {
            logger.json(result);
          } else {
            logger.success(`✓ Tasks archived successfully.`);
            logger.info(`Archive file: archives/${uniqueFileName}`);
          }
        } else {
          // 复制任务文件到归档目录
          await fs.copy(tasksFile, archiveFilePath);
          
          // 删除原任务文件
          await fs.remove(tasksFile);

          logger.info(`Archived tasks to: archives/${archiveFileName}`);

          // 如果指定了 --review 参数，创建 review 文件
          if (options.review) {
            const reviewDate = options.review;
            const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
            if (!dateRegex.test(reviewDate)) {
              logger.warn(
                `Invalid review date format "${reviewDate}". Expected format: YYYY-MM-DD. Skipping review creation.`
              );
            } else {
              const reviewsDir = path.join(goalPath, 'reviews');
              await fs.ensureDir(reviewsDir);

              const reviewFileName = `${reviewDate}.md`;
              const reviewFilePath = path.join(reviewsDir, reviewFileName);

              if (fs.existsSync(reviewFilePath)) {
                logger.warn(`Review file already exists: ${reviewFileName}`);
              } else {
                // 创建简单的 review 文件模板
                const reviewContent = `---
date: ${reviewDate}
archived_tasks: archives/${archiveFileName}
---

# Review - ${reviewDate}

## Tasks Completed

[Add your review content here]

## Challenges

[Describe any challenges you faced]

## Lessons Learned

[What did you learn?]

## Next Steps

[What are your next steps?]
`;
                await fs.writeFile(reviewFilePath, reviewContent, 'utf-8');
                logger.info(`Created review file: reviews/${reviewFileName}`);
              }
            }
          }

          const result: CommandResult = {
            success: true,
            message: `Tasks archived successfully to ${archiveFileName}`,
            data: {
              goalName,
              archiveFile: archiveFileName,
              archivePath: archiveFilePath,
              date: dateStr,
              ...(options.review && { reviewFile: `${options.review}.md` }),
            },
          };

          if (options.json) {
            logger.json(result);
          } else {
            logger.success(`✓ Tasks archived successfully.`);
            logger.info(`Archive file: archives/${archiveFileName}`);
            if (options.review) {
              logger.info(`Review file: reviews/${options.review}.md`);
            }
          }
        }

        process.exit(0);
      } catch (error) {
        ErrorHandler.handle(error as Error, options.json);
      }
    });

  return archiveCmd;
}