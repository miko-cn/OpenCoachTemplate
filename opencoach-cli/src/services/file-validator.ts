import * as fs from 'fs-extra';
import * as path from 'path';
import { ValidationIssue } from '../types';
import { PathUtils } from '../utils/path-utils';
import { DirectoryNotFoundError, FileNotFoundError } from '../utils/error-handler';

// 使用 require 导入 gray-matter 以避免 ES 模块兼容性问题
const matter = require('gray-matter') as (
  input: string
) => { data: any; content: string };

/**
 * 文件验证器类
 * 负责检查目标文件的格式和完整性
 */
export class FileValidator {
  private static instance: FileValidator;

  private constructor() {}

  /**
   * 获取 FileValidator 单例
   */
  static getInstance(): FileValidator {
    if (!FileValidator.instance) {
      FileValidator.instance = new FileValidator();
    }
    return FileValidator.instance;
  }

  /**
   * 检查目标目录的文件格式
   * @param goalName 目标名称，如果为空则检查当前目录
   * @returns 验证问题列表
   */
  async checkGoal(goalName?: string): Promise<ValidationIssue[]> {
    const issues: ValidationIssue[] = [];

    // 确定目标目录
    let goalPath: string;
    if (goalName) {
      const goalsDir = PathUtils.getGoalsDir();
      if (!fs.existsSync(goalsDir)) {
        throw new DirectoryNotFoundError('Goals directory not found. Please run "opco init" first.');
      }
      goalPath = path.join(goalsDir, PathUtils.sanitizeFileName(goalName));
      if (!fs.existsSync(goalPath)) {
        throw new DirectoryNotFoundError(`Goal "${goalName}" not found.`);
      }
    } else {
      // 检查当前目录是否为目标目录
      goalPath = process.cwd();
      const goalFile = path.join(goalPath, 'goal.md');
      if (!fs.existsSync(goalFile)) {
        throw new FileNotFoundError(
          'Not in a goal directory. Please specify a goal name or run from a goal directory.'
        );
      }
    }

    // 检查必需文件
    const requiredFiles = ['goal.md', 'milestones.md'];
    for (const file of requiredFiles) {
      const filePath = path.join(goalPath, file);
      if (!fs.existsSync(filePath)) {
        issues.push({
          file,
          type: 'missing_file',
          message: `Required file "${file}" is missing.`,
        });
      } else {
        // 检查文件格式
        const fileIssues = await this.validateFile(filePath, file);
        issues.push(...fileIssues);
      }
    }

    // 检查可选文件（如果存在）
    const optionalFiles = ['tasks.md', 'preferences.md', 'reviews'];
    for (const file of optionalFiles) {
      const filePath = path.join(goalPath, file);
      if (fs.existsSync(filePath)) {
        if (fs.statSync(filePath).isDirectory()) {
          // 检查目录中的文件
          const files = fs.readdirSync(filePath);
          for (const subFile of files) {
            if (subFile.endsWith('.md')) {
              const subFilePath = path.join(filePath, subFile);
              const fileIssues = await this.validateFile(
                subFilePath,
                `${file}/${subFile}`
              );
              issues.push(...fileIssues);
            }
          }
        } else {
          const fileIssues = await this.validateFile(filePath, file);
          issues.push(...fileIssues);
        }
      }
    }

    return issues;
  }

  /**
   * 验证单个文件
   * @param filePath 文件路径
   * @param fileName 文件名（用于错误报告）
   * @returns 验证问题列表
   */
  private async validateFile(filePath: string, fileName: string): Promise<ValidationIssue[]> {
    const issues: ValidationIssue[] = [];

    try {
      const content = await fs.readFile(filePath, 'utf-8');

      // 检查文件是否为空
      if (content.trim().length === 0) {
        issues.push({
          file: fileName,
          type: 'empty_file',
          message: 'File is empty.',
        });
        return issues;
      }

      // 解析 frontmatter
      let parsed: { data: any; content: string };
      try {
        parsed = matter(content);
      } catch (error) {
        issues.push({
          file: fileName,
          line: 1,
          type: 'invalid_frontmatter',
          message: `Invalid YAML frontmatter: ${error instanceof Error ? error.message : 'Unknown error'}`,
        });
        return issues;
      }

      // 检查 frontmatter 必需字段
      const frontmatterIssues = this.validateFrontmatter(parsed.data, fileName);
      issues.push(...frontmatterIssues);

      // 检查日期格式
      const dateIssues = this.validateDates(parsed.data, fileName);
      issues.push(...dateIssues);

      // 检查 Markdown 内容
      const markdownIssues = this.validateMarkdown(parsed.content, fileName);
      issues.push(...markdownIssues);
    } catch (error) {
      issues.push({
        file: fileName,
        type: 'read_error',
        message: `Failed to read file: ${error instanceof Error ? error.message : 'Unknown error'}`,
      });
    }

    return issues;
  }

