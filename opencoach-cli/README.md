# OpenCoach CLI

OpenCoach CLI (`opco`) 是一个标准化的个人成长目标管理命令行工具，用于简化 OpenCoach 工作流中的文件操作，减少 token 占用，提高工作效率。

## 特性

- 🚀 标准化的目标管理工作流
- 📁 自动化的文件和目录操作
- ✅ 文件格式验证和自动修复
- 📊 目标状态查看和追踪
- 🔄 归档和回顾管理
- 🤖 Agent 友好的 JSON 输出模式
- 🛡️ 安全的路径处理和验证

## 安装

```bash
npm install -g opencoach-cli
```

或者在项目中本地安装：

```bash
npm install opencoach-cli
```

## 快速开始

### 1. 初始化项目

```bash
opco init
```

这将创建以下目录结构：
```
.
├── goals/          # 目标目录
├── templates/      # 模板文件
├── workflows/      # 工作流定义
└── .opencoach/     # 配置文件
```

### 2. 创建新目标

```bash
opco create my-first-goal
```

可选参数：
- `--with-preferences`: 同时创建 preferences.md 文件
- `--force`: 强制覆盖已存在的目标

### 3. 查看目标状态

```bash
# 查看所有目标
opco view

# 查看特定目标
opco view my-first-goal
```

### 4. 列出所有目标

```bash
# 列出所有目标
opco list

# 仅显示活跃目标
opco list --active

# 仅显示已完成目标
opco list --completed
```

## 命令参考

### 全局选项

- `--json`: 以 JSON 格式输出结果（适合 Agent 解析）
- `--quiet`: 静默模式，仅输出必要信息
- `-v, --version`: 显示版本号
- `-h, --help`: 显示帮助信息

### 命令列表

#### `opco init`

初始化 OpenCoach 项目，创建标准目录结构。

```bash
opco init
```

#### `opco create <goal-name>`

创建新的目标目录和文件。

```bash
opco create my-goal
opco create my-goal --with-preferences
opco create my-goal --force
```

#### `opco view [goal]`

查看目标状态和详细信息。

```bash
opco view                    # 查看所有目标
opco view my-goal           # 查看特定目标
```

#### `opco list`

列出所有目标。

```bash
opco list                    # 列出所有目标
opco list --active          # 仅活跃目标
opco list --completed       # 仅已完成目标
```

#### `opco check [goal]`

检查文件格式是否符合工作流标准。

```bash
opco check                   # 检查当前目录
opco check my-goal          # 检查特定目标
opco check my-goal --fix    # 自动修复问题
```

#### `opco archive <goal-name>`

归档已完成的任务。

```bash
opco archive my-goal
opco archive my-goal --review 2024-01-31
```

#### `opco update <goal-name>`

更新目标信息。

```bash
opco update my-goal --status completed
opco update my-goal --deadline 2024-12-31
opco update my-goal --field title --value "新标题"
```

#### `opco validate <goal-name>`

验证工作流状态和完整性。

```bash
opco validate my-goal
opco validate my-goal --workflow create-task
```

#### `opco tasks [goal-name]`

显示任务统计信息。

```bash
opco tasks                    # 在目标目录下运行，自动检测目标
opco tasks my-goal           # 显示指定目标的任务统计
opco tasks my-goal --show-tasks  # 显示任务列表
opco tasks my-goal --json    # JSON 格式输出
```

**输出信息**：
- 任务周期（period）
- 总任务数、已完成数、未完成数
- 完成率和进度条
- 任务列表（使用 `--show-tasks` 选项）

#### `opco export <goal-name>`

导出目标数据。

```bash
opco export my-goal                           # 导出为 JSON
opco export my-goal --format yaml            # 导出为 YAML
opco export my-goal --format markdown        # 导出为 Markdown
opco export my-goal --output ./backup.json   # 指定输出路径
```

#### `opco import <file>`

导入目标数据。

```bash
opco import backup.json
opco import backup.json --merge    # 合并而非覆盖
```

#### `opco config <action> [key] [value]`

管理配置。

```bash
opco config set templatePath ./my-templates
opco config get templatePath
opco config list
opco config unset templatePath
```

