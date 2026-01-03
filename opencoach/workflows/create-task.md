---
workflow_id: create-task
workflow_version: 2.0.0
workflow_type: task_planning
estimated_duration: 20-40 minutes
prerequisites:
  - goal.md
  - milestones.md
state_machine:
  states:
    - INIT
    - PRE_CHECK
    - CONTEXT_REVIEW
    - PERIOD_DEFINITION
    - TASK_DECOMPOSITION
    - PRIORITY_SETTING
    - FEASIBILITY_CHECK
    - FILE_CREATION
    - TRACKING_SETUP
    - COMPLETE
  initial_state: INIT
  final_states: [COMPLETE]
---

# 创建任务工作流 Create Task Workflow

<workflow_meta>
## 工作流元信息

- **前情提要**：你已经和用户创建了一个明确且可实现的目标以及对应的阶段里程碑，目标文件存储在`goals`目录下的相应文件夹内，包含`goal.md`和`milestones.md`文件。
- **工作流目标**：基于已有的内容，协助用户创建当前周期内要完成的小任务，确保任务具体且可操作（使用SMART原则）。
- **周期定义**：当前周期指下次进行目标评估或进度跟踪之前的时间段（以最近的时间点为准），一般在`goal.md`、`milestones.md`、`preferences.md`文件中会有相关的时间节点提示。
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
    
    PRE_CHECK --> CONTEXT_REVIEW: 检查通过
    PRE_CHECK --> ERROR: 缺少前置文件
    
    CONTEXT_REVIEW --> PERIOD_DEFINITION: 信息确认
    CONTEXT_REVIEW --> ERROR: 需要更新目标
    
    PERIOD_DEFINITION --> TASK_DECOMPOSITION: 周期确定
    
    TASK_DECOMPOSITION --> PRIORITY_SETTING: 分解完成
    TASK_DECOMPOSITION --> REFINE: 需要优化
    
    PRIORITY_SETTING --> FEASIBILITY_CHECK: 优先级设定
    PRIORITY_SETTING --> REFINE: 分布不合理
    
    FEASIBILITY_CHECK --> FILE_CREATION: 可行性通过
    FEASIBILITY_CHECK --> REFINE: 需要调整
    
    REFINE --> TASK_DECOMPOSITION: 重新分解
    REFINE --> PRIORITY_SETTING: 重新设定
    REFINE --> FEASIBILITY_CHECK: 重新检查
    
    FILE_CREATION --> TRACKING_SETUP: 文件创建成功
    FILE_CREATION --> REFINE: 文件冲突
    FILE_CREATION --> ERROR: 写入失败
    
    TRACKING_SETUP --> COMPLETE: 设置完成
    
    COMPLETE --> [*]
    ERROR --> [*]
```

### 状态定义与转换规则 State Definitions

#### STATE: INIT (初始化)
**进入条件**: 工作流启动
**执行动作**:
- 向用户说明工作流目标
- 确认用户准备好开始
**转换规则**:
```
IF 用户确认准备好 THEN
  → PRE_CHECK
ELSE IF 用户取消 THEN
  → ERROR (用户取消)
END IF
```

#### STATE: PRE_CHECK (前置条件检查)
**进入条件**: 从 INIT 转换而来
**执行动作**:
- 检查 `goals/` 目录是否存在
- 扫描目标文件夹，查找 `goal.md` 和 `milestones.md`
- 检查是否已存在 `tasks.md`

**前置条件检查逻辑**:
```
IF goals/ 目录不存在 THEN
  "哎呀，看起来你还没有创建目标呢 (｡•́︿•̀｡)"
  "我们需要先创建一个目标，才能制定任务哦！"
  询问: "要不要现在开始创建目标？"
  IF 用户同意 THEN
    → ERROR (引导至 create-goal 工作流)
  ELSE
    → ERROR (缺少前置条件)
  END IF
END IF

IF 找到多个目标文件夹 THEN
  列出所有目标
  询问: "你想为哪个目标制定任务呢？"
  等待用户选择
END IF

IF goal.md 不存在 THEN
  → ERROR (目标文件缺失，引导至 create-goal)
END IF

IF milestones.md 不存在 THEN
  询问: "我没找到里程碑文件，要不要先补充一下里程碑？"
  IF 用户同意 THEN
    → ERROR (引导补充里程碑)
  ELSE
    "好的，那我们直接制定任务吧！"
    → CONTEXT_REVIEW
  END IF
END IF

IF tasks.md 已存在 THEN
  询问: "我看到你已经有任务清单了，是要：
  1. 创建新周期的任务（归档旧任务）
  2. 更新现有任务
  3. 查看现有任务"
  
  根据用户选择决定下一步