  /**
   * 验证 frontmatter 必需字段
   */
  private validateFrontmatter(data: any, fileName: string): ValidationIssue[] {
    const issues: ValidationIssue[] = [];

    // goal.md 的必需字段
    if (fileName === 'goal.md') {
      const requiredFields = ['title', 'status', 'created'];
      for (const field of requiredFields) {
        if (!data[field]) {
          issues.push({
            file: fileName,
            type: 'missing_field',
            message: `Required field "${field}" is missing in frontmatter.`,
          });
        }
      }

      // 检查 status 字段的有效值
      if (data.status) {
        const validStatuses = ['active', 'completed', 'paused', 'archived'];
        if (!validStatuses.includes(data.status)) {
          issues.push({
            file: fileName,
            type: 'invalid_value',
            message: `Invalid status "${data.status}". Must be one of: ${validStatuses.join(', ')}.`,
          });
        }
      }
    }

    // milestones.md 的必需字段
    if (fileName === 'milestones.md') {
      if (!data.milestones || !Array.isArray(data.milestones)) {
        issues.push({
          file: fileName,
          type: 'missing_field',
          message: 'Required field "milestones" is missing or not an array in frontmatter.',
        });
      }
    }

    // tasks.md 的必需字段
    if (fileName === 'tasks.md') {
      if (!data.period) {
        issues.push({
          file: fileName,
          type: 'missing_field',
          message: 'Required field "period" is missing in frontmatter.',
        });
      } else {
        // 验证 period 格式（YYYY-MM-DD to YYYY-MM-DD）
        const periodRegex = /^\d{4}-\d{2}-\d{2}\s+to\s+\d{4}-\d{2}-\d{2}$/;
        if (!periodRegex.test(data.period)) {
          issues.push({
            file: fileName,
            type: 'invalid_value',
            message: `Invalid period format "${data.period}". Expected format: YYYY-MM-DD to YYYY-MM-DD.`,
          });
        }
      }
    }

    // review.md 的必需字段（在 reviews/ 目录下）
    if (fileName.startsWith('reviews/') && fileName.endsWith('.md')) {
      const requiredFields = ['date', 'goal', 'period'];
      for (const field of requiredFields) {
        if (!data[field]) {
          issues.push({
            file: fileName,
            type: 'missing_field',
            message: `Required field "${field}" is missing in frontmatter.`,
          });
        }
      }
    }

    return issues;
  }

  /**
   * 验证日期格式
   */
  private validateDates(data: any, fileName: string): ValidationIssue[] {
    const issues: ValidationIssue[] = [];
    const dateFields = ['created', 'updated', 'deadline', 'completed', 'date'];
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;

    for (const field of dateFields) {
      if (data[field]) {
        const value = String(data[field]);
        if (!dateRegex.test(value)) {
          issues.push({
            file: fileName,
            type: 'invalid_date_format',
            message: `Field "${field}" has invalid date format "${value}". Expected format: YYYY-MM-DD.`,
          });
        } else {
          // 检查日期是否有效
          const date = new Date(value);
          if (isNaN(date.getTime())) {
            issues.push({
              file: fileName,
              type: 'invalid_date',
              message: `Field "${field}" has invalid date "${value}".`,
            });
          }
        }
      }
    }

    return issues;
  }

