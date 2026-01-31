import * as fs from 'fs-extra';
import * as path from 'path';
import matter from 'gray-matter';
import { GoalMetadata } from '../types';
import { PathUtils } from '../utils/path-utils';
import { FileNotFoundError, DirectoryNotFoundError, ValidationError } from '../utils/error-handler';

// 使用 require 导入 uuid 以避免 Jest 的 ES 模块问题
const { v4: uuidv4 } = require('uuid');

/**
 * 目标管理器
 * 负责目标的创建、列表、查看等操作
 */
export class GoalManager {
  private static instance: GoalManager;

  private constructor() {}

  /**
   * 获取 GoalManager 单例
   */
  public static getInstance(): GoalManager {
    if (!GoalManager.instance) {
      GoalManager.instance = new GoalManager();
    }
    return GoalManager.instance;
  }

  /**
   * 创建新目标
   * @param name 目标名称
   * @param options 创建选项
   */
  public async createGoal(
    name: string,
    options: {
      withPreferences?: boolean;
      title?: string;
      description?: string;
    } = {}
  ): Promise<{ goalPath: string; goalId: string }> {
    // 检查 goals 目录是否存在
    const goalsDir = PathUtils.getGoalsDir();
    if (!fs.existsSync(goalsDir)) {
      throw new DirectoryNotFoundError(
        `Goals directory not found: ${goalsDir}. Please run 'opco init' first.`
      );
    }

    // 安全化文件名
    const safeName = PathUtils.sanitizeFileName(name);
    const goalPath = path.join(goalsDir, safeName);

    // 检查目标是否已存在
    if (fs.existsSync(goalPath)) {
      throw new ValidationError(`Goal already exists: ${safeName}`);
    }

    // 创建目标目录
    await fs.ensureDir(goalPath);

    // 生成目标 ID
    const goalId = uuidv4();
    const now = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

    // 复制模板文件
    const templatesDir = PathUtils.getTemplatesDir();
    
    // 复制 goal.md
    const goalTemplate = path.join(templatesDir, 'goal.md');
    const goalFile = path.join(goalPath, 'goal.md');
    
    if (fs.existsSync(goalTemplate)) {
      let content = await fs.readFile(goalTemplate, 'utf-8');
      
      // 替换模板变量
      content = content
        .replace(/\[auto-generated-uuid\]/g, goalId)
        .replace(/\[YYYY-MM-DD\]/g, now)
        .replace(/\[目标标题\]/g, options.title || name);
      
      if (options.description) {
        content = content.replace(
          /\[在这里详细描述你想要实现的目标\]/,
          options.description
        );
      }
      
      await fs.writeFile(goalFile, content, 'utf-8');
    } else {
      // 如果模板不存在，创建基本的 goal.md
      const basicContent = this.createBasicGoalContent(goalId, now, options.title || name);
      await fs.writeFile(goalFile, basicContent, 'utf-8');
    }

    // 复制 milestones.md
    const milestonesTemplate = path.join(templatesDir, 'milestones.md');
    const milestonesFile = path.join(goalPath, 'milestones.md');
    
    if (fs.existsSync(milestonesTemplate)) {
      let content = await fs.readFile(milestonesTemplate, 'utf-8');
      content = content
        .replace(/\[auto-generated-uuid\]/g, uuidv4())
        .replace(/\[linked-goal-uuid\]/g, goalId)
        .replace(/\[YYYY-MM-DD\]/g, now)
        .replace(/\[目标标题\]/g, options.title || name);
      
      await fs.writeFile(milestonesFile, content, 'utf-8');
    }

    // 复制 tasks.md
    const tasksTemplate = path.join(templatesDir, 'tasks.md');
    const tasksFile = path.join(goalPath, 'tasks.md');
    
    if (fs.existsSync(tasksTemplate)) {
      let content = await fs.readFile(tasksTemplate, 'utf-8');
      content = content
        .replace(/\[auto-generated-uuid\]/g, uuidv4())
        .replace(/\[linked-goal-uuid\]/g, goalId)
        .replace(/\[YYYY-MM-DD\]/g, now)
        .replace(/\[目标标题\]/g, options.title || name);
      
      await fs.writeFile(tasksFile, content, 'utf-8');
    }

    // 如果指定了 --with-preferences，复制 preferences.md
    if (options.withPreferences) {
      const preferencesTemplate = path.join(templatesDir, 'preferences.md');
      const preferencesFile = path.join(goalPath, 'preferences.md');
      
      if (fs.existsSync(preferencesTemplate)) {
        let content = await fs.readFile(preferencesTemplate, 'utf-8');
        content = content
          .replace(/\[auto-generated-uuid\]/g, uuidv4())
          .replace(/\[linked-goal-uuid\]/g, goalId)
          .replace(/\[YYYY-MM-DD\]/g, now)
          .replace(/\[目标标题\]/g, options.title || name);
        
        await fs.writeFile(preferencesFile, content, 'utf-8');
      }
    }

    return { goalPath, goalId };
  }