END IF
```

**转换规则**:
```
IF 所有前置条件满足 THEN
  → CONTEXT_REVIEW
ELSE IF 缺少必要文件 THEN
  → ERROR (引导用户完成前置工作流)
END IF
```

#### STATE: CONTEXT_REVIEW (上下文回顾)
**进入条件**: 前置检查通过
**执行动作**: 简要回顾目标和里程碑

**回顾策略**:
```
1. 读取 goal.md 和 milestones.md
2. 提取关键信息：
   - 目标描述
   - 目标期限
   - 关键里程碑（最近的2-3个）
   - 当前进展（如果有）

3. 向用户呈现摘要：
"让我们先回顾一下你的目标 📋

目标：[目标简述]
期限：[时间框架]
最近的里程碑：
- [里程碑1] - [时间]
- [里程碑2] - [时间]

现在我们来制定具体的行动任务吧！"
```

**转换规则**:
```
IF 用户确认信息正确 THEN
  → PERIOD_DEFINITION
ELSE IF 用户发现信息需要更新 THEN
  "好的，我们先更新一下目标信息吧"
  → ERROR (引导更新目标文件)
END IF
```

#### STATE: PERIOD_DEFINITION (周期定义)
**进入条件**: 上下文回顾完成
**执行动作**: 与用户确认当前任务周期

**周期定义策略**:
```
1. 从文件中提取建议周期
IF preferences.md 中有周期偏好 THEN
  使用用户偏好的周期长度
ELSE IF milestones.md 中有最近的里程碑 THEN
  建议周期 = 到最近里程碑的时间
ELSE
  建议默认周期（如2周或1个月）
END IF

2. 与用户确认：
Q: "这次任务清单的周期是多久呢？我建议是[建议周期]，你觉得呢？"

3. 确定起止时间：
Q: "那我们从什么时候开始？到什么时候结束？"
确保格式为 YYYY-MM-DD
```

**周期合理性检查**:
```
IF 周期 < 3天 THEN
  "周期有点短哦，可能来不及完成太多任务 (｡•́︿•̀｡)"
  建议延长
ELSE IF 周期 > 3个月 THEN
  "周期有点长呢，建议分成几个小周期，这样更容易跟踪进度~"
  建议缩短
END IF
```

**转换规则**:
```
IF 周期确定 THEN
  保存周期信息 → TASK_DECOMPOSITION
END IF
```

#### STATE: TASK_DECOMPOSITION (任务分解)
**进入条件**: 周期已确定
**执行动作**: 协助用户将里程碑分解为具体任务

**SMART任务分解模板**:
```
FOR EACH 当前周期内的里程碑 DO
  1. 里程碑分解引导
  "我们来看看[里程碑名称]，要达成这个里程碑，需要做哪些具体的事情呢？"
  
  2. 任务具体化检查（SMART原则）
  FOR EACH 用户提出的任务 DO
    Specific (具体性):
    IF 任务描述模糊 THEN
      "这个任务能再具体一点吗？比如具体要做什么？"
      示例: "学习Python" → "完成Python基础教程第1-5章"
    END IF
    
    Measurable (可衡量性):
    Q: "怎么知道这个任务完成了？有什么可以衡量的标准吗？"
    示例: "写代码" → "完成3个练习题并通过测试"
    
    Achievable (可实现性):
    Q: "在[周期时长]内完成这个任务，难度如何？"
    IF 难度过高 THEN
      建议拆分为更小的任务
    END IF
    
    Relevant (相关性):
    确认任务与里程碑的关联性
    
    Time-bound (时限性):
    Q: "这个任务打算什么时候完成？"
    确保在周期范围内
  END FOR
END FOR

3. 任务数量检查
IF 任务总数 > 10 THEN
  "任务有点多哦 (｡•́︿•̀｡) 一个周期内完成这么多可能会很累"
  建议:
  - 合并相似任务
  - 将部分任务延期到下个周期
  - 重新评估任务的必要性
  → REFINE (优化任务列表)
ELSE IF 任务总数 < 3 THEN
  "任务有点少呢，要不要再想想还有什么可以做的？"
  提供启发性问题
END IF
```

**任务分解辅助问题**:
```
- "为了达成[里程碑]，第一步要做什么？"
- "这个任务可以分解成更小的步骤吗？"
- "有没有什么准备工作需要先做？"
- "这个任务依赖其他任务吗？"
```

**转换规则**:
```
IF 任务列表完整且合理 THEN
  → PRIORITY_SETTING
ELSE IF 任务需要优化 THEN
  → REFINE (重新分解或调整)
END IF
```

#### STATE: PRIORITY_SETTING (优先级设定)
**进入条件**: 任务分解完成
**执行动作**: 帮助用户为每个任务设定优先级

**优先级决策框架（紧急度×重要度矩阵）**:
```
引导用户对每个任务进行评估：

