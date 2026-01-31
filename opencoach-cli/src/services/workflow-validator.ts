import * as fs from 'fs-extra';
import * as path from 'path';
import { PathUtils } from '../utils/path-utils';
import { FileValidator } from './file-validator';
import { ValidationIssue } from '../types';

// 使用 require 导入 gray-matter 以避免 ES 模块兼容性问题
const matter = require('gray-matter') as any;

/**
 * 工作流阶段定义
 */
export enum WorkflowStage {
  NOT_STARTED = 'not_started',
  GOAL_CREATED = 'goal_created',
  MILESTONES_DEFINED = 'milestones_defined',
  TASKS_CREATED = 'tasks_created',
  IN_PROGRESS = 'in_progress',
  REVIEW_READY = 'review_ready',
  COMPLETED = 'completed',
  ARCHIVED = 'archived',
}

/**
 * 工作流验证结果
 */
export interface WorkflowValidationResult {
  stage: WorkflowStage;
  isValid: boolean;
  missingFiles: string[];
  missingConditions: string[];
  suggestions: string[];
  issues: ValidationIssue[];
}

/**
 * 工作流验证器
 * 负责验证目标的工作流状态和完整性
 */
export class WorkflowValidator {
  private static instance: WorkflowValidator;
  private fileValidator: FileValidator;

  private constructor() {
    this.fileValidator = FileValidator.getInstance();
  }

  /**
   * 获取单例实例
   */
  public static getInstance(): WorkflowValidator {
    if (!WorkflowValidator.instance) {
      WorkflowValidator.instance = new WorkflowValidator();
    }
    return WorkflowValidator.instance;
  }

  /**
   * 验证目标的工作流状态
   */
  public async validateGoal(goalName: string): Promise<WorkflowValidationResult> {
    const goalsDir = PathUtils.getGoalsDir();
    const goalPath = path.join(goalsDir, PathUtils.sanitizeFileName(goalName));

    if (!fs.existsSync(goalPath)) {
      throw new Error(`Goal "${goalName}" not found.`);
    }

    const result: WorkflowValidationResult = {
      stage: WorkflowStage.NOT_STARTED,
      isValid: true,
      missingFiles: [],
      missingConditions: [],
      suggestions: [],
      issues: [],
    };

    // 1. 检查必需文件存在性
    const requiredFiles = ['goal.md', 'milestones.md'];
    for (const file of requiredFiles) {
      const filePath = path.join(goalPath, file);
      if (!fs.existsSync(filePath)) {
        result.missingFiles.push(file);
        result.isValid = false;
      }
    }

    if (result.missingFiles.length > 0) {
      result.suggestions.push(
        `Create missing files: ${result.missingFiles.join(', ')}`
      );
      return result;
    }

    // 2. 检查文件格式（使用 FileValidator）
    const formatIssues = await this.fileValidator.checkGoal(goalName);
    if (formatIssues.length > 0) {
      result.issues = formatIssues;
      result.isValid = false;
      result.suggestions.push(
        'Fix format issues using: opco check ' + goalName + ' --fix'
      );
    }

    // 3. 判断当前工作流阶段
    result.stage = await this.detectWorkflowStage(goalPath);

    // 4. 根据阶段生成建议
    result.suggestions.push(...this.generateSuggestions(result.stage, goalPath));

    // 5. 检查工作流前置条件
    const conditions = this.checkWorkflowConditions(result.stage, goalPath);
    result.missingConditions = conditions.missing;
    if (conditions.missing.length > 0) {
      result.isValid = false;
    }

    return result;
  }

  /**
   * 验证特定工作流的前置条件
   */
  public async validateWorkflow(
    goalName: string,
    workflowId: string
  ): Promise<WorkflowValidationResult> {
    const result = await this.validateGoal(goalName);

    // 根据工作流 ID 检查特定前置条件
    const workflowConditions = this.getWorkflowConditions(workflowId);
    const goalsDir = PathUtils.getGoalsDir();
    const goalPath = path.join(goalsDir, PathUtils.sanitizeFileName(goalName));

    for (const condition of workflowConditions) {
      if (!this.checkCondition(condition, goalPath)) {
        result.missingConditions.push(condition.description);
        result.isValid = false;
      }
    }

    return result;
  }

  /**
   * 检测当前工作流阶段
   */
  private async detectWorkflowStage(goalPath: string): Promise<WorkflowStage> {
    const goalFile = path.join(goalPath, 'goal.md');
    const milestonesFile = path.join(goalPath, 'milestones.md');
    const tasksFile = path.join(goalPath, 'tasks.md');
    const archivesDir = path.join(goalPath, 'archives');
    const reviewsDir = path.join(goalPath, 'reviews');

    // 读取 goal.md 的状态
    const goalContent = await fs.readFile(goalFile, 'utf-8');
    const parsed = matter(goalContent);
    const status = parsed.data.status;

    // 根据状态和文件判断阶段
    if (status === 'archived') {
      return WorkflowStage.ARCHIVED;
    }

    if (status === 'completed') {
      if (fs.existsSync(reviewsDir) && fs.readdirSync(reviewsDir).length > 0) {
        return WorkflowStage.COMPLETED;
      }
      return WorkflowStage.REVIEW_READY;
    }

    if (fs.existsSync(archivesDir) && fs.readdirSync(archivesDir).length > 0) {
      return WorkflowStage.IN_PROGRESS;
    }

    if (fs.existsSync(tasksFile)) {
      const tasksContent = await fs.readFile(tasksFile, 'utf-8');
      // 检查是否有任务内容（不只是模板）
      if (tasksContent.includes('- [ ]') || tasksContent.includes('- [x]')) {
        return WorkflowStage.TASKS_CREATED;
      }
    }

    // 检查 milestones.md 是否有内容
    const milestonesContent = await fs.readFile(milestonesFile, 'utf-8');
    const milestonesParsed = matter(milestonesContent);
    if (
      milestonesContent.includes('- [ ]') ||
      milestonesContent.includes('- [x]') ||
      (milestonesParsed.data.milestones &&
        milestonesParsed.data.milestones.length > 0)
    ) {
      return WorkflowStage.MILESTONES_DEFINED;
    }

    return WorkflowStage.GOAL_CREATED;
  }

