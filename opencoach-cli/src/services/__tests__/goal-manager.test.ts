import * as fs from 'fs-extra';
import * as path from 'path';
import { GoalManager, resetGoalManager } from '../goal-manager';
import { PathUtils } from '../../utils/path-utils';

// Mock uuid 模块 - 每次调用返回不同的 UUID
let uuidCounter = 0;
jest.mock('uuid', () => ({
  v4: jest.fn(() => {
    uuidCounter++;
    return `test-uuid-${uuidCounter.toString().padStart(4, '0')}-${Date.now()}`;
  }),
}));

describe('GoalManager', () => {
  let tempDir: string;
  let goalManager: GoalManager;

  beforeEach(() => {
    // 创建临时测试目录 - 使用更唯一的名称
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(7);
    tempDir = path.join(__dirname, `test-goal-${timestamp}-${random}`);
    fs.ensureDirSync(tempDir);

    // 切换到临时目录
    process.chdir(tempDir);

    // 重置 GoalManager 单例
    resetGoalManager();
    goalManager = GoalManager.getInstance();

    // 创建必要的目录结构
    const goalsDir = PathUtils.getGoalsDir();
    const templatesDir = PathUtils.getTemplatesDir();
    fs.ensureDirSync(goalsDir);
    fs.ensureDirSync(templatesDir);

    // 创建模板文件
    createTemplateFiles(templatesDir);
  });

  afterEach(() => {
    // 切换回原目录
    process.chdir(__dirname);

    // 清理临时目录
    try {
      if (fs.existsSync(tempDir)) {
        fs.removeSync(tempDir);
      }
    } catch (error) {
      // 忽略清理错误
      console.warn(`Failed to clean up ${tempDir}:`, error);
    }
    resetGoalManager();
  });

  describe('createGoal', () => {
    it('should create a new goal with basic files', async () => {
      const result = await goalManager.createGoal('my-first-goal');

      expect(result.goalPath).toContain('my-first-goal');
      expect(result.goalId).toBeTruthy();
      expect(result.goalId).toContain('test-uuid'); // 使用我们的 mock UUID 格式

      // 检查目录是否创建
      expect(fs.existsSync(result.goalPath)).toBe(true);

      // 检查文件是否创建
      expect(fs.existsSync(path.join(result.goalPath, 'goal.md'))).toBe(true);
      expect(fs.existsSync(path.join(result.goalPath, 'milestones.md'))).toBe(true);
      expect(fs.existsSync(path.join(result.goalPath, 'tasks.md'))).toBe(true);
      expect(fs.existsSync(path.join(result.goalPath, 'preferences.md'))).toBe(false);
    });

    it('should create goal with preferences when specified', async () => {
      const result = await goalManager.createGoal('my-goal-with-prefs', {
        withPreferences: true,
      });

      expect(fs.existsSync(path.join(result.goalPath, 'preferences.md'))).toBe(true);
    });

    it('should create goal with custom title and description', async () => {
      const result = await goalManager.createGoal('my-custom-goal', {
        title: 'My Custom Title',
        description: 'This is a custom description',
      });

      const goalFile = path.join(result.goalPath, 'goal.md');
      const content = await fs.readFile(goalFile, 'utf-8');

      expect(content).toContain('My Custom Title');
      expect(content).toContain('This is a custom description');
    });

    it('should sanitize goal name', async () => {
      const result = await goalManager.createGoal('My Goal With Spaces!');

      expect(result.goalPath).toContain('my-goal-with-spaces');
      expect(result.goalPath).not.toContain('!');
      expect(result.goalPath).not.toContain(' ');
    });

    it('should throw error if goal already exists', async () => {
      await goalManager.createGoal('existing-goal');

      await expect(goalManager.createGoal('existing-goal')).rejects.toThrow(
        'Goal already exists'
      );
    });

    it('should throw error if goals directory does not exist', async () => {
      const goalsDir = PathUtils.getGoalsDir();
      fs.removeSync(goalsDir);

      await expect(goalManager.createGoal('no-dir-goal')).rejects.toThrow(
        'Goals directory not found'
      );
    });
  });

  describe('listGoals', () => {
    beforeEach(async () => {
      // 创建几个测试目标
      await goalManager.createGoal('goal-1', { title: 'Goal 1' });
      await goalManager.createGoal('goal-2', { title: 'Goal 2' });
      await goalManager.createGoal('goal-3', { title: 'Goal 3' });

      // 修改其中一个目标的状态为 completed
      const goal2Path = path.join(PathUtils.getGoalsDir(), 'goal-2', 'goal.md');
      let content = await fs.readFile(goal2Path, 'utf-8');
      content = content.replace('status: "active"', 'status: "completed"');
      await fs.writeFile(goal2Path, content, 'utf-8');
    });

    it('should list all goals', async () => {
      const goals = await goalManager.listGoals();

      expect(goals).toHaveLength(3);
      // 按创建时间排序，最新的在前
      // 由于创建时间可能相同，只检查数量和名称存在
      const goalNames = goals.map(g => g.name).sort();
      expect(goalNames).toEqual(['goal-1', 'goal-2', 'goal-3']);
    });

    it('should filter active goals', async () => {
      const goals = await goalManager.listGoals({ active: true });

      expect(goals).toHaveLength(2);
      expect(goals.every(g => g.status === 'active')).toBe(true);
    });

    it('should filter completed goals', async () => {
      const goals = await goalManager.listGoals({ completed: true });

      expect(goals).toHaveLength(1);
      expect(goals[0].status).toBe('completed');
      expect(goals[0].name).toBe('goal-2');
    });

    it('should return empty array if no goals exist', async () => {
      // 删除所有目标
      const goalsDir = PathUtils.getGoalsDir();
      fs.emptyDirSync(goalsDir);

      const goals = await goalManager.listGoals();

      expect(goals).toHaveLength(0);
    });

    it('should throw error if goals directory does not exist', async () => {
      const goalsDir = PathUtils.getGoalsDir();
      fs.removeSync(goalsDir);

      await expect(goalManager.listGoals()).rejects.toThrow(
        'Goals directory not found'
      );
    });
  });

  describe('getGoalMetadata', () => {
    beforeEach(async () => {
      await goalManager.createGoal('metadata-test-goal', {
        title: 'Test Goal',
        description: 'Test description',
      });
    });

    it('should get goal metadata', async () => {
      const metadata = await goalManager.getGoalMetadata('metadata-test-goal');

      expect(metadata.name).toBe('metadata-test-goal');
      expect(metadata.title).toContain('Test Goal');
      expect(metadata.status).toBe('active');
      expect(metadata.created).toBeTruthy();
    });

    it('should throw error if goal file does not exist', async () => {
      await expect(goalManager.getGoalMetadata('non-existent')).rejects.toThrow(
        'Goal file not found'
      );
    });
  });

  describe('viewGoal', () => {
    beforeEach(async () => {
      await goalManager.createGoal('view-test-goal', {
        title: 'Test Goal',
        withPreferences: true,
      });
    });

    it('should view goal details', async () => {
      const result = await goalManager.viewGoal('view-test-goal');

      expect(result.metadata.name).toBe('view-test-goal');
      expect(result.content).toBeTruthy();
      expect(result.files).toContain('goal.md');
      expect(result.files).toContain('milestones.md');
      expect(result.files).toContain('tasks.md');
      expect(result.files).toContain('preferences.md');
    });

    it('should throw error if goal does not exist', async () => {
      await expect(goalManager.viewGoal('non-existent')).rejects.toThrow(
        'Goal not found'
      );
    });

    it('should throw error if goal file does not exist', async () => {
      // 创建目录但不创建 goal.md
      const goalPath = path.join(PathUtils.getGoalsDir(), 'empty-goal');
      fs.ensureDirSync(goalPath);

      await expect(goalManager.viewGoal('empty-goal')).rejects.toThrow(
        'Goal file not found'
      );
    });
  });

  describe('goalExists', () => {
    beforeEach(async () => {
      await goalManager.createGoal('exists-test-goal');
    });

    it('should return true if goal exists', async () => {
      const exists = await goalManager.goalExists('exists-test-goal');
      expect(exists).toBe(true);
    });

    it('should return false if goal does not exist', async () => {
      const exists = await goalManager.goalExists('non-existent');
      expect(exists).toBe(false);
    });
  });

  describe('singleton pattern', () => {
    it('should return the same instance', () => {
      const instance1 = GoalManager.getInstance();
      const instance2 = GoalManager.getInstance();

      expect(instance1).toBe(instance2);
    });

    it('should reset instance', () => {
      const instance1 = GoalManager.getInstance();
      resetGoalManager();
      const instance2 = GoalManager.getInstance();

      expect(instance1).not.toBe(instance2);
    });
  });
});

