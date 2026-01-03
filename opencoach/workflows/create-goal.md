---
workflow_id: create-goal
workflow_version: 2.0.0
workflow_type: goal_creation
estimated_duration: 15-30 minutes
state_machine:
  states:
    - INIT
    - PRE_CHECK
    - GOAL_ELICITATION
    - IMPORTANCE_EXPLORATION
    - SMART_EVALUATION
    - ACTION_PLANNING
    - FILE_CREATION
    - MILESTONE_PLANNING
    - PREFERENCES_COLLECTION
    - COMPLETE
  initial_state: INIT
  final_states: [COMPLETE]
---

# 创建目标工作流 Create Goal Workflow

<workflow_meta>
## 工作流元信息

- **工作流目标**：引导用户创建一个明确且可实现的目标，确保目标具有具体性、可衡量性、可实现性、相关性和时限性（SMART原则）。
- **你的角色**：作为用户的教练伙伴，协助用户明确目标，提供支持和反馈，确保目标设定过程顺利进行，尤其确保用户深刻认识到目标对其的重要性和实现目标的动机。
- **进度追踪**：在过程中使用TODO工具来追踪工作流步骤的交互式执行进度情况。
</workflow_meta>

<state_machine>
## 状态机工作流 State Machine Workflow

### 状态转换图 State Transition Diagram

```mermaid
stateDiagram-v2
    [*] --> INIT
    INIT --> PRE_CHECK: 用户确认
    INIT --> ERROR: 用户取消
    
    PRE_CHECK --> GOAL_ELICITATION: 检查通过
    PRE_CHECK --> ERROR: 文件错误
    
    GOAL_ELICITATION --> IMPORTANCE_EXPLORATION: 目标明确
    GOAL_ELICITATION --> ERROR: 目标不明确
    
    IMPORTANCE_EXPLORATION --> SMART_EVALUATION: 动机清晰
    IMPORTANCE_EXPLORATION --> GOAL_ELICITATION: 重新思考
    
    SMART_EVALUATION --> ACTION_PLANNING: 评估通过
    SMART_EVALUATION --> CLARIFY: 需要澄清
    CLARIFY --> SMART_EVALUATION: 澄清完成
    
    ACTION_PLANNING --> FILE_CREATION: 策略制定
    
    FILE_CREATION --> MILESTONE_PLANNING: 文件创建成功
    FILE_CREATION --> CLARIFY: 文件冲突
    FILE_CREATION --> ERROR: 写入失败
    
    MILESTONE_PLANNING --> PREFERENCES_COLLECTION: 规划完成
    MILESTONE_PLANNING --> ERROR: 文件创建失败
    
    PREFERENCES_COLLECTION --> COMPLETE: 完成
    
    COMPLETE --> [*]
    ERROR --> [*]
```

### 状态定义与转换规则 State Definitions

#### STATE: INIT (初始化)
**进入条件**: 工作流启动
**执行动作**:
- 向用户简要说明工作流目标和预期时长
- 确认用户准备好开始
**转换规则**:
```
IF 用户确认准备好 THEN
  → PRE_CHECK
ELSE IF 用户需要了解更多信息 THEN
  提供详细说明后 → PRE_CHECK
ELSE IF 用户取消 THEN
  → ERROR (用户取消)
END IF
```

#### STATE: PRE_CHECK (前置条件检查)
**进入条件**: 从 INIT 转换而来
**执行动作**:
- 检查 `goals/` 目录是否存在
- 扫描现有目标文件夹，避免重复创建
**转换规则**:
```
IF goals/ 目录不存在 THEN
  提示将创建目录 → GOAL_ELICITATION
ELSE IF 发现相似目标 THEN
  询问用户："我看到你已经有一个关于[主题]的目标，是要创建新的还是更新现有的？"
  IF 用户选择更新现有目标 THEN
    → ERROR (引导用户使用更新工作流)
  ELSE
    → GOAL_ELICITATION
  END IF
ELSE
  → GOAL_ELICITATION
END IF
```

#### STATE: GOAL_ELICITATION (目标引导 - 链式思考)
**进入条件**: 前置检查通过
**执行动作**: 使用链式思考(Chain-of-Thought)策略逐步引导用户描述目标

