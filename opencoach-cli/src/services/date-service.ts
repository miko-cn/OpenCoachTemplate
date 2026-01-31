/**
 * 日期计算服务
 * 
 * 提供日期解析、时间偏移、日期比较、工作日计算等功能
 */

import dayjs from 'dayjs';
import weekday from 'dayjs/plugin/weekday';
import weekOfYear from 'dayjs/plugin/weekOfYear';
import isoWeek from 'dayjs/plugin/isoWeek';
import advancedFormat from 'dayjs/plugin/advancedFormat';
import customParseFormat from 'dayjs/plugin/customParseFormat';
import 'dayjs/locale/en';
import 'dayjs/locale/zh-cn';

// 扩展dayjs插件
dayjs.extend(weekday);
dayjs.extend(weekOfYear);
dayjs.extend(isoWeek);
dayjs.extend(advancedFormat);
dayjs.extend(customParseFormat);

/**
 * 退出码定义
 */
export enum ExitCode {
  SUCCESS = 0,
  DATE_PARSE_ERROR = 1,
  OFFSET_EXPRESSION_ERROR = 2,
  PARAMETER_COMBINATION_ERROR = 3,
  JSON_OUTPUT_ERROR = 4,
}

/**
 * 语言环境类型
 */
export type LocaleType = 'zh' | 'en';

/**
 * 预定义格式类型
 */
export type FormatType = 'short' | 'long' | 'iso' | 'custom';

/**
 * 日期信息
 */
export interface DateInfo {
  date: string;           // 日期字符串 YYYY-MM-DD
  weekday: string;        // 星期几（本地化）
  weekdayIndex: number;   // 星期索引 0-6
  year: number;           // 年
  month: number;          // 月
  day: number;            // 日
  timestamp: number;      // 时间戳
}

/**
 * 时间偏移结果
 */
export interface OffsetResult {
  originalDate: DateInfo;
  offsetDate: DateInfo;
  offsetExpression: string;
}

/**
 * 日期差异结果
 */
export interface DiffResult {
  days: number;           // 总天数
  weeks: number;          // 完整周数
  workdays: number;       // 工作日数
  calendarDays: number;   // 日历天数（始终为正）
}

/**
 * 工作日计算结果
 */
export interface WorkdaysResult {
  startDate: string;
  endDate: string;
  totalDays: number;
  workdays: number;
  weekends: number;
  holidays: number;
}

/**
 * 日期计算选项
 */
export interface DateCalculationOptions {
  locale?: LocaleType;
  format?: string;
  holidays?: string[];    // 节假日列表 YYYY-MM-DD
}

/**
 * 日期计算服务类
 */
export class DateService {
  private static instance: DateService;
  private defaultHolidays: string[] = [];
  private locale: LocaleType = 'zh';

  private constructor() {}

  /**
   * 获取单例实例
   */
  public static getInstance(): DateService {
    if (!DateService.instance) {
      DateService.instance = new DateService();
    }
    return DateService.instance;
  }

  /**
   * 设置默认节假日
   */
  public setDefaultHolidays(holidays: string[]): void {
    this.defaultHolidays = holidays;
  }

  /**
   * 设置语言环境
   */
  public setLocale(locale: LocaleType): void {
    this.locale = locale;
    // 同时设置dayjs的locale（全局设置）
    if (locale === 'en') {
      dayjs.locale('en');
    } else {
      dayjs.locale('zh-cn'); // 中文locale
    }
  }

