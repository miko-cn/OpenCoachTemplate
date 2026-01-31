import { Command } from 'commander';
import dayjs from 'dayjs';
import { DateService, ExitCode, LocaleType, FormatType, DateInfo, OffsetResult, DiffResult, WorkdaysResult } from '../services/date-service';
import { logger } from '../utils/logger';
import { ErrorHandler } from '../utils/error-handler';

/**
 * 创建 date 命令
 */
export function createDateCommand(): Command {
  const command = new Command('date');

  command
    .description('日期查询和时间推导工具')
    .allowUnknownOption(false)
    .allowExcessArguments(false)
    .option('--date <date>', '指定日期（YYYY-MM-DD、YYYY/MM/DD、MM-DD、MM/DD格式）')
    .option('--offset <offset>', '时间偏移表达式，支持+/-数字+单位（d=天,w=周,m=月,y=年），如+7d,-1w,+3m，多个偏移用逗号分隔')
    .option('--from <date>', '相对于指定日期计算偏移')
    .option('--diff <date>', '计算与指定日期的差异')
    .option('--workdays', '计算工作日数量')
    .option('--format <format>', '日期格式（short/long/iso或自定义格式字符串）', 'iso')
    .option('--locale <locale>', '语言环境（zh/en）', 'zh')
    .addHelpText('after', `
示例:
  # 基础查询
  $ opco date                           # 当前日期
  $ opco date --date 2024-01-15         # 指定日期
  $ opco date --date 01-15              # 简写格式
  
  # 时间推导
  $ opco date --offset +7d              # 7天后
  $ opco date --offset -1w              # 1周前
  $ opco date --offset +3m              # 3个月后
  $ opco date --offset +1w,+2d          # 1周零2天后
  $ opco date --offset +1w --from 2024-01-01  # 从指定日期开始计算
  
  # 日期比较
  $ opco date --diff 2024-12-31         # 距离年底的天数
  $ opco date --date 2024-01-01 --diff 2024-12-31  # 两个日期的差异
  
  # 工作日计算
  $ opco date --workdays --diff 2024-12-31  # 工作日数
  
  # 格式化
  $ opco date --format short            # 简短格式
  $ opco date --format long             # 完整格式
  $ opco date --format "YYYY年MM月DD日"  # 自定义格式
  
  # 本地化
  $ opco date --locale en               # 英文输出
  
  # JSON输出
  $ opco date --json
  $ opco date --offset +1w --json
`)
    .action(async function(this: Command, options) {
      try {
        // 从父命令获取全局选项（--json, --quiet）
        const parentOpts = this.parent?.opts() || {};
        // 合并本地选项和父命令选项
        const allOptions = { ...parentOpts, ...options };
        
        const dateService = DateService.getInstance();
        
        // 设置语言环境
        const locale = allOptions.locale as LocaleType;
        dateService.setLocale(locale);
        
        // 设置日志模式
        logger.setJsonOutput(allOptions.json || false);

        // 验证参数组合
        const errors: string[] = [];
        
        // --diff 和 --offset 不能同时使用
        if (allOptions.diff && allOptions.offset) {
          errors.push('--diff 和 --offset 不能同时使用');
        }
        
        // --workdays 必须和 --diff 一起使用
        if (allOptions.workdays && !allOptions.diff) {
          errors.push('--workdays 必须和 --diff 一起使用');
        }
        
        // --from 必须和 --offset 一起使用
        if (allOptions.from && !allOptions.offset) {
          errors.push('--from 必须和 --offset 一起使用');
        }
        
        if (errors.length > 0) {
          const errorMsg = '参数错误:\n' + errors.map(err => `  - ${err}`).join('\n');
          // 在JSON模式下输出JSON格式错误
          if (allOptions.json) {
            console.log(JSON.stringify({
              success: false,
              error: errorMsg,
            }, null, 2));
          } else {
            console.log(errorMsg);
          }
          process.exit(ExitCode.PARAMETER_COMBINATION_ERROR);
          return;
        }

        // 解析基准日期
        let baseDate: DateInfo;
        try {
          if (allOptions.date) {
            baseDate = dateService.getDateInfo(dateService.parseDate(allOptions.date), locale);
          } else if (allOptions.from) {
            baseDate = dateService.getDateInfo(dateService.parseDate(allOptions.from), locale);
          } else {
            baseDate = dateService.getDateInfo(dateService.parseDate(dayjs().toISOString()), locale);
          }
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : String(error);
          if (allOptions.json) {
            console.log(JSON.stringify({
              success: false,
              error: errorMsg,
            }, null, 2));
          } else {
            console.log(errorMsg);
          }
          process.exit(ExitCode.DATE_PARSE_ERROR);
          return;
        }

        // 处理不同的操作模式
        if (allOptions.offset) {
          // 时间偏移模式
          await handleOffsetMode(dateService, baseDate, allOptions, locale);
        } else if (allOptions.diff) {
          // 日期比较模式
          await handleDiffMode(dateService, baseDate, allOptions, locale);
        } else {
          // 基础查询模式
          await handleBasicMode(dateService, baseDate, allOptions, locale);
        }

        process.exit(ExitCode.SUCCESS);
      } catch (error) {
        if (error instanceof Error && error.message.includes('无效的偏移表达式')) {
          logger.error(error.message);
          process.exit(ExitCode.OFFSET_EXPRESSION_ERROR);
          return;
        }
        ErrorHandler.handle(error as Error);
      }
    });

  return command;
}

