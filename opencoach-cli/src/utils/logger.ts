import chalk from 'chalk';

/**
 * 日志级别
 */
export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error',
  SUCCESS = 'success',
}

/**
 * 日志管理器
 */
export class Logger {
  private quiet: boolean;
  private jsonOutput: boolean;

  constructor(quiet = false, jsonOutput = false) {
    this.quiet = quiet;
    this.jsonOutput = jsonOutput;
  }

  /**
   * 设置静默模式
   */
  setQuiet(quiet: boolean): void {
    this.quiet = quiet;
  }

  /**
   * 设置JSON输出模式
   */
  setJsonOutput(jsonOutput: boolean): void {
    this.jsonOutput = jsonOutput;
  }

  /**
   * 调试信息
   */
  debug(message: string): void {
    if (!this.quiet && process.env.DEBUG) {
      console.log(chalk.gray(`[DEBUG] ${message}`));
    }
  }

  /**
   * 普通信息
   */
  info(message: string): void {
    if (!this.quiet && !this.jsonOutput) {
      console.log(chalk.blue(`ℹ ${message}`));
    }
  }

  /**
   * 警告信息
   */
  warn(message: string): void {
    if (!this.quiet && !this.jsonOutput) {
      console.warn(chalk.yellow(`⚠ ${message}`));
    }
  }

  /**
   * 错误信息
   */
  error(message: string, error?: Error): void {
    if (this.jsonOutput) {
      console.error(JSON.stringify({
        success: false,
        error: message,
        details: error?.message,
        stack: error?.stack,
      }, null, 2));
    } else {
      console.error(chalk.red(`✖ ${message}`));
      if (error && process.env.DEBUG) {
        console.error(chalk.gray(error.stack || ''));
      }
    }
  }

  /**
   * 成功信息
   */
  success(message: string): void {
    if (!this.quiet && !this.jsonOutput) {
      console.log(chalk.green(`✔ ${message}`));
    }
  }

  /**
   * 输出JSON结果
   */
  json(data: any): void {
    if (this.jsonOutput) {
      console.log(JSON.stringify(data, null, 2));
    }
  }

  /**
   * 输出表格数据
   */
  table(data: Record<string, any>[] | string[][]): void {
    if (!this.quiet && !this.jsonOutput) {
      if (data.length === 0) {
        return;
      }

      // 如果是对象数组，转换为二维数组
      if (typeof data[0] === 'object' && !Array.isArray(data[0])) {
        const objData = data as Record<string, any>[];
        const headers = Object.keys(objData[0]);
        const rows = objData.map(obj => headers.map(h => String(obj[h] || '')));
        
        // 输出表头
        console.log(headers.join('\t'));
        console.log(headers.map(() => '─'.repeat(15)).join('\t'));
        
        // 输出数据行
        rows.forEach(row => {
          console.log(row.join('\t'));
        });
      } else {
        // 简单的表格输出
        const stringData = data as string[][];
        stringData.forEach(row => {
          console.log(row.join('\t'));
        });
      }
    }
  }
}

// 导出全局logger实例
export const logger = new Logger();
