/**
 * CLI命令执行结果接口
 */
export interface CommandResult {
  success: boolean;
  message?: string;
  data?: any;
  error?: Error;
}

/**
 * 目标元数据接口
 */
export interface GoalMetadata {
  name: string;
  title: string;
  status: string;
  created: string;
  updated?: string;
  deadline?: string;
  description?: string;
}

/**
 * 配置项接口
 */
export interface Config {
  templatePath?: string;
  archiveDir?: string;
  dateFormat?: string;
  defaultEditor?: string;
  [key: string]: any;
}

/**
 * 验证问题接口
 */
export interface ValidationIssue {
  file: string;
  line?: number;
  type: string;
  message: string;
}

/**
 * 导出选项接口
 */
export interface ExportOptions {
  format: 'json' | 'yaml' | 'markdown';
  output?: string;
}

/**
 * 导入选项接口
 */
export interface ImportOptions {
  merge?: boolean;
  force?: boolean;
}