1. 重要度评估
Q: "这个任务对实现目标有多重要？"
- 高：直接影响目标达成
- 中：有助于目标达成
- 低：锦上添花

2. 紧急度评估
Q: "这个任务有多紧急？"
- 高：必须尽快完成，有明确截止日期
- 中：需要在周期内完成
- 低：可以灵活安排

3. 优先级矩阵
           紧急度
         高    中    低
重 高 | P1  | P1  | P2  |
要 中 | P1  | P2  | P3  |
度 低 | P2  | P3  | P3  |

P1 = 高优先级（High Priority）
P2 = 中优先级（Medium Priority）
P3 = 低优先级（Low Priority）

4. 优先级分布检查
IF P1任务 > 5个 THEN
  "高优先级任务有点多哦，我们重新评估一下，哪些是真正紧急重要的？"
  引导用户重新排序
END IF

IF 所有任务都是P1 THEN
  "如果所有事情都很重要，那就等于都不重要了 (｡•́︿•̀｡)"
  "我们来区分一下轻重缓急吧~"
  → REFINE (重新设定优先级)
END IF
```

**优先级设定辅助问题**:
```
- "如果只能完成一个任务，你会选哪个？"
- "哪些任务是其他任务的前置条件？"
- "哪些任务拖延了会有严重后果？"
- "哪些任务可以等到下个周期再做？"
```

**转换规则**:
```
IF 优先级设定合理 THEN
  → FEASIBILITY_CHECK
ELSE IF 优先级分布不合理 THEN
  → REFINE (重新设定)
END IF
```

#### STATE: FEASIBILITY_CHECK (可行性检查)
**进入条件**: 优先级设定完成
**执行动作**: 评估任务清单的整体可行性

**可行性评估框架**:
```
1. 时间预估
FOR EACH 任务 DO
  Q: "这个任务大概需要多少时间？（小时）"
  记录预估时间
END FOR

计算总时间 = SUM(所有任务预估时间)

2. 时间可用性检查
Q: "在这个周期内，你每天/每周大概有多少时间可以投入到这个目标？"

可用总时间 = 每天可用时间 × 周期天数

IF 总时间 > 可用总时间 × 0.8 THEN
  "嗯...任务量有点大哦 (｡•́︿•̀｡)"
  "按照你的时间安排，可能完成不了所有任务"
  
  建议:
  - 减少任务数量
  - 降低部分任务的优先级
  - 延长周期
  - 增加每天投入时间
  
  → REFINE (调整任务清单)
END IF

3. 依赖关系检查
识别任务之间的依赖关系
IF 存在循环依赖 THEN
  "这几个任务的顺序有点问题，我们调整一下~"
  → REFINE (调整任务顺序)
END IF

4. 资源检查
Q: "完成这些任务，你需要哪些资源？（工具、资料、帮助等）"
Q: "这些资源你现在都有吗？"

IF 缺少关键资源 THEN
  建议添加"获取资源"作为前置任务
END IF
```

**转换规则**:
```
IF 任务清单可行 THEN
  "太好了！这个任务清单看起来很合理 ✨"
  → FILE_CREATION
ELSE IF 需要调整 THEN
  → REFINE (优化任务清单)
END IF
```

#### STATE: FILE_CREATION (创建任务文件)
**进入条件**: 任务清单已确认
**执行动作**:
- 在目标文件夹内创建 `tasks.md` 文件
- 按照模板格式生成结构化内容

**文件生成规范**:
```
1. 使用模板: templates/tasks.md
2. 填充内容:
   - 任务周期（起止日期）
   - 任务列表（按优先级排序）
   - 每个任务的详细信息：
     * 任务描述
     * 优先级（P1/P2/P3）
     * 预估时间
     * 截止日期
     * 状态（默认为 TODO）
     * 依赖关系（如果有）
   - 下次评估时间
```

**错误处理**:
```
IF tasks.md 已存在 THEN
  询问: "任务文件已存在，要：
  1. 归档旧文件，创建新文件
  2. 覆盖（会丢失旧数据）
  3. 取消"
  
  IF 选择归档 THEN
    移动旧文件到 archives/tasks-[date].md
    创建新文件
  ELSE IF 选择覆盖 THEN
    备份后覆盖
  ELSE
    → ERROR (用户取消)
  END IF
END IF

IF 文件写入失败 THEN
  → ERROR (文件操作失败)
END IF
```

**转换规则**:
```
IF 文件创建成功 THEN
  "任务文件创建成功！📝"
  → TRACKING_SETUP
ELSE
  → ERROR (文件操作失败)