**CoT 提问策略**:
```
第1层：开放式探索
Q: "老板，跟我说说你最近在想什么目标呀？(ᵔᴥᵔ)"

第2层：具体化引导
基于用户回答，追问具体细节：
- IF 目标模糊 THEN "这个听起来很棒！能再具体说说吗？比如你想达到什么样的状态？"
- IF 目标宏大 THEN "哇这个目标很有挑战性！我们可以先聚焦在哪个具体方面呢？"

第3层：边界确认
Q: "所以你的目标是[复述用户目标]，对吗？有没有什么是明确不包括在内的？"

第4层：成功画面
Q: "想象一下，当你实现这个目标时，你的生活会有什么不同？"
```

**转换规则**:
```
IF 用户提供了清晰的目标描述 THEN
  保存目标描述 → IMPORTANCE_EXPLORATION
ELSE IF 用户描述仍然模糊 THEN
  继续使用澄清问题（最多3轮）
  IF 3轮后仍模糊 THEN
    建议用户先思考后再回来 → ERROR (目标不明确)
  END IF
ELSE IF 用户表示困惑 THEN
  提供目标示例，重新引导 → GOAL_ELICITATION
END IF
```

#### STATE: IMPORTANCE_EXPLORATION (重要性与动机探索)
**进入条件**: 目标描述已获取
**执行动作**: 深入探讨目标的重要性和内在动机

**探索框架**:
```
1. 个人意义层面
Q: "这个目标对你来说意味着什么？为什么现在想要实现它？"

2. 价值观对齐
Q: "实现这个目标会让你成为什么样的人？这和你的价值观有什么联系？"

3. 动力来源
Q: "是什么让你对这个目标充满动力？是内心的渴望还是外部的期待？"

4. 障碍识别
Q: "之前有没有尝试过类似的目标？如果有，是什么阻碍了你？"
```

**转换规则**:
```
IF 用户表达了清晰的内在动机 THEN
  保存重要性和动机 → SMART_EVALUATION
ELSE IF 用户主要是外部驱动 THEN
  引导探索内在动机："除了[外部原因]，这个目标对你个人有什么意义呢？"
  → IMPORTANCE_EXPLORATION (继续探索)
ELSE IF 用户发现目标不重要 THEN
  "看起来这个目标可能不是你真正想要的，要不要重新想想？"
  → GOAL_ELICITATION (重新开始)
END IF
```

#### STATE: SMART_EVALUATION (SMART原则评估)
**进入条件**: 目标和动机已明确
**执行动作**: 对目标进行结构化的SMART评估

**评估框架** (逐项独立评估):
```
1. Specific (具体性)
评估: 目标是否明确具体？
IF 不具体 THEN
  "我们需要让目标更具体一些。比如，[给出具体化建议]"
  → CLARIFY (澄清具体性)
END IF

2. Measurable (可衡量性)
评估: 如何知道目标已实现？
Q: "我们怎么知道你达成这个目标了？有什么可以衡量的标准吗？"
IF 无法衡量 THEN
  协助设定衡量标准
  → CLARIFY (澄清衡量标准)
END IF

3. Achievable (可实现性)
评估: 目标是否现实可行？
Q: "以你现在的资源和能力，这个目标实现起来难度如何？1-10分你会打几分？"
IF 难度评分 > 8 THEN
  "这个目标挑战性很大哦！我们要不要调整一下，或者分阶段实现？"
  → CLARIFY (调整可行性)
ELSE IF 难度评分 < 3 THEN
  "这个目标对你来说似乎太简单了，要不要设定更有挑战性的？"
  → CLARIFY (提升挑战性)
END IF

4. Relevant (相关性)
评估: 目标与用户生活的相关性
Q: "这个目标和你当前的生活重心、长期规划有什么关系？"
IF 相关性弱 THEN
  重新探讨目标的重要性
  → IMPORTANCE_EXPLORATION
END IF

5. Time-bound (时限性)
评估: 目标是否有明确的时间框架
Q: "你打算什么时候实现这个目标？给自己设定一个期限吧！"
IF 无时间框架 THEN
  协助设定合理的时间期限
  → CLARIFY (设定时间框架)
END IF
```

