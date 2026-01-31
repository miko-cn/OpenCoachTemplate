# Changelog

All notable changes to OpenCoach CLI will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- 任务统计命令 `opco tasks [goal-name]`
  - 显示任务周期、总数、完成率
  - 支持 `--show-tasks` 显示任务列表
  - 支持在目标目录下自动检测目标
- 所有命令的详细帮助信息（中文）
- 每个命令的使用示例
- tasks.md 内容验证（period 字段、任务列表）
- review.md 内容验证（必需字段、必需章节）

### Changed
- 简化 tasks 命令：从 `opco tasks status <goal-name>` 改为 `opco tasks [goal-name]`
- 统一所有命令的描述为中文
- 完善 README.md，添加 tasks 命令文档

### Fixed
- 修复 archive 命令的变量名错误

## [0.1.0] - 2026-01-31

### Added
- 项目初始化命令 `opco init`
  - 创建标准目录结构（goals/, templates/, workflows/, .opencoach/）
  - 复制默认模板文件
  - 初始化配置文件
- 配置管理命令 `opco config`
  - set: 设置配置项
  - get: 获取配置项
  - list: 列出所有配置项
  - unset: 删除配置项
  - reset: 重置为默认配置
- 目标管理命令
  - `opco create <goal-name>`: 创建新目标
  - `opco list`: 列出所有目标
  - `opco view [goal]`: 查看目标详情
  - `opco update <goal-name>`: 更新目标信息
  - `opco archive <goal-name>`: 归档任务
- 文件验证命令
  - `opco check [goal]`: 检查文件格式
  - `opco validate <goal-name>`: 验证工作流状态
- 工作流阶段检测（8 个阶段）
  - NOT_STARTED: 未开始
  - GOAL_CREATED: 目标已创建
  - MILESTONES_DEFINED: 里程碑已定义
  - TASKS_CREATED: 任务已创建
  - IN_PROGRESS: 进行中
  - REVIEW_READY: 准备回顾
  - COMPLETED: 已完成
  - ARCHIVED: 已归档
- Agent 集成支持
  - 所有命令支持 `--json` 参数（JSON 格式输出）
  - 所有命令支持 `--quiet` 参数（静默模式）
  - 标准化的退出码（0 成功，非 0 失败）
- 模板文件自动同步机制
  - 构建时自动从 `../opencoach/` 同步模板文件
  - 只需维护一份源文件
- 完整的测试覆盖（178 个测试用例）
  - 工具类测试（Logger, PathUtils, ErrorHandler）
  - 服务类测试（ConfigManager, GoalManager, FileValidator, WorkflowValidator）
  - 命令测试（init, create, list, view, check, update, archive, validate）

### Technical
- TypeScript 5.3.3
- Node.js >= 16.0.0
- Commander.js 11.1.0
- Jest 29.7.0 (测试框架)
- ESLint 8.56.0 (代码检查)

### Documentation
- 完整的 README.md
  - 安装说明
  - 快速开始指南
  - 完整的命令参考
  - Agent 集成指南
  - 常见问题解答
- 模板打包说明（TEMPLATE_PACKAGING.md）
- 模板同步方案（TEMPLATE_SYNC.md）
- .gitignore 配置说明（docs/GITIGNORE.md）

[Unreleased]: https://github.com/yourusername/opencoach-cli/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/yourusername/opencoach-cli/releases/tag/v0.1.0