  /**
   * 解析日期字符串
   * 
   * @param dateStr 日期字符串，支持多种格式
   * @returns 解析后的dayjs对象
   * @throws 如果日期格式无效
   */
  public parseDate(dateStr: string): dayjs.Dayjs {
    // 支持的日期格式
    const formats = [
      'YYYY-MM-DD',      // 2024-01-15
      'YYYY/MM/DD',      // 2024/01/15
      'MM-DD',           // 01-15 (使用当前年份)
      'MM/DD',           // 01/15 (使用当前年份)
      'YYYYMMDD',        // 20240115
    ];

    // 尝试按格式解析
    for (const format of formats) {
      const parsed = dayjs(dateStr, format, true);
      if (parsed.isValid()) {
        // 对于不包含年份的格式，需要特别处理
        if (format === 'MM-DD' || format === 'MM/DD') {
          const currentYear = dayjs().year();
          return parsed.year(currentYear);
        }
        
        // 验证日期是否真的有效（例如：2024-02-30 无效）
        // 检查输入和解析后的月份、日期是否匹配
        const parts = dateStr.split(/[-\/]/);
        if (parts.length >= 2) {
          const inputMonth = parseInt(
            format === 'YYYYMMDD' ? dateStr.substring(4, 6) : parts[format === 'YYYY-MM-DD' || format === 'YYYY/MM/DD' ? 1 : 0], 
            10
          );
          const inputDay = parseInt(
            format === 'YYYYMMDD' ? dateStr.substring(6, 8) : parts[format === 'YYYY-MM-DD' || format === 'YYYY/MM/DD' ? 2 : 1], 
            10
          );
          const parsedMonth = parsed.month() + 1;
          const parsedDay = parsed.date();

          // 如果输入的月份和日期与解析后的不匹配，说明日期无效（如 2024-02-30 会被自动修正为 2024-03-02）
          if (inputMonth === parsedMonth && inputDay === parsedDay) {
            return parsed;
          }
        }
      }
    }

    // 尝试ISO格式（包含时间）
    const isoParsed = dayjs(dateStr);
    if (isoParsed.isValid()) {
      // 验证ISO格式的日期是否有效
      const formattedIso = isoParsed.format('YYYY-MM-DD');
      const parts = dateStr.split(/[-T]/);
      if (parts.length >= 3) {
        const inputDay = parseInt(parts[2].split(' ')[0], 10);
        const parsedDay = isoParsed.date();
        if (inputDay !== parsedDay) {
          // 日期被自动修正了，说明输入无效
          throw new Error(
            `无法解析日期: "${dateStr}"\n` +
            `原因: 日期不存在（可能是因为月份天数不足，如2月30日）\n` +
            `支持的格式: YYYY-MM-DD (如 2024-01-15)\n` +
            `            YYYY/MM/DD (如 2024/01/15)\n` +
            `            MM-DD (如 01-15)\n` +
            `            MM/DD (如 01/15)\n` +
            `            YYYYMMDD (如 20240115)`
          );
        }
      }
      return isoParsed;
    }

    throw new Error(
      `无法解析日期: "${dateStr}"\n` +
      `支持的格式: YYYY-MM-DD (如 2024-01-15)\n` +
      `            YYYY/MM/DD (如 2024/01/15)\n` +
      `            MM-DD (如 01-15)\n` +
      `            MM/DD (如 01/15)\n` +
      `            YYYYMMDD (如 20240115)`
    );
  }

  /**
   * 获取日期信息
   * 
   * @param date 日期
   * @param locale 语言环境（可选，如果不提供则使用实例的locale设置）
   * @returns 日期信息
   */
  public getDateInfo(date: dayjs.Dayjs, locale?: LocaleType): DateInfo {
    const weekdaysZh = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'];
    const weekdaysEn = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    
    // 使用提供的locale参数，如果没有提供则使用实例的locale属性
    const actualLocale = locale || this.locale;

    return {
      date: date.format('YYYY-MM-DD'),
      weekday: actualLocale === 'zh' ? weekdaysZh[date.day()] : weekdaysEn[date.day()],
      weekdayIndex: date.day(),
      year: date.year(),
      month: date.month() + 1,
      day: date.date(),
      timestamp: date.valueOf(),
    };
  }

  /**
   * 计算时间偏移
   * 
   * @param date 起始日期
   * @param offset 偏移表达式，如 "+7d", "-1w", "+3m"
   * @returns 偏移后的日期信息
   */
  public applyOffset(date: dayjs.Dayjs, offset: string): dayjs.Dayjs {
    const offsetRegex = /^([+-])(\d+)([dwmy])$/;
    const match = offset.match(offsetRegex);

    if (!match) {
      throw new Error(
        `无效的偏移表达式: "${offset}"\n` +
        `正确的格式: [+|-][数字][单位]\n` +
        `单位: d=天, w=周, m=月, y=年\n` +
        `示例: +7d, -1w, +3m, -2y`
      );
    }

    const [, sign, amount, unit] = match;
    const numAmount = parseInt(amount, 10) * (sign === '+' ? 1 : -1);

    switch (unit) {
      case 'd':
        return date.add(numAmount, 'day');
      case 'w':
        return date.add(numAmount, 'week');
      case 'm':
        return date.add(numAmount, 'month');
      case 'y':
        return date.add(numAmount, 'year');
      default:
        throw new Error(`不支持的偏移单位: ${unit}`);
    }
  }

  /**
   * 应用多个偏移表达式
   * 
   * @param date 起始日期
   * @param offsets 偏移表达式数组
   * @returns 最终偏移后的日期
   */
  public applyMultipleOffsets(date: dayjs.Dayjs, offsets: string[]): dayjs.Dayjs {
    let result = date;
    for (const offset of offsets) {
      result = this.applyOffset(result, offset);
    }
    return result;
  }

  /**
   * 计算日期差异
   * 
   * @param date1 第一个日期
   * @param date2 第二个日期
   * @param holidays 节假日列表
   * @returns 日期差异信息
   */
  public calculateDiff(
    date1: dayjs.Dayjs,
    date2: dayjs.Dayjs,
    holidays: string[] = []
  ): DiffResult {
    const days = date2.diff(date1, 'day');
    const calendarDays = Math.abs(days);
    const weeks = Math.floor(calendarDays / 7);

    // 计算工作日（不包括date2）
    // 如果date2在date1之后，则计算date1到date2前一天的工作日
    // 如果date2在date1之前，则计算date2到date1前一天的工作日
    let workdayEnd = date2;
    if (days > 0) {
      workdayEnd = date2.add(-1, 'day');
    } else if (days < 0) {
      workdayEnd = date1.add(-1, 'day');
    }
    
    const workdays = this.calculateWorkdays(date1, workdayEnd, holidays).workdays;

    return {
      days,
      weeks,
      workdays,
      calendarDays,
    };
  }

