# 模板文件同步方案

## 问题

在开发 OpenCoach CLI 工具时，我们需要将模板文件打包到 npm 包中。最初的方案是维护两份模板文件：
1. 项目根目录的 `opencoach/` 目录（源文件）
2. CLI 项目的 `src/templates/` 目录（打包用）

这会导致**维护负担**：每次修改模板文件都需要手动同步两个目录。

## 解决方案

**自动同步方案**：只维护一份源文件，通过构建脚本自动同步。

### 核心思路

1. **单一数据源**：只维护项目根目录的 `opencoach/` 目录
2. **自动同步**：构建和发布时自动复制到 `src/templates/`
3. **Git 忽略**：将 `src/templates/` 添加到 `.gitignore`（可选）

### 实现方式

#### 1. 创建同步脚本

文件：`scripts/sync-templates.js`

```javascript
#!/usr/bin/env node

const fs = require('fs-extra');
const path = require('path');

async function syncTemplates() {
  const sourceDir = path.join(__dirname, '..', '..', 'opencoach');
  const targetDir = path.join(__dirname, '..', 'src', 'templates');
  
  // 清空并复制
  await fs.emptyDir(targetDir);
  await fs.copy(sourceDir, targetDir);
  
  console.log('✅ 模板文件同步完成');
}

syncTemplates();
```

#### 2. 配置 npm scripts

在 `package.json` 中添加：

```json
{
  "scripts": {
    "sync-templates": "node scripts/sync-templates.js",
    "prebuild": "npm run sync-templates",
    "build": "tsc",
    "prepublishOnly": "npm run build"
  }
}
```

#### 3. 自动执行时机

- **构建时**：`npm run build` → 自动执行 `prebuild` → 同步模板
- **发布时**：`npm publish` → 自动执行 `prepublishOnly` → 构建 → 同步模板
- **手动**：`npm run sync-templates` → 手动同步

## 工作流程

### 开发流程

```bash
# 1. 修改模板文件（只需修改一处）
vim ../opencoach/templates/goal.md

# 2. 构建项目（自动同步）
npm run build
# 输出：
# > prebuild
# > sync-templates
# 🔄 开始同步模板文件...
# ✅ 同步完成！共复制 9 个文件

# 3. 测试
npm test
```

### 发布流程

```bash
# 1. 更新版本号
npm version patch

# 2. 发布（自动同步和构建）
npm publish
# 输出：
# > prepublishOnly
# > build
# > prebuild
# > sync-templates
# 🔄 开始同步模板文件...
# ✅ 同步完成！
```

## 目录结构

```
OpenCoachTemplate/
├── opencoach/                    # ✅ 唯一的源文件（需要维护）
│   ├── Agent.md
│   ├── templates/
│   │   ├── goal.md
│   │   ├── milestones.md
│   │   ├── preferences.md
│   │   ├── review.md
│   │   └── tasks.md
│   └── workflows/
│       ├── create-goal.md
│       ├── create-review.md
│       └── create-task.md
│
└── opencoach-cli/
    ├── scripts/
    │   └── sync-templates.js     # 同步脚本
    ├── src/
    │   └── templates/            # ⚠️ 自动生成（不需要手动维护）
    │       ├── Agent.md
    │       ├── templates/
    │       └── workflows/
    └── package.json
```

## 优势

### ✅ 单一数据源
- 只需维护 `opencoach/` 目录
- 避免手动同步的错误
- 减少维护负担

### ✅ 自动化
- 构建时自动同步
- 发布时自动同步
- 无需手动操作

### ✅ 开发友好
- 修改模板文件后，运行 `npm run build` 即可
- 测试时使用最新的模板文件
- 支持手动同步：`npm run sync-templates`

### ✅ Git 友好
- 可以选择将 `src/templates/` 添加到 `.gitignore`
- 或者提交到 Git（作为构建产物）

## Git 策略

### 方案 A：不提交 `src/templates/`（推荐）

**优势**：
- Git 仓库更干净
- 避免重复存储
- 强制使用自动同步

**配置**：
```gitignore
# .gitignore
src/templates/
```

**注意**：
- 克隆仓库后需要运行 `npm run build` 才能生成模板文件
- CI/CD 流程中需要执行构建步骤

### 方案 B：提交 `src/templates/`

**优势**：
- 克隆后即可使用
- 不依赖构建步骤
- 更容易追踪变更

**缺点**：
- 需要记得同步
- Git 历史中有重复内容

## 与其他方案的对比

### ❌ Git Submodule
```bash
# 不推荐：过于复杂
git submodule add ../opencoach opencoach-cli/src/templates
```
- 增加复杂性
- 不适合这个场景

### ❌ Symbolic Link
```bash
# 不推荐：跨平台问题
ln -s ../../opencoach src/templates
```
- Windows 支持不好
- npm 打包可能有问题
- Git 处理符号链接不一致

### ✅ 构建脚本（当前方案）
```bash
# 推荐：简单、可靠、自动化
npm run build  # 自动同步
```
- 简单易懂
- 跨平台兼容
- 完全自动化

## 测试验证

```bash
# 1. 修改源文件
echo "# Test" >> ../opencoach/templates/goal.md

# 2. 同步
npm run sync-templates

# 3. 验证
cat src/templates/templates/goal.md
# 应该包含 "# Test"

# 4. 运行测试
npm test
# Test Suites: 5 passed, 5 total
# Tests:       90 passed, 90 total ✅
```

## 故障排除

### 问题 1：同步失败

**错误**：`❌ 错误：源模板目录不存在`

**解决**：
```bash
# 确保在正确的目录结构中
cd OpenCoachTemplate/opencoach-cli
ls ../opencoach  # 应该能看到模板文件
```

### 问题 2：构建时没有同步

**解决**：
```bash
# 手动执行同步
npm run sync-templates

# 检查 package.json 中的 prebuild 钩子
cat package.json | grep prebuild
```

### 问题 3：测试失败

**解决**：
```bash
# 确保模板文件已同步
npm run sync-templates

# 重新运行测试
npm test
```

## 总结

这个方案完美解决了模板文件维护的问题：

1. ✅ **单一数据源**：只维护 `opencoach/` 目录
2. ✅ **自动同步**：构建和发布时自动复制
3. ✅ **开发友好**：简单的 npm 命令即可
4. ✅ **跨平台**：纯 Node.js 实现，无依赖
5. ✅ **可靠性**：所有测试通过

**推荐工作流**：
```bash
# 修改模板文件
vim ../opencoach/templates/goal.md

# 构建（自动同步）
npm run build

# 测试
npm test

# 发布（自动同步和构建）
npm publish
```

感谢提出这个问题！这个方案大大简化了维护工作。🎉