  /**
   * 列出所有目标
   * @param options 列表选项
   */
  public async listGoals(options: {
    active?: boolean;
    completed?: boolean;
  } = {}): Promise<GoalMetadata[]> {
    const goalsDir = PathUtils.getGoalsDir();
    
    if (!fs.existsSync(goalsDir)) {
      throw new DirectoryNotFoundError(
        `Goals directory not found: ${goalsDir}. Please run 'opco init' first.`
      );
    }

    const entries = await fs.readdir(goalsDir, { withFileTypes: true });
    const goals: GoalMetadata[] = [];

    for (const entry of entries) {
      if (entry.isDirectory()) {
        const goalPath = path.join(goalsDir, entry.name);
        const goalFile = path.join(goalPath, 'goal.md');

        if (fs.existsSync(goalFile)) {
          try {
            const metadata = await this.getGoalMetadata(entry.name);
            
            // 根据过滤条件筛选
            if (options.active && metadata.status !== 'active') {
              continue;
            }
            if (options.completed && metadata.status !== 'completed') {
              continue;
            }
            
            goals.push(metadata);
          } catch (error) {
            // 跳过无法解析的目标
            continue;
          }
        }
      }
    }

    // 按创建时间排序（最新的在前）
    goals.sort((a, b) => {
      const dateA = new Date(a.created).getTime();
      const dateB = new Date(b.created).getTime();
      return dateB - dateA;
    });

    return goals;
  }

  /**
   * 获取目标元数据
   * @param goalName 目标名称
   */
  public async getGoalMetadata(goalName: string): Promise<GoalMetadata> {
    const goalsDir = PathUtils.getGoalsDir();
    const goalPath = path.join(goalsDir, goalName);
    const goalFile = path.join(goalPath, 'goal.md');

    if (!fs.existsSync(goalFile)) {
      throw new FileNotFoundError(`Goal file not found: ${goalFile}`);
    }

    const content = await fs.readFile(goalFile, 'utf-8');
    const parsed = matter(content);
    const frontmatter = parsed.data;

    // 提取标题（从第一个 # 标题）
    const titleMatch = parsed.content.match(/^#\s+(.+)$/m);
    const title = titleMatch ? titleMatch[1].trim() : goalName;

    // 提取描述（从目标描述部分）
    const descMatch = parsed.content.match(/##\s+目标描述\s+\n\s*(.+)/);
    const description = descMatch ? descMatch[1].trim() : undefined;

    return {
      name: goalName,
      title,
      status: frontmatter.status || 'unknown',
      created: frontmatter.created_at || frontmatter.created || 'unknown',
      updated: frontmatter.last_updated || frontmatter.updated,
      deadline: frontmatter.deadline,
      description,
    };
  }

  /**
   * 查看目标详情
   * @param goalName 目标名称
   */
  public async viewGoal(goalName: string): Promise<{
    metadata: GoalMetadata;
    content: string;
    files: string[];
  }> {
    const goalsDir = PathUtils.getGoalsDir();
    const goalPath = path.join(goalsDir, goalName);

    if (!fs.existsSync(goalPath)) {
      throw new DirectoryNotFoundError(`Goal not found: ${goalName}`);
    }

    const goalFile = path.join(goalPath, 'goal.md');
    if (!fs.existsSync(goalFile)) {
      throw new FileNotFoundError(`Goal file not found: ${goalFile}`);
    }

    // 获取元数据
    const metadata = await this.getGoalMetadata(goalName);

    // 读取内容
    const content = await fs.readFile(goalFile, 'utf-8');

    // 列出所有文件
    const entries = await fs.readdir(goalPath);
    const files = entries.filter(file => file.endsWith('.md'));

    return { metadata, content, files };
  }

  /**
   * 检查目标是否存在
   * @param goalName 目标名称
   */
  public async goalExists(goalName: string): Promise<boolean> {
    const goalsDir = PathUtils.getGoalsDir();
    const goalPath = path.join(goalsDir, goalName);
    const goalFile = path.join(goalPath, 'goal.md');
    
    return fs.existsSync(goalFile);
  }

  /**
   * 创建基本的 goal.md 内容（当模板不存在时）
   */
  private createBasicGoalContent(goalId: string, date: string, title: string): string {
    return `---
goal_id: "${goalId}"
created_at: "${date}"
last_updated: "${date}"
status: "active"
workflow_state: "planning"
version: "1.0"
---

# ${title} - 目标详情

## 目标描述

[在这里详细描述你想要实现的目标]

---

## 为什么重要

**对我的意义**：[这个目标为什么对你重要]

**实现后的改变**：
- [改变1]
- [改变2]
- [改变3]

---

## 成功标准

✓ [标准1：具体可验证]
✓ [标准2：具体可验证]
✓ [标准3：具体可验证]

---

## 可能的挑战

- **[挑战1]**：[描述] → [应对策略]
- **[挑战2]**：[描述] → [应对策略]

---

## 时间框架

- **开始时间**：${date}
- **目标完成时间**：[YYYY-MM-DD]
- **检查点**：[定期检查的时间点]
`;
  }
}

/**
 * 重置 GoalManager 单例（仅用于测试）
 */
export function resetGoalManager(): void {
  (GoalManager as any).instance = undefined;
}