#### `opco help [command]`

显示帮助信息。

```bash
opco help              # 显示所有命令
opco help create       # 显示特定命令的帮助
```

## Agent 集成

### JSON 输出模式

使用 `--json` 参数可以获得机器可读的 JSON 输出：

```bash
opco list --json
```

输出示例：
```json
{
  "success": true,
  "data": [
    {
      "name": "my-goal",
      "title": "我的目标",
      "status": "active",
      "created": "2024-01-01",
      "updated": "2024-01-31"
    }
  ]
}
```

### 静默模式

使用 `--quiet` 参数减少输出，节省 token：

```bash
opco check my-goal --quiet
```

### 退出码

- `0`: 成功
- `1`: 一般错误
- `2`: 配置错误
- `3`: 验证错误

### 最佳实践

1. **创建目标前先检查**
   ```bash
   opco list --json | grep "my-goal" || opco create my-goal
   ```

2. **归档前验证**
   ```bash
   opco validate my-goal && opco archive my-goal
   ```

3. **批量检查**
   ```bash
   for goal in $(opco list --json | jq -r '.data[].name'); do
     opco check "$goal" --fix
   done
   ```

## 配置

配置文件位于 `.opencoach/config.json`。

可配置项：
- `templatePath`: 模板文件路径（默认使用 CLI 内置模板）
- `archiveDir`: 归档目录名称
- `dateFormat`: 日期格式（默认：YYYY-MM-DD）
- `defaultEditor`: 默认编辑器

示例配置：
```json
{
  "templatePath": "./templates",
  "archiveDir": "archives",
  "dateFormat": "YYYY-MM-DD",
  "defaultEditor": "code"
}
```

### 模板文件

CLI 工具内置了默认的模板文件，包括：
- `goal.md` - 目标模板
- `milestones.md` - 里程碑模板
- `preferences.md` - 偏好设置模板
- `review.md` - 回顾模板
- `tasks.md` - 任务模板
- `Agent.md` - Agent 指南
- 工作流文件（create-goal.md, create-review.md, create-task.md）

**模板文件查找优先级**：
1. 配置的 `templatePath`（用户自定义）
2. CLI 工具内置模板（默认）
3. 项目根目录的 `opencoach/` 目录
4. 父目录的 `opencoach/` 目录

**自定义模板**：
```bash
# 设置自定义模板路径
opco config set templatePath /path/to/custom/templates

# 初始化项目（使用自定义模板）
opco init
```

详细说明请参考 [TEMPLATE_PACKAGING.md](./TEMPLATE_PACKAGING.md)。

## 开发

### 安装依赖

```bash
npm install
```

### 构建

```bash
npm run build
```

**注意**：构建时会自动同步模板文件（从 `../opencoach/` 到 `src/templates/`）。

### 模板文件同步

模板文件只需维护一份（项目根目录的 `opencoach/` 目录），构建时会自动同步到 CLI 项目中。

```bash
# 手动同步模板文件
npm run sync-templates

# 构建时自动同步
npm run build
```

详细说明请参考 [TEMPLATE_SYNC.md](./TEMPLATE_SYNC.md)。

### 运行测试

```bash
npm test
npm run test:watch
npm run test:coverage
```

### 代码检查

```bash
npm run lint
npm run lint:fix
```

## 常见问题

### Q: 如何在本地测试 CLI？

A: 构建后使用 `npm link` 创建全局链接：
```bash
npm run build
npm link
opco --version
```

### Q: 如何调试 CLI？

A: 设置 `DEBUG` 环境变量：
```bash
DEBUG=1 opco create my-goal
```

### Q: 文件格式验证失败怎么办？

A: 使用 `--fix` 参数自动修复：
```bash
opco check my-goal --fix
```

### Q: 如何备份所有目标？

A: 使用 export 命令：
```bash
for goal in $(opco list --json | jq -r '.data[].name'); do
  opco export "$goal" --output "./backups/$goal.json"
done
```

## 贡献

欢迎提交 Issue 和 Pull Request！

## 许可证

MIT

## 更新日志

### 0.1.0 (开发中)

- 初始版本
- 基础命令实现
- 文件格式验证
- Agent 集成支持