  /**
   * 生成下一步建议
   */
  private generateSuggestions(stage: WorkflowStage, goalPath: string): string[] {
    const suggestions: string[] = [];

    switch (stage) {
      case WorkflowStage.GOAL_CREATED:
        suggestions.push('Define milestones in milestones.md');
        suggestions.push('Break down your goal into smaller, achievable milestones');
        break;

      case WorkflowStage.MILESTONES_DEFINED:
        suggestions.push('Create tasks.md to plan your work');
        suggestions.push('Break down milestones into actionable tasks');
        break;

      case WorkflowStage.TASKS_CREATED:
        suggestions.push('Start working on your tasks');
        suggestions.push('Update task status as you progress');
        break;

      case WorkflowStage.IN_PROGRESS:
        suggestions.push('Continue working on your tasks');
        suggestions.push('Archive completed tasks periodically');
        suggestions.push('Update goal status when all tasks are done');
        break;

      case WorkflowStage.REVIEW_READY:
        suggestions.push('Create a review file to reflect on your progress');
        suggestions.push('Use: opco archive <goal-name> --review <date>');
        break;

      case WorkflowStage.COMPLETED:
        suggestions.push('Consider archiving the goal');
        suggestions.push('Update goal status to "archived" if no longer active');
        break;

      case WorkflowStage.ARCHIVED:
        suggestions.push('Goal is archived. No further action needed.');
        break;

      default:
        suggestions.push('Unknown stage. Please check your goal files.');
    }

    return suggestions;
  }

  /**
   * 检查工作流前置条件
   */
  private checkWorkflowConditions(
    stage: WorkflowStage,
    goalPath: string
  ): { missing: string[] } {
    const missing: string[] = [];

    // 根据阶段检查前置条件
    switch (stage) {
      case WorkflowStage.TASKS_CREATED:
      case WorkflowStage.IN_PROGRESS:
        // 检查是否有任务文件
        if (!fs.existsSync(path.join(goalPath, 'tasks.md'))) {
          missing.push('tasks.md file is required for this stage');
        }
        break;

      case WorkflowStage.REVIEW_READY:
      case WorkflowStage.COMPLETED:
        // 检查是否有归档文件
        const archivesDir = path.join(goalPath, 'archives');
        if (!fs.existsSync(archivesDir) || fs.readdirSync(archivesDir).length === 0) {
          missing.push('At least one archived tasks file is recommended');
        }
        break;

      case WorkflowStage.ARCHIVED:
        // 检查是否有 review 文件
        const reviewsDir = path.join(goalPath, 'reviews');
        if (!fs.existsSync(reviewsDir) || fs.readdirSync(reviewsDir).length === 0) {
          missing.push('At least one review file is recommended for archived goals');
        }
        break;
    }

    return { missing };
  }

  /**
   * 获取特定工作流的前置条件
   */
  private getWorkflowConditions(workflowId: string): Array<{
    type: string;
    description: string;
  }> {
    const conditions: Record<
      string,
      Array<{ type: string; description: string }>
    > = {
      'create-goal': [
        { type: 'file', description: 'goal.md must exist' },
        { type: 'file', description: 'milestones.md must exist' },
      ],
      'create-task': [
        { type: 'file', description: 'goal.md must exist' },
        { type: 'file', description: 'milestones.md must exist' },
        { type: 'content', description: 'Milestones must be defined' },
      ],
      'create-review': [
        { type: 'file', description: 'goal.md must exist' },
        { type: 'status', description: 'Goal status must be "completed"' },
        { type: 'file', description: 'At least one archived tasks file must exist' },
      ],
    };

    return conditions[workflowId] || [];
  }

  /**
   * 检查单个条件
   */
  private checkCondition(
    condition: { type: string; description: string },
    goalPath: string
  ): boolean {
    switch (condition.type) {
      case 'file':
        // 从描述中提取文件名
        const fileMatch = condition.description.match(/(\S+\.md)/);
        if (fileMatch) {
          const fileName = fileMatch[1];
          return fs.existsSync(path.join(goalPath, fileName));
        }
        // 检查 archives 目录
        if (condition.description.includes('archived tasks')) {
          const archivesDir = path.join(goalPath, 'archives');
          return (
            fs.existsSync(archivesDir) && fs.readdirSync(archivesDir).length > 0
          );
        }
        return false;

      case 'status':
        // 检查 goal.md 的状态
        const goalFile = path.join(goalPath, 'goal.md');
        if (fs.existsSync(goalFile)) {
          const content = fs.readFileSync(goalFile, 'utf-8');
          const parsed = matter(content);
          const expectedStatus = condition.description.match(/"(\w+)"/)?.[1];
          return parsed.data.status === expectedStatus;
        }
        return false;

      case 'content':
        // 检查 milestones.md 是否有内容
        if (condition.description.includes('Milestones')) {
          const milestonesFile = path.join(goalPath, 'milestones.md');
          if (fs.existsSync(milestonesFile)) {
            const content = fs.readFileSync(milestonesFile, 'utf-8');
            return (
              content.includes('- [ ]') ||
              content.includes('- [x]') ||
              content.length > 100
            );
          }
        }
        return false;

      default:
        return false;
    }
  }
}
