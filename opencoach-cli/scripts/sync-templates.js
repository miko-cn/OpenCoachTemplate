#!/usr/bin/env node

/**
 * 同步模板文件脚本
 * 
 * 功能：将项目根目录的 opencoach/ 模板文件复制到 CLI 项目的 src/templates/ 目录
 * 用途：确保只需维护一份模板文件，构建和发布时自动同步
 * 
 * 使用场景：
 * 1. npm run build 时自动执行
 * 2. npm publish 前自动执行
 * 3. 手动执行：node scripts/sync-templates.js
 */

const fs = require('fs-extra');
const path = require('path');

// 颜色输出
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  blue: '\x1b[34m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function syncTemplates() {
  try {
    log('🔄 开始同步模板文件...', 'blue');

    // 路径配置
    const projectRoot = path.join(__dirname, '..', '..');  // OpenCoachTemplate 根目录
    const sourceDir = path.join(projectRoot, 'opencoach');  // 源模板目录
    const targetDir = path.join(__dirname, '..', 'src', 'templates');  // 目标目录

    // 检查源目录是否存在
    if (!fs.existsSync(sourceDir)) {
      log(`❌ 错误：源模板目录不存在: ${sourceDir}`, 'red');
      log('   请确保在 OpenCoachTemplate 项目根目录下存在 opencoach/ 目录', 'yellow');
      process.exit(1);
    }

    // 清空目标目录（如果存在）
    if (fs.existsSync(targetDir)) {
      log(`🗑️  清空目标目录: ${targetDir}`, 'yellow');
      await fs.emptyDir(targetDir);
    } else {
      log(`📁 创建目标目录: ${targetDir}`, 'yellow');
      await fs.ensureDir(targetDir);
    }

    // 复制文件
    log(`📋 复制文件: ${sourceDir} -> ${targetDir}`, 'yellow');
    await fs.copy(sourceDir, targetDir, {
      overwrite: true,
      errorOnExist: false,
    });

    // 统计复制的文件
    const files = await getAllFiles(targetDir);
    log(`✅ 同步完成！共复制 ${files.length} 个文件`, 'green');
    
    // 显示复制的文件列表
    log('\n📄 已复制的文件:', 'blue');
    files.forEach(file => {
      const relativePath = path.relative(targetDir, file);
      log(`   - ${relativePath}`, 'reset');
    });

  } catch (error) {
    log(`❌ 同步失败: ${error.message}`, 'red');
    console.error(error);
    process.exit(1);
  }
}

/**
 * 递归获取目录下的所有文件
 */
async function getAllFiles(dir) {
  const files = [];
  const items = await fs.readdir(dir);

  for (const item of items) {
    const fullPath = path.join(dir, item);
    const stat = await fs.stat(fullPath);

    if (stat.isDirectory()) {
      const subFiles = await getAllFiles(fullPath);
      files.push(...subFiles);
    } else {
      files.push(fullPath);
    }
  }

  return files;
}

// 执行同步
syncTemplates();