  /**
   * 计算工作日
   * 
   * @param startDate 开始日期
   * @param endDate 结束日期
   * @param holidays 节假日列表
   * @returns 工作日计算结果
   */
  public calculateWorkdays(
    startDate: dayjs.Dayjs,
    endDate: dayjs.Dayjs,
    holidays: string[] = []
  ): WorkdaysResult {
    // 确保startDate <= endDate
    const start = startDate.isBefore(endDate) ? startDate : endDate;
    const end = startDate.isBefore(endDate) ? endDate : startDate;

    let totalDays = 0;
    let workdays = 0;
    let weekends = 0;

    // 遍历日期（包含start和end）
    let current = start.clone();
    while (current.isBefore(end) || current.isSame(end, 'day')) {
      totalDays++;
      const dayOfWeek = current.day();

      // 检查是否为周末
      if (dayOfWeek === 0 || dayOfWeek === 6) {
        weekends++;
      } else {
        // 检查是否为节假日
        const dateStr = current.format('YYYY-MM-DD');
        if (!holidays.includes(dateStr) && !this.defaultHolidays.includes(dateStr)) {
          workdays++;
        }
      }

      current = current.add(1, 'day');
    }

    return {
      startDate: start.format('YYYY-MM-DD'),
      endDate: end.format('YYYY-MM-DD'),
      totalDays,
      workdays,
      weekends,
      holidays: totalDays - workdays - weekends,
    };
  }

  /**
   * 格式化日期
   * 
   * @param date 日期
   * @param format 格式类型
   * @param locale 语言环境（可选，如果不提供则使用实例的locale设置）
   * @returns 格式化后的日期字符串
   */
  public formatDate(
    date: dayjs.Dayjs,
    format: FormatType | string = 'iso',
    locale?: LocaleType
  ): string {
    // 使用提供的locale参数，如果没有提供则使用实例的locale属性
    const actualLocale = locale || this.locale;
    
    // 创建副本并设置locale（局部设置，不影响全局）
    const dateClone = date.clone();
    if (actualLocale === 'en') {
      dateClone.locale('en');
    } else {
      dateClone.locale('zh-cn');
    }
    
    if (format === 'short') {
      if (actualLocale === 'zh') {
        return dateClone.format('MM月DD日');
      } else {
        // 英文短格式：使用英文月份缩写，如 Jan 15
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const month = monthNames[dateClone.month()];
        const day = dateClone.date();
        return `${month} ${day}`;
      }
    } else if (format === 'long') {
      if (actualLocale === 'zh') {
        return dateClone.format('YYYY年MM月DD日');
      } else {
        // 英文长格式
        const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
        const month = monthNames[dateClone.month()];
        const day = dateClone.date();
        const year = dateClone.year();
        return `${month} ${day}, ${year}`;
      }
    } else if (format === 'iso') {
      return dateClone.format('YYYY-MM-DD');
    } else {
      // 自定义格式
      return dateClone.format(format);
    }
  }

  /**
   * 获取特定工作日的日期
   * 
   * @param date 基准日期
   * @param weekday 目标星期几 (0=周日, 1=周一, ..., 6=周六)
   * @param offset 周数偏移 (0=本周, 1=下周, -1=上周)
   * @returns 目标日期
   */
  public getWeekday(date: dayjs.Dayjs, weekday: number, offset: number = 0): dayjs.Dayjs {
    // dayjs的day()使用0=周日, 1=周一, ..., 6=周六，正好与我们的参数一致
    // 首先找到本周一（或本周日）
    const currentDayOfWeek = date.day();
    // 计算到目标工作日的差值
    const diff = weekday - currentDayOfWeek;
    // 加上周数偏移
    return date.add(diff + offset * 7, 'day');
  }

  /**
   * 获取月份的第一天
   * 
   * @param date 日期
   * @returns 该月第一天
   */
  public getFirstDayOfMonth(date: dayjs.Dayjs): dayjs.Dayjs {
    return date.startOf('month');
  }

  /**
   * 获取月份的最后一天
   * 
   * @param date 日期
   * @returns 该月最后一天
   */
  public getLastDayOfMonth(date: dayjs.Dayjs): dayjs.Dayjs {
    return date.endOf('month');
  }

  /**
   * 获取年份的第一天
   * 
   * @param date 日期
   * @returns 该年第一天
   */
  public getFirstDayOfYear(date: dayjs.Dayjs): dayjs.Dayjs {
    return date.startOf('year');
  }

  /**
   * 获取年份的最后一天
   * 
   * @param date 日期
   * @returns 该年最后一天
   */
  public getLastDayOfYear(date: dayjs.Dayjs): dayjs.Dayjs {
    return date.endOf('year');
  }
}
