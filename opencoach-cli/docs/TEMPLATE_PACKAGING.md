# 模板文件打包说明

## 问题

CLI 工具需要在初始化项目时复制模板文件，但这些模板文件需要随 npm 包一起发布。

## 解决方案

### 1. 模板文件位置

模板文件存放在 `src/templates/` 目录下：

```
src/templates/
├── Agent.md                    # Agent 指南
├── templates/                  # 模板文件目录
│   ├── goal.md                # 目标模板
│   ├── milestones.md          # 里程碑模板
│   ├── preferences.md         # 偏好设置模板
│   ├── review.md              # 回顾模板
│   └── tasks.md               # 任务模板
└── workflows/                  # 工作流文件目录
    ├── create-goal.md         # 创建目标工作流
    ├── create-review.md       # 创建回顾工作流
    └── create-task.md         # 创建任务工作流
```

### 2. package.json 配置

在 `package.json` 中添加 `files` 字段，确保模板文件被打包：

```json
{
  "files": [
    "dist",           // 编译后的 JavaScript 代码
    "src/templates"   // 模板文件（原始 Markdown 文件）
  ]
}
```

### 3. 模板文件查找逻辑

`init` 命令按以下优先级查找模板文件：

1. **配置的 templatePath**（用户自定义）
   ```bash
   opco config set templatePath /path/to/custom/templates
   ```

2. **CLI 工具内置的模板目录**（打包在 npm 包中）
   - 路径：`<npm-package-root>/src/templates/`
   - 这是默认使用的模板目录

3. **项目根目录的 opencoach 目录**
   - 路径：`./opencoach/`
   - 用于开发环境

4. **父目录的 opencoach 目录**
   - 路径：`../opencoach/`
   - 用于开发环境

### 4. 代码实现

在 `src/commands/init.ts` 中：

```typescript
// __dirname 在编译后指向 dist/commands/
// 模板文件在 src/templates/ 目录，打包后会在包的根目录
const builtinTemplatePath = path.join(__dirname, '..', '..', 'src', 'templates');

if (fs.existsSync(builtinTemplatePath)) {
  templateRoot = builtinTemplatePath;
  logger.debug(`使用内置模板目录: ${templateRoot}`);
}
```

### 5. 发布流程

当发布 npm 包时：

```bash
# 1. 构建项目
npm run build

# 2. 发布到 npm（会自动包含 dist/ 和 src/templates/）
npm publish
```

### 6. 用户安装后的目录结构

用户通过 `npm install -g opencoach-cli` 安装后，包的结构：

```
/usr/local/lib/node_modules/opencoach-cli/
├── dist/                       # 编译后的代码
│   ├── cli.js
│   ├── commands/
│   │   └── init.js
│   └── ...
├── src/templates/              # 模板文件
│   ├── Agent.md
│   ├── templates/
│   └── workflows/
└── package.json
```

### 7. 更新模板文件

如果需要更新模板文件：

1. 修改 `src/templates/` 目录下的文件
2. 重新构建和发布：
   ```bash
   npm run build
   npm version patch  # 或 minor/major
   npm publish
   ```

### 8. 开发环境

在开发环境中，可以使用以下两种方式：

**方式 1：使用项目根目录的 opencoach 目录**
```bash
# 在 OpenCoachTemplate 目录下
cd my-project
opco init  # 会自动找到 ../opencoach/ 目录
```

**方式 2：配置自定义模板路径**
```bash
opco config set templatePath /path/to/OpenCoachTemplate/opencoach
opco init
```

## 优势

1. **自包含**：CLI 工具自带模板文件，用户无需额外下载
2. **灵活性**：支持用户自定义模板路径
3. **开发友好**：开发环境可以使用本地的 opencoach 目录
4. **版本控制**：模板文件随 CLI 工具版本一起管理

## 注意事项

1. 模板文件是 Markdown 格式，不需要编译，直接打包原始文件
2. `files` 字段确保只打包必要的文件，减小包体积
3. 模板文件的路径计算基于 `__dirname`，在编译后的代码中正确工作
4. 测试环境中，可以通过配置 `templatePath` 来指定测试用的模板目录