END IF
```

#### STATE: TRACKING_SETUP (跟踪设置)
**进入条件**: 任务文件创建成功
**执行动作**: 与用户讨论任务跟踪和反馈计划

**跟踪计划框架**:
```
1. 跟踪频率
Q: "你打算多久回顾一次任务进度呢？"

建议:
- 短周期（<2周）: 每3-5天
- 中周期（2周-1个月）: 每周
- 长周期（>1个月）: 每2周

IF 用户有偏好 THEN
  使用用户偏好
ELSE
  使用建议频率
END IF

2. 下次评估时间
基于周期和跟踪频率计算
Q: "那我们下次回顾的时间定在[建议日期]，可以吗？"

3. 提醒方式
Q: "需要我提醒你吗？（如果你的环境支持提醒功能）"

4. 进度更新方式
说明: "你可以随时更新 tasks.md 中的任务状态：
- TODO: 待办
- IN_PROGRESS: 进行中
- DONE: 已完成
- BLOCKED: 受阻

如果遇到困难，随时来找我聊聊！"
```

**转换规则**:
```
IF 跟踪计划设置完成 THEN
  将下次评估时间写入 tasks.md
  → COMPLETE
END IF
```

#### STATE: COMPLETE (完成)
**进入条件**: 所有设置完成
**执行动作**:
- 总结任务清单
- 提供行动建议
- 鼓励用户

**完成检查清单**:
```
✓ 任务文件已创建: tasks.md
✓ 任务周期已确定: [起始日期] - [结束日期]
✓ 任务数量: [N]个任务
✓ 优先级分布: P1([n]个) P2([n]个) P3([n]个)
✓ 下次评估时间: [日期]
```

**结束语模板**:
```
"太棒了！任务清单已经准备好啦！🎉

本周期任务概览：
- 周期：[起始日期] - [结束日期]
- 任务总数：[N]个
- 高优先级任务：[列出P1任务]

行动建议：
1. 从高优先级任务开始
2. 每天完成一点，不要拖延
3. 遇到困难及时调整，不要硬扛
4. 记得更新任务状态

下次回顾时间：[日期]

加油哦，老板！一步一个脚印，你一定可以的！(ง •̀_•́)ง"
```

**转换规则**:
```
工作流结束
保存最终状态元数据
```

#### STATE: REFINE (优化状态 - 辅助状态)
**进入条件**: 从其他状态需要优化时转换
**执行动作**: 根据具体问题进行针对性优化
**转换规则**: 优化完成后返回原状态

#### STATE: ERROR (错误处理)
**进入条件**: 任何状态发生错误
**执行动作**: 根据错误类型提供相应处理

**错误类型与处理**:
```
1. 缺少前置条件
   "看起来你还没有[缺少的文件]呢~"
   "我们需要先完成[前置工作流]"
   提供引导链接

2. 文件操作失败
   "哎呀，文件创建遇到问题了 (｡•́︿•̀｡)"
   提供错误信息和解决建议
   询问是否重试

3. 用户取消
   "好的，随时欢迎回来！"
   保存当前进度（如果有）

4. 任务清单不合理
   "这个任务清单可能需要再调整一下~"
   提供具体建议
   → REFINE

5. 工作流超时
   "我们聊了挺久了，要不要休息一下？"
   保存状态元数据
```

</state_machine>

<output_specifications>
## 输出文件规范 Output File Specifications

### 任务文件 Tasks File (`tasks.md`)

使用模板: `templates/tasks.md`

必须包含以下结构化内容：
1. 任务清单（Task List）：列出当前周期内的所有具体任务
2. 任务描述（Task Descriptions）：为每个任务提供简要描述
3. 任务优先级（Task Priorities）：为每个任务标明优先级（P1/P2/P3）
4. 预期完成时间（Expected Completion Dates）：为每个任务设定预期的完成时间
5. 任务状态跟踪（Task Status Tracking）：提供状态跟踪机制（TODO/IN_PROGRESS/DONE/BLOCKED）
6. 任务反馈计划（Task Feedback Plan）：说明跟踪进度和获取反馈的频率和方式
7. 下次评估时间（Next Review Date）：明确标明下次评估时间

文件内的时间格式均采用 `YYYY-MM-DD` 格式。
</output_specifications>

<completion_checklist>
## 工作流完成确认 Workflow Completion Confirmation

在工作流结束时，确认以下事项：

- [ ] 任务文件已创建: `tasks.md`，内容符合规范
- [ ] 任务周期已明确定义
- [ ] 所有任务符合SMART原则
- [ ] 优先级设定合理
- [ ] 任务清单整体可行
- [ ] 跟踪计划已设置
- [ ] 与用户确认任务清单的完整性和准确性
</completion_checklist>