/**
 * 创建模板文件
 */
function createTemplateFiles(templatesDir: string): void {
  // goal.md 模板
  const goalTemplate = `---
goal_id: "[auto-generated-uuid]"
created_at: "[YYYY-MM-DD]"
last_updated: "[YYYY-MM-DD]"
status: "active"
workflow_state: "planning"
version: "1.0"
---

# [目标标题] - 目标详情

## 目标描述

[在这里详细描述你想要实现的目标]
`;

  // milestones.md 模板
  const milestonesTemplate = `---
milestone_list_id: "[auto-generated-uuid]"
goal_id: "[linked-goal-uuid]"
created_at: "[YYYY-MM-DD]"
last_updated: "[YYYY-MM-DD]"
version: "1.0"
---

# [目标标题] - 里程碑和时间节点
`;

  // tasks.md 模板
  const tasksTemplate = `---
task_list_id: "[auto-generated-uuid]"
goal_id: "[linked-goal-uuid]"
created_at: "[YYYY-MM-DD]"
last_updated: "[YYYY-MM-DD]"
version: "1.0"
---

# [目标标题] - 任务列表
`;

  // preferences.md 模板
  const preferencesTemplate = `---
preferences_id: "[auto-generated-uuid]"
goal_id: "[linked-goal-uuid]"
created_at: "[YYYY-MM-DD]"
last_updated: "[YYYY-MM-DD]"
version: "1.0"
---

# [目标标题] - 用户偏好设置
`;

  fs.writeFileSync(path.join(templatesDir, 'goal.md'), goalTemplate);
  fs.writeFileSync(path.join(templatesDir, 'milestones.md'), milestonesTemplate);
  fs.writeFileSync(path.join(templatesDir, 'tasks.md'), tasksTemplate);
  fs.writeFileSync(path.join(templatesDir, 'preferences.md'), preferencesTemplate);
}
