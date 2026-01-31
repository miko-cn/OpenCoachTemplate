# 模板文件打包方案总结

## 问题描述

你提出的问题非常关键：**当我们打包 CLI 工具时，模板文件应该如何处理？**

原来的实现中，模板文件在 `opencoach/` 目录下，但不在 `opencoach-cli/` 项目中，这会导致：
1. 打包 npm 包时，模板文件不会被包含
2. 用户安装 CLI 工具后，无法找到模板文件
3. `opco init` 命令会失败

## 解决方案

### 1. 将模板文件复制到 CLI 项目中

```
opencoach-cli/
└── src/
    └── templates/              # 新增：内置模板目录
        ├── Agent.md
        ├── templates/
        │   ├── goal.md
        │   ├── milestones.md
        │   ├── preferences.md
        │   ├── review.md
        │   └── tasks.md
        └── workflows/
            ├── create-goal.md
            ├── create-review.md
            └── create-task.md
```

### 2. 配置 package.json

添加 `files` 字段，确保模板文件被打包到 npm 包中：

```json
{
  "files": [
    "dist",           // 编译后的 JavaScript 代码
    "src/templates"   // 模板文件（原始 Markdown 文件）
  ]
}
```

### 3. 修改模板文件查找逻辑

在 `src/commands/init.ts` 中，按以下优先级查找模板文件：

```typescript
// 1. 配置的 templatePath（用户自定义）
let templateRoot = await configManager.get('templatePath');

if (!templateRoot) {
  // 2. CLI 工具内置的模板目录（默认）
  const builtinTemplatePath = path.join(__dirname, '..', '..', 'src', 'templates');
  
  if (fs.existsSync(builtinTemplatePath)) {
    templateRoot = builtinTemplatePath;
  } else {
    // 3. 项目根目录的 opencoach 目录（开发环境）
    // 4. 父目录的 opencoach 目录（开发环境）
    // ...
  }
}
```

## 工作原理

### 发布后的包结构

用户通过 `npm install -g opencoach-cli` 安装后：

```
/usr/local/lib/node_modules/opencoach-cli/
├── dist/                       # 编译后的代码
│   ├── cli.js
│   ├── commands/
│   │   └── init.js            # __dirname 指向这里
│   └── ...
├── src/templates/              # 模板文件（原始文件）
│   ├── Agent.md
│   ├── templates/
│   └── workflows/
└── package.json
```

### 路径计算

在编译后的代码中：
- `__dirname` = `/usr/local/lib/node_modules/opencoach-cli/dist/commands/`
- `path.join(__dirname, '..', '..', 'src', 'templates')` = `/usr/local/lib/node_modules/opencoach-cli/src/templates/`

## 优势

1. **自包含**：CLI 工具自带模板文件，用户无需额外配置
2. **灵活性**：支持用户自定义模板路径
3. **开发友好**：开发环境可以使用本地的 opencoach 目录
4. **版本控制**：模板文件随 CLI 工具版本一起管理
5. **体积优化**：只打包必要的文件（dist + src/templates）

## 使用场景

### 场景 1：普通用户（使用内置模板）

```bash
# 安装 CLI 工具
npm install -g opencoach-cli

# 初始化项目（自动使用内置模板）
cd my-project
opco init
```

### 场景 2：高级用户（自定义模板）

```bash
# 设置自定义模板路径
opco config set templatePath /path/to/custom/templates

# 初始化项目（使用自定义模板）
opco init
```

### 场景 3：开发环境

```bash
# 在 OpenCoachTemplate 项目中开发
cd OpenCoachTemplate/opencoach-cli
npm run build
npm link

# 在其他项目中测试
cd ../test-project
opco init  # 会自动找到 ../opencoach/ 目录
```

## 测试验证

所有测试通过（90 个测试用例）：

```bash
npm test

Test Suites: 5 passed, 5 total
Tests:       90 passed, 90 total
```

## 相关文件

- `src/commands/init.ts` - 初始化命令实现
- `src/templates/` - 内置模板文件目录
- `package.json` - npm 包配置（files 字段）
- `TEMPLATE_PACKAGING.md` - 详细的打包说明文档
- `README.md` - 用户文档（包含模板文件说明）

## 总结

这个方案完美解决了模板文件打包的问题：
- ✅ 模板文件随 CLI 工具一起发布
- ✅ 用户安装后即可使用，无需额外配置
- ✅ 支持自定义模板路径
- ✅ 开发环境友好
- ✅ 所有测试通过

感谢你提出这个重要的问题！这确保了 CLI 工具能够正确地打包和发布。