  /**
   * 验证 Markdown 内容
   */
  private validateMarkdown(content: string, fileName: string): ValidationIssue[] {
    const issues: ValidationIssue[] = [];
    const lines = content.split('\n');

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const lineNumber = i + 1;

      // 检查标题格式（# 后面应该有空格）
      if (line.match(/^#{1,6}[^#\s]/)) {
        issues.push({
          file: fileName,
          line: lineNumber,
          type: 'markdown_syntax',
          message: 'Heading should have a space after "#".',
        });
      }

      // 检查列表格式（- 或 * 后面应该有空格）
      if (line.match(/^[\s]*[-*][^\s]/)) {
        issues.push({
          file: fileName,
          line: lineNumber,
          type: 'markdown_syntax',
          message: 'List item should have a space after "-" or "*".',
        });
      }
    }

    // tasks.md 特定验证
    if (fileName === 'tasks.md') {
      const tasksIssues = this.validateTasksContent(content, fileName);
      issues.push(...tasksIssues);
    }

    // review.md 特定验证
    if (fileName.startsWith('reviews/') && fileName.endsWith('.md')) {
      const reviewIssues = this.validateReviewContent(content, fileName);
      issues.push(...reviewIssues);
    }

    return issues;
  }

  /**
   * 验证 tasks.md 的内容
   */
  private validateTasksContent(content: string, fileName: string): ValidationIssue[] {
    const issues: ValidationIssue[] = [];

    // 检查是否有任务列表
    const hasTaskList = content.includes('- [ ]') || content.includes('- [x]');
    if (!hasTaskList) {
      issues.push({
        file: fileName,
        type: 'missing_content',
        message: 'No task items found. Expected format: "- [ ] Task description" or "- [x] Task description".',
      });
    }

    return issues;
  }

  /**
   * 验证 review.md 的内容
   */
  private validateReviewContent(content: string, fileName: string): ValidationIssue[] {
    const issues: ValidationIssue[] = [];

    // 检查必需的章节标题
    const requiredSections = [
      '## 完成情况',
      '## 成就与亮点',
      '## 挑战与困难',
      '## 经验教训',
      '## 下一步计划',
    ];

    for (const section of requiredSections) {
      if (!content.includes(section)) {
        issues.push({
          file: fileName,
          type: 'missing_content',
          message: `Required section "${section}" is missing.`,
        });
      }
    }

    return issues;
  }

  /**
   * 尝试自动修复文件格式问题
   * @param goalName 目标名称
   * @returns 修复的问题数量
   */
  async fixGoal(goalName?: string): Promise<number> {
    const issues = await this.checkGoal(goalName);
    let fixedCount = 0;

    // 确定目标目录
    let goalPath: string;
    if (goalName) {
      const goalsDir = PathUtils.getGoalsDir();
      goalPath = path.join(goalsDir, PathUtils.sanitizeFileName(goalName));
    } else {
      goalPath = process.cwd();
    }

    // 按文件分组问题
    const issuesByFile = new Map<string, ValidationIssue[]>();
    for (const issue of issues) {
      if (!issuesByFile.has(issue.file)) {
        issuesByFile.set(issue.file, []);
      }
      issuesByFile.get(issue.file)!.push(issue);
    }

    // 修复每个文件
    for (const [fileName, fileIssues] of issuesByFile) {
      const filePath = path.join(goalPath, fileName);
      if (!fs.existsSync(filePath)) {
        continue;
      }

      try {
        const content = await fs.readFile(filePath, 'utf-8');
        let fixedContent = content;
        let fileFixedCount = 0;

        // 修复 Markdown 语法问题
        for (const issue of fileIssues) {
          if (issue.type === 'markdown_syntax') {
            if (issue.message.includes('Heading')) {
              // 修复标题格式
              fixedContent = fixedContent.replace(/^(#{1,6})([^#\s])/gm, '$1 $2');
              fileFixedCount++;
            } else if (issue.message.includes('List item')) {
              // 修复列表格式
              fixedContent = fixedContent.replace(/^([\s]*[-*])([^\s])/gm, '$1 $2');
              fileFixedCount++;
            }
          }
        }

        // 如果有修复，保存文件
        if (fileFixedCount > 0) {
          await fs.writeFile(filePath, fixedContent, 'utf-8');
          fixedCount += fileFixedCount;
        }
      } catch (error) {
        // 忽略修复错误
      }
    }

    return fixedCount;
  }
}

/**
 * 重置 FileValidator 单例（用于测试）
 */
export function resetFileValidator(): void {
  (FileValidator as any).instance = undefined;
}