---
workflow_id: create-task
version: 2.0
description: 用户指定目标，根据提供的工作流，引导用户制定当前周期内的小目标
requires_agent: true
workflow_file: workflows/create-task.md
requires_goal_id: true
---

<command_arguments>
$ARGUMENTS
</command_arguments>

<prerequisites>
- Agent角色定义：必须按照`@opencoach/Agent.md`中定义的角色特色和行为准则执行
- 上下文检查：如果对话上下文中已明确加载`@opencoach/Agent.md`，则无需重复加载
- 工作流文件：必须成功读取`@opencoach/workflows/create-task.md`
- 目标验证：必须提供有效的目标id（goal_id），对应`goals`目录下已存在的目标文件夹
</prerequisites>

<parameter_validation>
- goal_id（必需）：
  - 格式：字符串，对应目标文件夹名称
  - 验证规则：必须在`goals`目录下存在对应的文件夹
  - 失败处理：如果目标id无效或不存在，提示用户重新提供有效的目标id
  - 验证方法：检查`goals/{goal_id}`路径是否存在
</parameter_validation>

<workflow_reference>
- 工作流文件：`@opencoach/workflows/create-task.md`
- 执行要求：严格按照工作流的状态机定义、步骤顺序和验证规则执行
- 状态追踪：遵循工作流中的状态转换图（Mermaid格式）
</workflow_reference>

<validation>
- 确认Agent.md已加载或在上下文中可用
- 确认create-task.md工作流文件读取成功
- 验证goal_id参数存在且有效
- 验证用户输入符合工作流各阶段的要求
</validation>

<error_handling>
- 如果Agent.md加载失败：提示用户并终止执行
- 如果工作流文件不存在：报告错误并提供帮助信息
- 如果goal_id缺失或无效：提示用户提供有效的目标id，列出可用的目标列表
- 如果用户输入不符合要求：按照工作流中的错误处理逻辑引导用户重新输入
</error_handling>