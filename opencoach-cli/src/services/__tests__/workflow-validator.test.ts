import * as fs from 'fs-extra';
import * as path from 'path';
import { WorkflowValidator, WorkflowStage } from '../workflow-validator';

describe('WorkflowValidator', () => {
  let tempDir: string;
  let goalsDir: string;

  beforeEach(() => {
    // 创建临时测试目录
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(7);
    tempDir = path.join(__dirname, `test-workflow-${timestamp}-${random}`);
    fs.ensureDirSync(tempDir);
    goalsDir = path.join(tempDir, 'goals');
    fs.ensureDirSync(goalsDir);

    // 切换到临时目录
    process.chdir(tempDir);
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
      console.warn(`Failed to clean up ${tempDir}:`, error);
    }
  });

  describe('singleton pattern', () => {
    it('should return the same instance', () => {
      const instance1 = WorkflowValidator.getInstance();
      const instance2 = WorkflowValidator.getInstance();
      expect(instance1).toBe(instance2);
    });
  });

  describe('validateGoal', () => {
    it('should detect missing required files', async () => {
      // 创建目标目录但不创建文件
      const goalPath = path.join(goalsDir, 'test-goal');
      fs.ensureDirSync(goalPath);

      const validator = WorkflowValidator.getInstance();
      const result = await validator.validateGoal('test-goal');

      expect(result.isValid).toBe(false);
      expect(result.missingFiles).toContain('goal.md');
      expect(result.missingFiles).toContain('milestones.md');
      expect(result.suggestions.length).toBeGreaterThan(0);
    });

    it('should detect GOAL_CREATED stage', async () => {
      // 创建基本的目标文件
      const goalPath = path.join(goalsDir, 'test-goal-2');
      fs.ensureDirSync(goalPath);

      const goalContent = `---
title: Test Goal
status: active
created: '2024-01-01'
---

# Test Goal

This is a test goal with some description.`;
      fs.writeFileSync(path.join(goalPath, 'goal.md'), goalContent);

      const milestonesContent = `---
title: Milestones
---

# Milestones

This is the milestones file.`;
      fs.writeFileSync(path.join(goalPath, 'milestones.md'), milestonesContent);

      const validator = WorkflowValidator.getInstance();
      const result = await validator.validateGoal('test-goal-2');

      expect(result.stage).toBe(WorkflowStage.GOAL_CREATED);
      expect(result.suggestions).toContain('Define milestones in milestones.md');
    });

    it('should detect MILESTONES_DEFINED stage', async () => {
      // 创建带里程碑的目标
      const goalPath = path.join(goalsDir, 'test-goal-3');
      fs.ensureDirSync(goalPath);

      const goalContent = `---
title: Test Goal
status: active
created: '2024-01-01'
---

# Test Goal

This is a test goal with some description.`;
      fs.writeFileSync(path.join(goalPath, 'goal.md'), goalContent);

      const milestonesContent = `---
title: Milestones
---

# Milestones

- [ ] Milestone 1
- [ ] Milestone 2`;
      fs.writeFileSync(path.join(goalPath, 'milestones.md'), milestonesContent);

      const validator = WorkflowValidator.getInstance();
      const result = await validator.validateGoal('test-goal-3');

      expect(result.stage).toBe(WorkflowStage.MILESTONES_DEFINED);
      expect(result.suggestions).toContain('Create tasks.md to plan your work');
    });

    it('should detect TASKS_CREATED stage', async () => {
      // 创建带任务的目标
      const goalPath = path.join(goalsDir, 'test-goal-4');
      fs.ensureDirSync(goalPath);

      const goalContent = `---
title: Test Goal
status: active
created: '2024-01-01'
---

# Test Goal

This is a test goal with some description.`;
      fs.writeFileSync(path.join(goalPath, 'goal.md'), goalContent);

      const milestonesContent = `---
title: Milestones
---

# Milestones

- [ ] Milestone 1`;
      fs.writeFileSync(path.join(goalPath, 'milestones.md'), milestonesContent);

      const tasksContent = `---
period: 2024-01-01 to 2024-01-31
---

# Tasks

- [ ] Task 1
- [ ] Task 2`;
      fs.writeFileSync(path.join(goalPath, 'tasks.md'), tasksContent);

      const validator = WorkflowValidator.getInstance();
      const result = await validator.validateGoal('test-goal-4');

      expect(result.stage).toBe(WorkflowStage.TASKS_CREATED);
      expect(result.suggestions).toContain('Start working on your tasks');
    });

    it('should detect IN_PROGRESS stage', async () => {
      // 创建有归档文件的目标
      const goalPath = path.join(goalsDir, 'test-goal-5');
      fs.ensureDirSync(goalPath);
      fs.ensureDirSync(path.join(goalPath, 'archives'));

      const goalContent = `---
title: Test Goal
status: active
created: '2024-01-01'
---

# Test Goal

This is a test goal with some description.`;
      fs.writeFileSync(path.join(goalPath, 'goal.md'), goalContent);

      const milestonesContent = `---
title: Milestones
---

# Milestones

- [x] Milestone 1`;
      fs.writeFileSync(path.join(goalPath, 'milestones.md'), milestonesContent);

      // 创建归档文件
      fs.writeFileSync(
        path.join(goalPath, 'archives', 'tasks-2024-01-15.md'),
        'Archived tasks'
      );

      const validator = WorkflowValidator.getInstance();
      const result = await validator.validateGoal('test-goal-5');

      expect(result.stage).toBe(WorkflowStage.IN_PROGRESS);
      expect(result.suggestions).toContain('Continue working on your tasks');
    });

    it('should detect REVIEW_READY stage', async () => {
      // 创建已完成但没有 review 的目标
      const goalPath = path.join(goalsDir, 'test-goal-6');
      fs.ensureDirSync(goalPath);

      const goalContent = `---
title: Test Goal
status: completed
created: '2024-01-01'
---

# Test Goal

This is a test goal with some description.`;
      fs.writeFileSync(path.join(goalPath, 'goal.md'), goalContent);

      const milestonesContent = `---
title: Milestones
---

# Milestones

- [x] Milestone 1`;
      fs.writeFileSync(path.join(goalPath, 'milestones.md'), milestonesContent);

      const validator = WorkflowValidator.getInstance();
      const result = await validator.validateGoal('test-goal-6');

      expect(result.stage).toBe(WorkflowStage.REVIEW_READY);
      expect(result.suggestions).toContain('Create a review file to reflect on your progress');
    });

    it('should detect COMPLETED stage', async () => {
      // 创建已完成且有 review 的目标
      const goalPath = path.join(goalsDir, 'test-goal-7');
      fs.ensureDirSync(goalPath);
      fs.ensureDirSync(path.join(goalPath, 'reviews'));

      const goalContent = `---
title: Test Goal
status: completed
created: '2024-01-01'
---

# Test Goal

This is a test goal with some description.`;
      fs.writeFileSync(path.join(goalPath, 'goal.md'), goalContent);

      const milestonesContent = `---
title: Milestones
---

# Milestones

- [x] Milestone 1`;
      fs.writeFileSync(path.join(goalPath, 'milestones.md'), milestonesContent);

      // 创建 review 文件
      fs.writeFileSync(
        path.join(goalPath, 'reviews', '2024-01-31.md'),
        'Review content'
      );

      const validator = WorkflowValidator.getInstance();
      const result = await validator.validateGoal('test-goal-7');

      expect(result.stage).toBe(WorkflowStage.COMPLETED);
      expect(result.suggestions).toContain('Consider archiving the goal');
    });

    it('should detect ARCHIVED stage', async () => {
      // 创建已归档的目标
      const goalPath = path.join(goalsDir, 'test-goal-8');
      fs.ensureDirSync(goalPath);

      const goalContent = `---
title: Test Goal
status: archived
created: '2024-01-01'
---

# Test Goal

This is a test goal with some description.`;
      fs.writeFileSync(path.join(goalPath, 'goal.md'), goalContent);

      const milestonesContent = `---
title: Milestones
---

# Milestones

- [x] Milestone 1`;
      fs.writeFileSync(path.join(goalPath, 'milestones.md'), milestonesContent);

      const validator = WorkflowValidator.getInstance();
      const result = await validator.validateGoal('test-goal-8');

      expect(result.stage).toBe(WorkflowStage.ARCHIVED);
      expect(result.suggestions).toContain('Goal is archived. No further action needed.');
    });

    it('should detect format issues', async () => {
      // 创建有格式问题的目标
      const goalPath = path.join(goalsDir, 'test-goal-9');
      fs.ensureDirSync(goalPath);

      // 缺少必需字段
      const goalContent = `---
title: Test Goal
---

# Test Goal`;
      fs.writeFileSync(path.join(goalPath, 'goal.md'), goalContent);

      const milestonesContent = `---
title: Milestones
---

# Milestones`;
      fs.writeFileSync(path.join(goalPath, 'milestones.md'), milestonesContent);

      const validator = WorkflowValidator.getInstance();
      const result = await validator.validateGoal('test-goal-9');

      expect(result.isValid).toBe(false);
      expect(result.issues.length).toBeGreaterThan(0);
      expect(result.suggestions).toContain('Fix format issues using: opco check test-goal-9 --fix');
    });
  });

  describe('validateWorkflow', () => {
    it('should validate create-goal workflow', async () => {
      // 创建完整的目标
      const goalPath = path.join(goalsDir, 'test-goal-10');
      fs.ensureDirSync(goalPath);

      const goalContent = `---
title: Test Goal
status: active
created: '2024-01-01'
---

# Test Goal

This is a test goal.`;
      fs.writeFileSync(path.join(goalPath, 'goal.md'), goalContent);

      const milestonesContent = `---
title: Milestones
milestones: []
---

# Milestones

This is the milestones file.`;
      fs.writeFileSync(path.join(goalPath, 'milestones.md'), milestonesContent);

      const validator = WorkflowValidator.getInstance();
      const result = await validator.validateWorkflow('test-goal-10', 'create-goal');

      expect(result.isValid).toBe(true);
      expect(result.missingConditions.length).toBe(0);
    });

    it('should validate create-task workflow', async () => {
      // 创建带里程碑的目标
      const goalPath = path.join(goalsDir, 'test-goal-11');
      fs.ensureDirSync(goalPath);

      const goalContent = `---
title: Test Goal
status: active
created: '2024-01-01'
---

# Test Goal

This is a test goal.`;
      fs.writeFileSync(path.join(goalPath, 'goal.md'), goalContent);

      const milestonesContent = `---
title: Milestones
milestones: []
---

# Milestones

- [ ] Milestone 1`;
      fs.writeFileSync(path.join(goalPath, 'milestones.md'), milestonesContent);

      const validator = WorkflowValidator.getInstance();
      const result = await validator.validateWorkflow('test-goal-11', 'create-task');

      expect(result.isValid).toBe(true);
    });

    it('should fail create-review workflow without completed status', async () => {
      // 创建未完成的目标
      const goalPath = path.join(goalsDir, 'test-goal-12');
      fs.ensureDirSync(goalPath);

      const goalContent = `---
title: Test Goal
status: active
created: '2024-01-01'
---

# Test Goal`;
      fs.writeFileSync(path.join(goalPath, 'goal.md'), goalContent);

      const milestonesContent = `---
title: Milestones
---

# Milestones`;
      fs.writeFileSync(path.join(goalPath, 'milestones.md'), milestonesContent);

      const validator = WorkflowValidator.getInstance();
      const result = await validator.validateWorkflow('test-goal-12', 'create-review');

      expect(result.isValid).toBe(false);
      expect(result.missingConditions.length).toBeGreaterThan(0);
    });
  });

  describe('error handling', () => {
    it('should throw error if goal does not exist', async () => {
      const validator = WorkflowValidator.getInstance();
      
      await expect(
        validator.validateGoal('non-existent-goal')
      ).rejects.toThrow('Goal "non-existent-goal" not found.');
    });
  });
});