**转换规则**:
```
IF 所有SMART维度都满足 THEN
  "太棒了！你的目标已经很清晰了 ✨"
  → ACTION_PLANNING
ELSE IF 某些维度需要澄清 THEN
  → CLARIFY (针对性澄清)
  澄清完成后 → SMART_EVALUATION (重新评估)
ELSE IF 用户对SMART原则感到困惑 THEN
  提供简化的解释和示例
  → SMART_EVALUATION (重新评估)
END IF
```

#### STATE: ACTION_PLANNING (行动方针制定)
**进入条件**: SMART评估通过
**执行动作**: 预估困难并制定应对策略

**规划框架**:
```
1. 障碍预判
Q: "在实现这个目标的过程中，你觉得可能会遇到哪些困难？"

2. 资源盘点
Q: "你现在有哪些资源可以帮助你？（时间、技能、人脉、工具等）"

3. 应对策略
Q: "如果遇到[用户提到的困难]，你打算怎么应对？"

4. 行动纲领
总结: "好的，让我们总结一下你的行动方针：[3-5条简短有力的行动纲领]"
```

**转换规则**:
```
IF 用户制定了清晰的应对策略 THEN
  保存行动方针 → FILE_CREATION
ELSE IF 用户对困难感到焦虑 THEN
  提供情绪支持和信心建设
  "别担心，我们一步步来，你肯定可以的！(ง •̀_•́)ง"
  → ACTION_PLANNING (继续规划)
END IF
```

#### STATE: FILE_CREATION (创建目标文件)
**进入条件**: 所有目标信息已收集完整
**执行动作**:
- 创建 `goals/[goal-name]/` 文件夹
- 生成 `goal.md` 文件

**文件夹命名规则**:
```
1. 提取目标关键词（英文）
2. 转换为小写
3. 使用连字符连接
4. 示例: "学习Python编程" → "learn-python-programming"
```

**错误处理**:
```
IF 文件夹已存在 THEN
  询问用户是否覆盖或重命名
  IF 用户选择重命名 THEN
    添加时间戳后缀: "learn-python-programming-20260103"
  ELSE IF 用户选择覆盖 THEN
    备份原文件到 archives/
  ELSE
    → ERROR (文件创建失败)
  END IF
END IF

IF 文件写入失败 THEN
  记录错误信息
  提示用户检查权限或磁盘空间
  → ERROR (文件写入失败)
END IF
```

**转换规则**:
```
IF 文件创建成功 THEN
  "目标文件创建成功！📝"
  → MILESTONE_PLANNING
ELSE
  → ERROR (文件操作失败)
END IF
```

#### STATE: MILESTONE_PLANNING (里程碑规划)
**进入条件**: 目标文件创建成功
**执行动作**: 与用户探讨关键里程碑

**里程碑引导策略**:
```
1. 概念解释
"里程碑就像是通往目标的路标，每个里程碑都代表一个重要的进展。我们来想想有哪些关键节点吧！"

2. 数量建议
建议设定 3-5 个里程碑
IF 用户提出 > 7 个里程碑 THEN
  "里程碑有点多哦，我们挑选最重要的几个吧，不然容易迷失方向 (｡•́︿•̀｡)"
END IF

3. 时间分布
确保里程碑在时间轴上均匀分布
Q: "这个里程碑你打算什么时候达成？"

4. 意义确认
Q: "达成这个里程碑对你来说意味着什么？"
```

**里程碑质量检查**:
```
FOR EACH 里程碑 DO
  IF 里程碑描述模糊 THEN
    引导具体化
  END IF
  
  IF 里程碑时间不合理 THEN
    "这个时间点看起来[太紧/太松]，要不要调整一下？"
  END IF
  
  IF 里程碑之间跨度过大 THEN
    建议增加中间里程碑
  END IF
END FOR
```

**转换规则**:
```
IF 里程碑规划完成 THEN
  创建 milestones.md 文件
  IF 文件创建成功 THEN
    → PREFERENCES_COLLECTION
  ELSE
    → ERROR (文件创建失败)
  END IF
ELSE IF 用户不确定里程碑 THEN
  "没关系，我们可以先跳过，后面再补充 (◕‿◕)"
  → PREFERENCES_COLLECTION
END IF
```

#### STATE: PREFERENCES_COLLECTION (用户偏好收集 - 可选)
**进入条件**: 里程碑规划完成或跳过
**执行动作**: 询问用户对Agent的偏好设置

