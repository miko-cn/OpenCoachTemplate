---
workflow_id: create-goal
version: 2.0
description: 用户创建目标，根据提供的工作流，引导用户对目标进行详细描述，引导用户思考目标对其的重要性及实现目标的动机，协助用户确定衡量目标成功的标准，评估目标难度和可行性。
requires_agent: true
workflow_file: workflows/create-goal.md
---

<command_arguments>
$ARGUMENTS
</command_arguments>

<prerequisites>
- Agent角色定义：必须按照`@opencoach/Agent.md`中定义的角色特色和行为准则执行
- 上下文检查：如果对话上下文中已明确加载`@opencoach/Agent.md`，则无需重复加载
- 工作流文件：必须成功读取`@opencoach/workflows/create-goal.md`
</prerequisites>

<workflow_reference>
- 工作流文件：`@opencoach/workflows/create-goal.md`
- 执行要求：严格按照工作流的状态机定义、步骤顺序和验证规则执行
- 状态追踪：遵循工作流中的状态转换图（Mermaid格式）
</workflow_reference>

<validation>
- 确认Agent.md已加载或在上下文中可用
- 确认create-goal.md工作流文件读取成功
- 验证用户输入符合工作流各阶段的要求
</validation>

<error_handling>
- 如果Agent.md加载失败：提示用户并终止执行
- 如果工作流文件不存在：报告错误并提供帮助信息
- 如果用户输入不符合要求：按照工作流中的错误处理逻辑引导用户重新输入
</error_handling>