/**
 * 处理基础查询模式
 */
async function handleBasicMode(
  dateService: DateService,
  dateInfo: DateInfo,
  options: any,
  locale: LocaleType
): Promise<void> {
  const format = options.format as FormatType | string;
  
  if (options.json) {
    const result = {
      success: true,
      mode: 'basic',
      data: dateInfo,
    };
    console.log(JSON.stringify(result, null, 2));
  } else {
    // 如果是英文locale且没有指定格式，默认使用long格式
    const actualFormat = locale === 'en' && format === 'iso' ? 'long' : format;
    const formattedDate = dateService.formatDate(
      dateService.parseDate(dateInfo.date),
      actualFormat,
      locale
    );
    
    console.log(`${formattedDate} (${dateInfo.weekday})`);
  }
}

/**
 * 处理时间偏移模式
 */
async function handleOffsetMode(
  dateService: DateService,
  dateInfo: DateInfo,
  options: any,
  locale: LocaleType
): Promise<void> {
  const format = options.format as FormatType | string;
  
  // 解析偏移表达式
  const offsetExpressions = options.offset.split(',').map((s: string) => s.trim());
  
  let currentDate = dateService.parseDate(dateInfo.date);
  const offsets: string[] = [];
  
  try {
    currentDate = dateService.applyMultipleOffsets(currentDate, offsetExpressions);
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    if (options.json) {
      console.log(JSON.stringify({
        success: false,
        error: errorMsg,
      }, null, 2));
    } else {
      console.log(errorMsg);
    }
    process.exit(ExitCode.OFFSET_EXPRESSION_ERROR);
    return;
  }
  
  const offsetDateInfo = dateService.getDateInfo(currentDate, locale);
  // 格式化偏移表达式用于显示：第一个偏移保留+号，后续的正向偏移移除+号
  const displayOffsets = offsetExpressions.map((offset: string, index: number) => {
    if (index === 0) {
      return offset;  // 第一个偏移保留原样
    } else {
      return offset.startsWith('+') ? offset.substring(1) : offset;  // 后续的正向偏移移除+号
    }
  });
  const offsetStr = displayOffsets.join(' + ');
  
  if (options.json) {
    const result: OffsetResult = {
      originalDate: dateInfo,
      offsetDate: offsetDateInfo,
      offsetExpression: offsetExpressions.join(','),
    };
    
    console.log(JSON.stringify({
      success: true,
      mode: 'offset',
      data: result,
    }, null, 2));
  } else {
    const formattedOriginal = dateService.formatDate(
      dateService.parseDate(dateInfo.date),
      format,
      locale
    );
    const formattedOffset = dateService.formatDate(currentDate, format, locale);
    
    console.log(`原始日期: ${formattedOriginal} (${dateInfo.weekday})`);
    console.log(`偏移: ${offsetStr}`);
    console.log(`结果日期: ${formattedOffset} (${offsetDateInfo.weekday})`);
  }
}

/**
 * 处理日期比较模式
 */
async function handleDiffMode(
  dateService: DateService,
  dateInfo: DateInfo,
  options: any,
  locale: LocaleType
): Promise<void> {
  const format = options.format as FormatType | string;
  
  let targetDate: DateInfo;
  try {
    targetDate = dateService.getDateInfo(dateService.parseDate(options.diff), locale);
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    if (options.json) {
      console.log(JSON.stringify({
        success: false,
        error: errorMsg,
      }, null, 2));
    } else {
      console.log(errorMsg);
    }
    process.exit(ExitCode.DATE_PARSE_ERROR);
    return;
  }
  
  const date1 = dateService.parseDate(dateInfo.date);
  const date2 = dateService.parseDate(targetDate.date);
  
  const diffResult = dateService.calculateDiff(date1, date2);
  const workdaysResult = options.workdays 
    ? dateService.calculateWorkdays(date1, date2)
    : null;
  
  if (options.json) {
    const result = {
      date1: date1.format('YYYY-MM-DD'),
      date2: date2.format('YYYY-MM-DD'),
      diff: diffResult,
      ...(workdaysResult ? { workdays: workdaysResult } : {}),
    };
    
    console.log(JSON.stringify({
      success: true,
      mode: 'diff',
      data: result,
    }, null, 2));
  } else {
    const formattedDate1 = dateService.formatDate(date1, format, locale);
    const formattedDate2 = dateService.formatDate(date2, format, locale);
    
    console.log(`日期1: ${formattedDate1} (${dateInfo.weekday})`);
    console.log(`日期2: ${formattedDate2} (${targetDate.weekday})`);
    console.log('');
    
    if (diffResult.days === 0) {
      console.log('两个日期相同');
    } else if (diffResult.days > 0) {
      console.log(`日期2 距离 日期1: ${diffResult.days} 天`);
      console.log(`  ${Math.abs(diffResult.weeks)} 周`);
    } else {
      console.log(`日期2 在 日期1 之前: ${Math.abs(diffResult.days)} 天`);
      console.log(`  ${Math.abs(diffResult.weeks)} 周`);
    }
    
    if (workdaysResult) {
      console.log('');
      console.log(`工作日统计:`);
      console.log(`  总天数: ${workdaysResult.totalDays}`);
      console.log(`  工作日: ${workdaysResult.workdays}`);
      console.log(`  周末: ${workdaysResult.weekends}`);
      if (workdaysResult.holidays > 0) {
        console.log(`  节假日: ${workdaysResult.holidays}`);
      }
    }
  }
}