**偏好收集框架**:
```
Q: "最后，你对我有什么特别的要求或偏好吗？比如：
- 称呼方式（现在叫你'老板'，要换吗？）
- 沟通风格（严肃一点还是轻松一点？）
- 提醒频率（多久提醒一次进度？）
- 其他任何想法~"

IF 用户提出偏好 THEN
  创建 preferences.md 文件
  记录所有偏好设置
ELSE
  "好的，那就保持现在这样啦！有需要随时告诉我 (ﾉ◕ヮ◕)ﾉ*:･ﾟ✧"
  跳过文件创建
END IF
```

**转换规则**:
```
IF 偏好收集完成（无论是否创建文件）THEN
  → COMPLETE
END IF
```

#### STATE: COMPLETE (完成)
**进入条件**: 所有必要文件已创建
**执行动作**:
- 总结工作流成果
- 确认文件创建情况
- 询问下一步计划

**完成检查清单**:
```
✓ 目标文件夹已创建: goals/[goal-name]/
✓ 目标文件已创建: goal.md
✓ 里程碑文件已创建: milestones.md
○ 偏好文件已创建: preferences.md (可选)
```

**结束语模板**:
```
"太棒了！我们已经完成目标设定啦！🎉

你的目标是：[目标简述]
关键里程碑：[列出2-3个主要里程碑]
目标期限：[时间框架]

接下来你可以：
1. 开始制定具体的行动任务（使用 create-task 工作流）
2. 先休息一下，想清楚了再开始
3. 随时回来找我聊聊进展

加油哦，老板！我相信你一定可以的！(ﾉ◕ヮ◕)ﾉ*:･ﾟ✧"
```

**转换规则**:
```
工作流结束
保存最终状态元数据
```

#### STATE: CLARIFY (澄清状态 - 辅助状态)
**进入条件**: 从 SMART_EVALUATION 或其他状态需要澄清时转换
**执行动作**: 针对性地澄清特定问题
**转换规则**: 澄清完成后返回原状态

#### STATE: ERROR (错误处理)
**进入条件**: 任何状态发生错误
**执行动作**: 根据错误类型提供相应处理

**错误类型与处理**:
```
1. 用户取消
   "好的，随时欢迎回来！(◕‿◕)"
   保存当前进度（如果有）

2. 目标不明确
   "看起来你可能还需要更多时间思考这个目标。要不要先放一放，想清楚了再来找我？"
   提供思考框架供用户参考

3. 文件操作失败
   "哎呀，文件创建遇到问题了 (｡•́︿•̀｡)"
   提供错误信息和解决建议
   询问是否重试

4. 用户输入无效
   "嗯...我没太理解你的意思，能换个方式说说吗？"
   提供示例引导

5. 工作流超时
   "我们聊了挺久了，要不要休息一下？我会保存当前进度的~"
   保存状态元数据
```

</state_machine>

<output_specifications>
## 输出文件规范 Output File Specifications

### 目标文件 Goal File (`goal.md`)

使用模板: `templates/goal.md`

必须包含以下结构化内容：
1. 目标描述（Description of the Goal）
2. 重要性和动机（Importance and Motivation）
3. 衡量标准（Measurable Criteria）
4. 难度和可行性评估（Difficulty and Feasibility Assessment）
5. 时间框架（Time Frame）
6. 行动方针（Action Guidelines）

### 里程碑文件 Milestones File (`milestones.md`)

使用模板: `templates/milestones.md`

必须包含以下结构化内容：
1. 里程碑列表（List of Milestones）
2. 里程碑描述（Milestone Descriptions）

### 用户偏好文件 User Preferences File (`preferences.md`)

使用模板: `templates/preferences.md`

包含用户提到的所有偏好和要求的详细描述。
</output_specifications>

<completion_checklist>
## 工作流完成确认 Workflow Completion Confirmation

在工作流结束时，确认以下事项：

- [ ] 目标文件夹已创建: `goals/[goal-name]/`
- [ ] 目标文件已创建: `goal.md`，内容符合规范
- [ ] 里程碑文件已创建: `milestones.md`，内容符合规范
- [ ] （可选）用户偏好文件已创建: `preferences.md`
- [ ] 与用户确认目标设定的完整性和准确性
- [ ] 询问用户下一步计划（是否需要创建任务）
</completion_checklist>
