# OpenCoach CLI Agent 使用指南

**版本**: 0.1.0  
**最后更新**: 2026-01-31  
**适用对象**: OpenCoach Agent

本文档为 OpenCoach Agent 提供完整的 CLI 工具使用指南，帮助 Agent 在工作流各个阶段准确、高效地使用 CLI 工具。

---

## 目录

1. [快速开始](#快速开始)
2. [全局选项](#全局选项)
3. [退出码说明](#退出码说明)
4. [时间工具](#时间工具)
5. [create-goal 工作流中的 CLI 使用](#create-goal-工作流中的-cli-使用)
6. [create-task 工作流中的 CLI 使用](#create-task-工作流中的-cli-使用)
7. [create-review 工作流中的 CLI 使用](#create-review-工作流中的-cli-使用)
8. [上下文恢复中的 CLI 使用](#上下文恢复中的-cli-使用)
9. [错误处理和降级策略](#错误处理和降级策略)
10. [最佳实践](#最佳实践)

---

## 快速开始

### 安装检查

Agent 应首先检查 CLI 工具是否可用：

```bash
opco --version
```

如果返回版本号（如 `0.1.0`），则 CLI 可用。如果返回错误，则应切换到手动模式。

### 基本使用模式

```bash
# 基本命令语法
opco <command> [arguments] [options]

# JSON 输出模式（推荐给 Agent）
opco <command> [arguments] --json

# 静默模式（减少 token 占用）
opco <command> [arguments] --quiet

# 组合使用
opco <command> [arguments] --json --quiet
```

---

## 全局选项

| 选项 | 说明 | 推荐场景 |
|------|------|----------|
| `--json` | 以 JSON 格式输出结果 | Agent 解析数据时 |
| `--quiet` | 静默模式，仅输出必要信息 | 减少输出内容时 |
| `-v, --version` | 显示版本号 | 检查 CLI 可用性时 |
| `-h, --help` | 显示帮助信息 | 查询命令参数时 |

---

## 退出码说明

CLI 命令执行后会返回退出码，Agent 应根据退出码判断执行状态：

| 退出码 | 含义 | Agent 处理建议 |
|--------|------|----------------|
| `0` | 成功 | 继续执行下一步 |
| `1` | 一般错误 | 向用户解释错误并提供手动操作建议 |
| `2` | 配置错误 | 引导用户检查配置文件 |
| `3` | 文件格式错误 | 尝试使用 `--fix` 参数自动修复，或提供手动修复指导 |
| `4` | 日期解析失败 | 检查日期格式是否正确，提供格式示例 |
| `5` | 偏移表达式无效 | 检查偏移表达式格式，提供正确格式示例 |

---

## 时间工具

`opco date` 命令提供强大的日期查询和时间推导功能，帮助 Agent 在工作流中精确处理时间相关问题。

### 基本语法

```bash
opco date [options]
```

### 参数说明

| 参数 | 说明 | 示例 |
|------|------|------|
| `--date <date>` | 指定日期 | `--date 2024-01-15`, `--date 01-15` |
| `--offset <offset>` | 时间偏移表达式 | `--offset +7d`, `--offset +1w,-2d` |
| `--from <date>` | 相对于指定日期计算偏移 | `--from 2024-01-01 --offset +1w` |
| `--diff <date>` | 计算与指定日期的差异 | `--diff 2024-12-31` |
| `--workdays` | 计算工作日数量 | 需与 `--diff` 一起使用 |
| `--format <format>` | 日期格式 | `--format short`, `--format "YYYY年MM月DD日"` |
| `--locale <locale>` | 语言环境 | `--locale zh`, `--locale en` |
| `--json` | JSON 格式输出 | 适合 Agent 解析 |

### 支持的日期格式

- `YYYY-MM-DD`: 2024-01-15
- `YYYY/MM/DD`: 2024/01/15
- `MM-DD`: 01-15 (使用当前年份)
- `MM/DD`: 01/15 (使用当前年份)
- `YYYYMMDD`: 20240115

### 支持的偏移表达式

格式: `[+|-][数字][单位]`

单位:
- `d`: 天
- `w`: 周
- `m`: 月
- `y`: 年

示例:
- `+7d`: 7天后
- `-1w`: 1周前
- `+3m`: 3个月后
- `+1w,+2d`: 1周零2天后 (多个偏移用逗号分隔)

### 使用场景

#### 1. 获取当前日期

```bash
# 基本查询
opco date

# JSON 格式
opco date --json

# 指定语言
opco date --locale en
```

**JSON 输出格式**:
```json
{
  "success": true,
  "mode": "basic",
  "data": {
    "date": "2024-01-15",
    "weekday": "星期一",
    "weekdayIndex": 1,
    "year": 2024,
    "month": 1,
    "day": 15,
    "timestamp": 1705276800000
  }
}
```

#### 2. 时间推导

```bash
# 7天后
opco date --offset +7d

# 1周前
opco date --offset -1w

# 3个月后
opco date --offset +3m

# 多个偏移
opco date --offset +1w,+2d

# 从指定日期开始计算
opco date --from 2024-01-01 --offset +1w
```

**JSON 输出格式**:
```json
{
  "success": true,
  "mode": "offset",
  "data": {
    "originalDate": {
      "date": "2024-01-15",
      "weekday": "星期一",
      "weekdayIndex": 1,
      "year": 2024,
      "month": 1,
      "day": 15,
      "timestamp": 1705276800000
    },
    "offsetDate": {
      "date": "2024-01-22",
      "weekday": "星期一",
      "weekdayIndex": 1,
      "year": 2024,
      "month": 1,
      "day": 22,
      "timestamp": 1705881600000
    },
    "offsetExpression": "+1w"
  }
}
```

#### 3. 日期比较

```bash
# 计算与指定日期的差异
opco date --diff 2024-12-31

# 指定起始日期
opco date --date 2024-01-01 --diff 2024-12-31

# 计算工作日
opco date --diff 2024-12-31 --workdays
```

**JSON 输出格式**:
```json
{
  "success": true,
  "mode": "diff",
  "data": {
    "date1": "2024-01-01",
    "date2": "2024-12-31",
    "diff": {
      "days": 365,
      "weeks": 52,
      "workdays": 261,
      "calendarDays": 365
    }
  }
}
```

#### 4. 格式化输出

```bash
# 简短格式
opco date --format short

# 完整格式
opco date --format long

# 自定义格式
opco date --format "YYYY年MM月DD日 (dddd)"

# ISO 格式
opco date --format iso
```

#### 5. 工作日计算

```bash
# 计算工作日
opco date --diff 2024-12-31 --workdays

# 指定起始日期
opco date --date 2024-01-01 --diff 2024-12-31 --workdays
```

**JSON 输出格式** (包含工作日详情):
```json
{
  "success": true,
  "mode": "diff",
  "data": {
    "date1": "2024-01-01",
    "date2": "2024-12-31",
    "diff": {
      "days": 365,
      "weeks": 52,
      "workdays": 261,
      "calendarDays": 365
    },
    "workdays": {
      "startDate": "2024-01-01",
      "endDate": "2024-12-31",
      "totalDays": 365,
      "workdays": 261,
      "weekends": 104,
      "holidays": 0
    }
  }
}
```

### 工作流中的典型应用

#### create-goal 工作流

**场景 1: 目标截止日期计算**

```bash
# 用户说"三个月后完成"
opco date --offset +3m --json
# 返回: 2024-04-15

# 用户说"年底"
opco date --date 12-31 --json
# 返回: 2024-12-31
```

**场景 2: 目标持续时间计算**

```bash
# 用户设定开始日期和截止日期
opco date --date 2024-01-01 --diff 2024-12-31 --json
# 返回天数、周数、工作日数
```

**场景 3: 时间建议展示**

```bash
# 获取当前日期供参考
opco date --json --format short

# 展示建议时间框架
opco date --offset +1m --json
```

#### create-task 工作流

**场景 1: 周期定义**

```bash
# 用户说"一周"
opco date --offset +1w

# 用户说"两周"
opco date --offset +2w

# 用户说"一个月"
opco date --offset +1m
```

**场景 2: 下次评估时间计算**

```bash
# 每3天回顾一次
opco date --offset +3d

# 每周回顾一次
opco date --offset +1w

# 每2周回顾一次
opco date --offset +2w
```

**场景 3: 任务进度计算**

```bash
# 计算已过天数
opco date --date <周期开始日期> --diff <当前日期>

# 计算剩余天数
opco date --date <当前日期> --diff <周期结束日期>
```

#### create-review 工作流

**场景 1: 检查是否到评估时间**

```bash
# 计算距离下次评估时间的天数
opco date --diff <下次评估日期>
```

**场景 2: 周期统计**

```bash
# 计算周期天数和工作日
opco date --date <开始日期> --diff <结束日期> --workdays
```

**场景 3: 下周期规划**

```bash
# 计算下一个周一
opco date --offset +1w --date Monday

# 下周开始
opco date --offset +1w
```

### 错误处理

#### 退出码 4: 日期解析失败

**错误示例**:
```
无法解析日期: "2024/01/15/extra"

支持的格式: YYYY-MM-DD (如 2024-01-15)
            YYYY/MM/DD (如 2024/01/15)
            MM-DD (如 01-15)
            MM/DD (如 01/15)
```

**处理建议**:
1. 向用户解释日期格式要求
2. 提供格式示例
3. 引导用户重新输入

#### 退出码 5: 偏移表达式无效

**错误示例**:
```
无效的偏移表达式: "+7days"

正确的格式: [+|-][数字][单位]
单位: d=天, w=周, m=月, y=年
示例: +7d, -1w, +3m, -2y
```

**处理建议**:
1. 向用户解释偏移表达式格式
2. 提供正确示例
3. 引导用户修正表达式

### 最佳实践

1. **始终使用 JSON 格式获取结构化数据**
   ```bash
   opco date --json
   ```

2. **处理模糊时间表述时使用时间推导**
   ```bash
   # "三个月后" -> +3m
   opco date --offset +3m
   ```

3. **计算工作日时使用 --workdays 参数**
   ```bash
   opco date --diff 2024-12-31 --workdays
   ```

4. **处理用户输入时提供格式提示**
   ```bash
   # 验证日期格式前提示用户
   "请使用 YYYY-MM-DD 格式，如 2024-01-15"
   ```

---

## create-goal 工作流中的 CLI 使用

### 1. 创建新目标

**时机**: 工作流进入 FILE_CREATION 状态

**命令**:
```bash
opco create <goal-name> [options]
```

**参数**:
- `<goal-name>`: 目标名称（必需）

**选项**:
| 选项 | 说明 | 使用场景 |
|------|------|----------|
| `--with-preferences` | 同时创建 preferences.md 文件 | 用户有偏好设置需求时 |
| `--title <title>` | 设置目标标题 | 用户指定标题时 |
| `--description <description>` | 设置目标描述 | 用户指定描述时 |

**示例**:
```bash
# 基本创建
opco create my-goal

# 带偏好设置
opco create my-goal --with-preferences

# 完整参数
opco create my-goal --with-preferences --title "我的学习目标" --description "学习 TypeScript"
```

**JSON 输出格式**:
```json
{
  "success": true,
  "message": "Goal created successfully: my-goal",
  "data": {
    "name": "my-goal",
    "goalId": "abc123",
    "path": "/path/to/goals/my-goal",
    "files": [
      "goal.md",
      "milestones.md",
      "tasks.md",
      "preferences.md"
    ]
  }
}
```

### 2. 检查现有目标

**时机**: 目标文件夹已存在时

**命令**:
```bash
opco view <goal-name> --json
```

**示例**:
```bash
opco view my-goal --json
```

**JSON 输出格式**:
```json
{
  "success": true,
  "message": "Goal details: my-goal",
  "data": {
    "metadata": {
      "name": "my-goal",
      "title": "My Goal",
      "status": "active",
      "created": "2026-01-31",
      "updated": "2026-01-31",
      "deadline": "2026-12-31",
      "description": "Goal description"
    },
    "content": "...",
    "files": ["goal.md", "milestones.md", "tasks.md"]
  }
}
```

### 3. 验证文件格式

**时机**: 文件创建完成后

**命令**:
```bash
opco check <goal-name> --fix
```

**示例**:
```bash
# 检查并自动修复
opco check my-goal --fix

# 仅检查不修复
opco check my-goal --json
```

**JSON 输出格式**:
```json
{
  "success": true,
  "message": "All files are valid. No issues found."
}
```

或（有问题时）:
```json
{
  "success": false,
  "message": "Found 2 issue(s) in 1 file(s).",
  "data": {
    "totalIssues": 2,
    "filesWithIssues": 1,
    "issues": [
      {
        "file": "goal.md",
        "type": "error",
        "line": 10,
        "message": "Missing required field: status"
      },
      {
        "file": "tasks.md",
        "type": "warning",
        "line": 5,
        "message": "Empty task list"
      }
    ]
  }
}
```

### 4. 验证工作流完整性

**时机**: 工作流完成时

**命令**:
```bash
opco validate <goal-name>
```

**示例**:
```bash
opco validate my-goal --json
```

**JSON 输出格式**:
```json
{
  "success": true,
  "message": "Goal \"my-goal\" workflow is valid.",
  "data": {
    "goalName": "my-goal",
    "stage": "GOAL_CREATED",
    "isValid": true,
    "missingFiles": [],
    "missingConditions": [],
    "suggestions": [],
    "issues": []
  }
}
```

---

## create-task 工作流中的 CLI 使用

### 1. 获取活跃目标列表

**时机**: 工作流进入 PRE_CHECK 状态

**命令**:
```bash
opco list --active --json
```

**示例**:
```bash
opco list --active --json
```

**JSON 输出格式**:
```json
{
  "success": true,
  "message": "Found 2 goal(s)",
  "data": {
    "goals": [
      {
        "name": "goal-1",
        "title": "Goal 1",
        "status": "active",
        "created": "2026-01-31",
        "deadline": "2026-12-31"
      },
      {
        "name": "goal-2",
        "title": "Goal 2",
        "status": "active",
        "created": "2026-01-30",
        "deadline": null
      }
    ],
    "count": 2
  }
}
```

### 2. 查看目标详情

**时机**: 找到多个目标时

**命令**:
```bash
opco view <goal-name> --json
```

**示例**:
```bash
opco view goal-1 --json
```

### 3. 验证前置条件

**时机**: 需要检查前置条件时

**命令**:
```bash
opco validate <goal-name> --workflow create-task
```

**示例**:
```bash
opco validate my-goal --workflow create-task --json
```

**决策逻辑**:
- 如果 `isValid: true` 且 `stage` 为 `MILESTONES_DEFINED` 或更高，继续任务制定
- 如果 `stage` 为 `GOAL_CREATED`，提示用户先完成里程碑规划
- 如果 `isValid: false`，显示缺失条件并等待用户处理

### 4. 获取任务统计

**时机**: tasks.md 文件已存在时

**命令**:
```bash
opco tasks <goal-name> --json
```

**示例**:
```bash
opco tasks my-goal --json
```

**JSON 输出格式**:
```json
{
  "success": true,
  "goal": "my-goal",
  "stats": {
    "total": 10,
    "completed": 5,
    "pending": 5,
    "percentage": 50.0,
    "period": "2026-01-01 to 2026-01-31"
  }
}
```

### 5. 归档旧任务

**时机**: 用户决定归档旧任务时

**命令**:
```bash
opco archive <goal-name>
```

**示例**:
```bash
opco archive my-goal --json
```

**JSON 输出格式**:
```json
{
  "success": true,
  "message": "Tasks archived successfully to tasks-2026-01-31.md",
  "data": {
    "goalName": "my-goal",
    "archiveFile": "tasks-2026-01-31.md",
    "archivePath": "/path/to/goals/my-goal/archives/tasks-2026-01-31.md",
    "date": "2026-01-31"
  }
}
```

### 6. 验证任务文件

**时机**: 任务清单创建完成后

**命令**:
```bash
opco check <goal-name> --quiet
```

**示例**:
```bash
opco check my-goal --quiet
```

### 7. 显示任务统计

**时机**: 工作流结束时

**命令**:
```bash
opco tasks <goal-name>
```

**示例**:
```bash
opco tasks my-goal
```

---

## create-review 工作流中的 CLI 使用

### 1. 获取详细任务列表

**时机**: 工作流进入 PRE_CHECK 状态

**命令**:
```bash
opco tasks <goal-name> --show-tasks --json
```

**示例**:
```bash
opco tasks my-goal --show-tasks --json
```

**JSON 输出格式**:
```json
{
  "success": true,
  "goal": "my-goal",
  "stats": {
    "total": 10,
    "completed": 8,
    "pending": 2,
    "percentage": 80.0,
    "period": "2026-01-01 to 2026-01-31"
  },
  "tasks": [
    {
      "checked": true,
      "text": "完成第一个任务",
      "line": 1
    },
    {
      "checked": false,
      "text": "完成第二个任务",
      "line": 2
    }
  ]
}
```

### 2. 计算完成率

**命令**:
```bash
opco tasks <goal-name> --json
```

从返回的 JSON 中读取 `stats.percentage` 字段。

### 3. 归档旧任务

**命令**:
```bash
opco archive <goal-name> --review <date>
```

**示例**:
```bash
opco archive my-goal --review 2026-01-31
```

### 4. 更新目标状态

**时机**: 所有任务完成时

**命令**:
```bash
opco update <goal-name> --status completed
```

**示例**:
```bash
opco update my-goal --status completed --json
```

**JSON 输出格式**:
```json
{
  "success": true,
  "message": "Goal \"my-goal\" updated successfully.",
  "data": {
    "goalName": "my-goal",
    "updated": "2026-01-31",
    "changes": {
      "status": "completed"
    }
  }
}
```

### 5. 更新目标字段

**命令**:
```bash
opco update <goal-name> --field <field> --value <value>
```

**允许更新的字段**: `title`, `description`, `status`, `deadline`, `priority`, `tags`, `category`

**示例**:
```bash
opco update my-goal --field tags --value "work,important"
opco update my-goal --deadline 2026-12-31
```

### 6. 验证新周期前置条件

**时机**: 用户决定开始新周期时

**命令**:
```bash
opco validate <goal-name> --workflow create-task
```

### 7. 展示更新后的目标状态

**时机**: 回顾工作流完成时

**命令**:
```bash
opco view <goal-name>
```

**示例**:
```bash
opco view my-goal
```

---

## 上下文恢复中的 CLI 使用

### 1. 扫描所有目标

**时机**: 新会话开始时

**命令**:
```bash
opco list --json
```

**示例**:
```bash
opco list --json
```

### 2. 检查每个目标的完整性

**时机**: 需要检查目标完整性时

**命令**:
```bash
opco validate <goal-name>
```

**循环处理示例**:
```bash
# 从 opco list 获取目标列表
# 对每个目标执行：
opco validate goal-1 --json
opco validate goal-2 --json
# ...
```

### 3. 检查文件格式

**时机**: 发现未完成的工作流时

**命令**:
```bash
opco check <goal-name> --quiet
```

### 4. 恢复 create-task 工作流

**命令**:
```bash
opco tasks <goal-name> --json
```

### 5. 恢复 create-review 工作流

**命令**:
```bash
opco tasks <goal-name> --show-tasks --json
```

### 6. 归档或更新目标

根据需要执行：
```bash
# 归档
opco archive <goal-name>

# 更新状态
opco update <goal-name> --status <status>
```

### 7. 展示目标状态摘要

**时机**: 上下文恢复完成后

**命令**:
```bash
opco view <goal-name> --quiet
```

---

## 错误处理和降级策略

### CLI 工具可用性检查

```bash
opco --version
```

如果返回错误，CLI 工具未安装，应切换到手动模式。

### 退出码处理

#### 退出码 1: 一般错误

**处理策略**:
1. 向用户解释错误原因
2. 提供手动操作建议
3. 继续工作流程（如果可能）

**用户提示模板**:
```
CLI 命令执行失败: [错误消息]

建议手动操作步骤:
1. [手动步骤 1]
2. [手动步骤 2]

如需继续使用 CLI 工具，建议先安装:
npm install -g opencoach-cli
```

#### 退出码 2: 配置错误

**处理策略**:
1. 引导用户检查配置文件
2. 提供配置修复指引
3. 等待用户处理

**用户提示模板**:
```
CLI 配置错误: [错误消息]

请检查配置文件:
- 文件位置: [配置文件路径]
- 问题: [具体问题]

修复后请重试或继续手动操作。
```

#### 退出码 3: 文件格式错误

**处理策略**:
1. 尝试使用 `--fix` 参数自动修复
2. 如果修复失败，提供手动修复指导

**自动修复示例**:
```bash
opco check <goal-name> --fix
```

**用户提示模板**:
```
文件格式错误: [错误消息]

尝试自动修复...
[执行 opco check --fix]

修复成功! 请继续。
或修复失败，请手动修复: [文件路径]
```

### 超时重试机制

1. CLI 命令执行超时（> 30秒）时，重试一次
2. 重试失败后切换到手动操作模式

**超时处理示例**:
```
CLI 命令执行超时，正在重试...
[重试执行]
重试失败，切换到手动操作模式。

当前需要: [任务描述]
手动操作步骤:
1. [步骤 1]
2. [步骤 2]
```

### 手动操作模式

**触发条件**:
- CLI 工具未安装
- CLI 命令多次执行失败
- 用户明确要求手动模式

**用户提示**:
```
当前模式: 手动操作模式

CLI 工具不可用，将使用手动文件操作完成任务。
操作步骤:
1. [步骤 1]
2. [步骤 2]
...

完成后请告知我继续下一步。

💡 安装 CLI 工具可提升效率:
npm install -g opencoach-cli
```

---

## 最佳实践

### 1. 始终使用 JSON 输出

Agent 应始终使用 `--json` 参数获取机器可读的输出：

```bash
# ✅ 推荐
opco view my-goal --json

# ❌ 不推荐
opco view my-goal
```

### 2. 减少不必要输出

使用 `--quiet` 参数减少 token 占用：

```bash
# ✅ 推荐（后台验证）
opco check my-goal --quiet

# ❌ 不推荐（会产生冗余输出）
opco check my-goal
```

### 3. 检查退出码

每次执行 CLI 命令后都应检查退出码：

```bash
# 执行命令
opco create my-goal --json

# 检查退出码
if [ $? -eq 0 ]; then
    # 成功，继续
elif [ $? -eq 3 ]; then
    # 文件格式错误，尝试修复
    opco check my-goal --fix
else
    # 其他错误，处理
fi
```

### 4. 优雅降级

CLI 工具不可用时优雅降级到手动模式：

```bash
# 检查 CLI 可用性
opco --version
if [ $? -ne 0 ]; then
    # 切换到手动模式
    echo "CLI 不可用，切换到手动模式"
    # 执行手动操作
fi
```

### 5. 批量操作使用循环

对多个目标进行批量操作时使用循环：

```bash
# 获取目标列表
goals=$(opco list --json | jq -r '.data.goals[].name')

# 循环处理
for goal in $goals; do
    opco validate $goal --json
done
```

### 6. 组合命令提高效率

```bash
# 创建并验证
opco create my-goal --json && opco check my-goal --quiet

# 更新并查看
opco update my-goal --status completed --json && opco view my-goal
```

### 7. 使用 --show-tasks 获取详细信息

```bash
# ✅ 推荐（获取任务详情）
opco tasks my-goal --show-tasks --json

# ❌ 不推荐（仅获取统计信息）
opco tasks my-goal --json
```

---

## 附录

### 工作流阶段对照表

| 阶段 | 说明 | CLI 验证命令 |
|------|------|--------------|
| NOT_STARTED | 未开始 | - |
| GOAL_CREATED | 目标已创建 | `opco validate --workflow create-goal` |
| MILESTONES_DEFINED | 里程碑已定义 | - |
| TASKS_CREATED | 任务已创建 | `opco validate --workflow create-task` |
| IN_PROGRESS | 进行中 | - |
| REVIEW_READY | 准备回顾 | `opco validate --workflow create-review` |
| COMPLETED | 已完成 | - |
| ARCHIVED | 已归档 | - |

### 常用命令速查

| 命令 | 说明 |
|------|------|
| `opco create <name>` | 创建目标 |
| `opco list --active --json` | 列出活跃目标 |
| `opco view <name> --json` | 查看目标详情 |
| `opco check <name> --fix` | 检查并修复文件 |
| `opco tasks <name> --json` | 获取任务统计 |
| `opco tasks <name> --show-tasks --json` | 获取任务列表 |
| `opco archive <name>` | 归档任务 |
| `opco update <name> --status <status>` | 更新状态 |
| `opco validate <name>` | 验证工作流 |
| `opco validate <name> --workflow <id>` | 验证特定工作流 |
| `opco date` | 获取当前日期 |
| `opco date --offset <offset>` | 时间偏移计算 |
| `opco date --diff <date>` | 日期差异计算 |
| `opco date --workdays` | 工作日计算 |

### 典型场景命令组合

#### 场景 1: 创建新目标
```bash
opco create my-goal --with-preferences --json && \
opco check my-goal --quiet && \
opco validate my-goal --workflow create-goal
```

#### 场景 2: 制定任务计划
```bash
opco list --active --json && \
opco validate my-goal --workflow create-task --json && \
opco tasks my-goal --json && \
opco check my-goal --quiet
```

#### 场景 3: 回顾周期
```bash
opco tasks my-goal --show-tasks --json && \
opco archive my-goal --review $(date +%Y-%m-%d) --json && \
opco update my-goal --status completed --json
```

#### 场景 4: 会话恢复
```bash
opco list --json && \
for goal in $(opco list --json | jq -r '.data.goals[].name'); do \
    opco validate $goal --json && \
    opco check $goal --quiet; \
done
```

---

**文档维护**: 如 CLI 工具更新，请同步更新本文档。
