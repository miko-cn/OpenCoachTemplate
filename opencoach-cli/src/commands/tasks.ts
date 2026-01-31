/**
 * tasks 命令 - 任务管理
 * 
 * 提供任务统计、查看等功能
 */

import { Command } from 'commander';
import * as path from 'path';
import * as fs from 'fs-extra';
import { logger } from '../utils/logger';
import { PathUtils } from '../utils/path-utils';
import { CLIError, FileNotFoundError } from '../utils/error-handler';
import { CommandResult } from '../types';

const matter = require('gray-matter');

/**
 * 任务项接口
 */
interface TaskItem {
  checked: boolean;
  text: string;
  line: number;
}

/**
 * 任务统计接口
 */
interface TaskStats {
  total: number;
  completed: number;
  pending: number;
  percentage: number;
  period?: string;
  tasks: TaskItem[];
}

/**
 * 创建 tasks 命令
 */
export function createTasksCommand(): Command {
  const tasksCmd = new Command('tasks');
  tasksCmd
    .description('显示任务统计信息')
    .argument('[goal-name]', '目标名称（可选，默认使用当前目录）')
    .option('--show-tasks', '显示任务列表')
    .addHelpText('after', `
示例:
  $ opco tasks                    # 在目标目录下运行，自动检测目标
  $ opco tasks my-goal           # 显示指定目标的任务统计
  $ opco tasks my-goal --show-tasks  # 显示任务列表
  $ opco tasks my-goal --json    # JSON 格式输出

输出信息:
  - 任务周期（period）
  - 总任务数、已完成数、未完成数
  - 完成率和进度条
  - 任务列表（使用 --show-tasks 选项）
`)
    .action(async (goalName: string | undefined, options: any) => {
      try {
        // 从父命令获取全局选项（--json, --quiet）
        const parentOpts = tasksCmd.parent?.opts() || {};
        // 合并本地选项和父命令选项
        const allOptions = { ...parentOpts, ...options };
        
        const result = await statusCommand(goalName, allOptions);
        if (result.success) {
          process.exit(0);
        } else {
          process.exit(1);
        }
      } catch (error) {
        if (error instanceof Error) {
          logger.error(error.message);
        }
        process.exit(1);
      }
    });

  return tasksCmd;
}

/**
 * status 命令实现
 */
async function statusCommand(
  goalName?: string,
  options?: any
): Promise<CommandResult> {
  // 确定目标名称
  let targetGoal = goalName;
  if (!targetGoal) {
    // 如果没有指定目标，尝试从当前目录推断
    const cwd = process.cwd();
    const goalsPath = PathUtils.getGoalsDir();
    
    if (cwd.startsWith(goalsPath)) {
      const relativePath = path.relative(goalsPath, cwd);
      const parts = relativePath.split(path.sep);
      if (parts.length > 0 && parts[0] !== '..') {
        targetGoal = parts[0];
      }
    }
    
    if (!targetGoal) {
      throw new CLIError('请指定目标名称或在目标目录下运行命令');
    }
  }

  // 检查目标是否存在
  const goalPath = path.join(PathUtils.getGoalsDir(), targetGoal);
  if (!fs.existsSync(goalPath)) {
    throw new FileNotFoundError(`目标 "${targetGoal}" 不存在`);
  }

  // 检查 tasks.md 是否存在
  const tasksPath = path.join(goalPath, 'tasks.md');
  if (!fs.existsSync(tasksPath)) {
    throw new FileNotFoundError(`目标 "${targetGoal}" 没有 tasks.md 文件`);
  }

  // 读取并解析 tasks.md
  const tasksContent = fs.readFileSync(tasksPath, 'utf-8');
  const { data: frontmatter, content } = matter(tasksContent);

  // 解析任务列表
  const stats = parseTasksContent(content, frontmatter);

  // 输出结果
  if (options?.json) {
    console.log(JSON.stringify({
      success: true,
      goal: targetGoal,
      stats: {
        total: stats.total,
        completed: stats.completed,
        pending: stats.pending,
        percentage: stats.percentage,
        period: stats.period,
      },
      tasks: options?.showTasks ? stats.tasks : undefined,
    }, null, 2));
  } else {
    // 显示统计信息
    logger.info(`\n📊 任务统计 - ${targetGoal}\n`);
    
    if (stats.period) {
      logger.info(`周期: ${stats.period}`);
    }
    
    logger.info(`总任务数: ${stats.total}`);
    logger.info(`已完成: ${stats.completed} ✓`);
    logger.info(`未完成: ${stats.pending} ○`);
    logger.info(`完成率: ${stats.percentage.toFixed(1)}%`);
    
    // 进度条
    const barLength = 30;
    const completedBars = Math.round((stats.percentage / 100) * barLength);
    const pendingBars = barLength - completedBars;
    const progressBar = '█'.repeat(completedBars) + '░'.repeat(pendingBars);
    logger.info(`进度: [${progressBar}]`);

    // 显示任务列表（如果指定了 --show-tasks）
    if (options?.showTasks && stats.tasks.length > 0) {
      logger.info('\n任务列表:');
      stats.tasks.forEach((task, index) => {
        const status = task.checked ? '✓' : '○';
        const number = (index + 1).toString().padStart(2, ' ');
        logger.info(`  ${number}. [${status}] ${task.text}`);
      });
    }
    
    logger.info('');
  }

  return {
    success: true,
    message: '任务统计完成',
    data: stats,
  };
}

/**
 * 解析任务内容
 */
function parseTasksContent(content: string, frontmatter: any): TaskStats {
  const lines = content.split('\n');
  const tasks: TaskItem[] = [];
  
  // 匹配任务项：- [ ] 或 - [x] 或 - [X]
  const taskRegex = /^[\s]*-\s+\[([ xX])\]\s+(.+)$/;
  
  lines.forEach((line, index) => {
    const match = line.match(taskRegex);
    if (match) {
      const checked = match[1].toLowerCase() === 'x';
      const text = match[2].trim();
      tasks.push({
        checked,
        text,
        line: index + 1,
      });
    }
  });

  const completed = tasks.filter(t => t.checked).length;
  const total = tasks.length;
  const pending = total - completed;
  const percentage = total > 0 ? (completed / total) * 100 : 0;

  // 提取周期信息
  let period: string | undefined;
  if (frontmatter.period) {
    period = frontmatter.period;
  } else if (frontmatter.period_start && frontmatter.period_end) {
    period = `${frontmatter.period_start} to ${frontmatter.period_end}`;
  }

  return {
    total,
    completed,
    pending,
    percentage,
    period,
    tasks,
  };
}
