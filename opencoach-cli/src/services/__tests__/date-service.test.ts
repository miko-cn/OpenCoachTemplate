/**
 * 日期服务测试
 * 
 * 测试 DateService 类的所有功能：
 * - 日期解析
 * - 时间偏移计算
 * - 日期差异计算
 * - 工作日计算
 * - 日期格式化
 * - 辅助方法（月份/年份边界等）
 */

import dayjs from 'dayjs';
import {
  DateService,
  ExitCode,
  LocaleType,
  FormatType,
  DateInfo,
  OffsetResult,
  DiffResult,
  WorkdaysResult,
} from '../../services/date-service';

describe('DateService', () => {
  let dateService: DateService;

  beforeEach(() => {
    dateService = DateService.getInstance();
  });

  afterEach(() => {
    // 清理配置
    dateService.setDefaultHolidays([]);
    dateService.setLocale('zh');
  });

  describe('单例模式', () => {
    test('应该返回相同的实例', () => {
      const service1 = DateService.getInstance();
      const service2 = DateService.getInstance();
      expect(service1).toBe(service2);
    });
  });

  describe('日期解析', () => {
    describe('有效日期格式', () => {
      test('应该解析 YYYY-MM-DD 格式', () => {
        const date = dateService.parseDate('2024-01-15');
        expect(date.year()).toBe(2024);
        expect(date.month()).toBe(0); // month 是 0-indexed
        expect(date.date()).toBe(15);
      });

      test('应该解析 YYYY/MM/DD 格式', () => {
        const date = dateService.parseDate('2024/01/15');
        expect(date.year()).toBe(2024);
        expect(date.month()).toBe(0);
        expect(date.date()).toBe(15);
      });

      test('应该解析 MM-DD 格式并使用当前年份', () => {
        const currentYear = dayjs().year();
        const date = dateService.parseDate('01-15');
        expect(date.year()).toBe(currentYear);
        expect(date.month()).toBe(0);
        expect(date.date()).toBe(15);
      });

      test('应该解析 MM/DD 格式并使用当前年份', () => {
        const currentYear = dayjs().year();
        const date = dateService.parseDate('01/15');
        expect(date.year()).toBe(currentYear);
        expect(date.month()).toBe(0);
        expect(date.date()).toBe(15);
      });

      test('应该解析 YYYYMMDD 格式', () => {
        const date = dateService.parseDate('20240115');
        expect(date.year()).toBe(2024);
        expect(date.month()).toBe(0);
        expect(date.date()).toBe(15);
      });

      test('应该解析 ISO 格式', () => {
        const date = dateService.parseDate('2024-01-15T10:30:00Z');
        expect(date.year()).toBe(2024);
        expect(date.month()).toBe(0);
        expect(date.date()).toBe(15);
      });
    });

    describe('无效日期格式', () => {
      test('应该拒绝无效的日期格式', () => {
        expect(() => {
          dateService.parseDate('2024/01/15/extra');
        }).toThrow('无法解析日期');
      });

      test('应该拒绝不存在的日期', () => {
        expect(() => {
          dateService.parseDate('2024-02-30');
        }).toThrow('无法解析日期');
      });

      test('应该拒绝无效的格式字符串', () => {
        expect(() => {
          dateService.parseDate('invalid-date');
        }).toThrow('无法解析日期');
      });
    });
  });

  describe('日期信息', () => {
    test('应该返回中文日期信息', () => {
      const date = dayjs('2024-01-15'); // 星期一
      const info = dateService.getDateInfo(date, 'zh');

      expect(info.date).toBe('2024-01-15');
      expect(info.weekday).toBe('星期一');
      expect(info.weekdayIndex).toBe(1);
      expect(info.year).toBe(2024);
      expect(info.month).toBe(1);
      expect(info.day).toBe(15);
      expect(info.timestamp).toBeGreaterThan(0);
    });

    test('应该返回英文日期信息', () => {
      const date = dayjs('2024-01-15'); // 星期一
      const info = dateService.getDateInfo(date, 'en');

      expect(info.date).toBe('2024-01-15');
      expect(info.weekday).toBe('Monday');
      expect(info.weekdayIndex).toBe(1);
      expect(info.year).toBe(2024);
      expect(info.month).toBe(1);
      expect(info.day).toBe(15);
    });

    test('应该正确处理星期日（索引0）', () => {
      const date = dayjs('2024-01-14'); // 星期日
      const info = dateService.getDateInfo(date, 'zh');

      expect(info.weekday).toBe('星期日');
      expect(info.weekdayIndex).toBe(0);
    });

    test('应该正确处理星期六（索引6）', () => {
      const date = dayjs('2024-01-20'); // 星期六
      const info = dateService.getDateInfo(date, 'zh');

      expect(info.weekday).toBe('星期六');
      expect(info.weekdayIndex).toBe(6);
    });
  });

  describe('时间偏移', () => {
    describe('单一偏移', () => {
      test('应该支持正的天数偏移', () => {
        const date = dayjs('2024-01-15');
        const result = dateService.applyOffset(date, '+7d');

        expect(result.format('YYYY-MM-DD')).toBe('2024-01-22');
      });

      test('应该支持负的天数偏移', () => {
        const date = dayjs('2024-01-15');
        const result = dateService.applyOffset(date, '-7d');

        expect(result.format('YYYY-MM-DD')).toBe('2024-01-08');
      });

      test('应该支持周偏移', () => {
        const date = dayjs('2024-01-15');
        const result = dateService.applyOffset(date, '+1w');

        expect(result.format('YYYY-MM-DD')).toBe('2024-01-22');
      });

      test('应该支持月偏移', () => {
        const date = dayjs('2024-01-15');
        const result = dateService.applyOffset(date, '+1m');

        expect(result.format('YYYY-MM-DD')).toBe('2024-02-15');
      });

      test('应该支持年偏移', () => {
        const date = dayjs('2024-01-15');
        const result = dateService.applyOffset(date, '+1y');

        expect(result.format('YYYY-MM-DD')).toBe('2025-01-15');
      });

      test('应该处理跨月的天数偏移', () => {
        const date = dayjs('2024-01-31');
        const result = dateService.applyOffset(date, '+1d');

        expect(result.format('YYYY-MM-DD')).toBe('2024-02-01');
      });

      test('应该处理闰年', () => {
        const date = dayjs('2024-02-28'); // 2024是闰年
        const result = dateService.applyOffset(date, '+1d');

        expect(result.format('YYYY-MM-DD')).toBe('2024-02-29');
      });
    });

    describe('多个偏移', () => {
      test('应该支持多个连续偏移', () => {
        const date = dayjs('2024-01-15');
        const result = dateService.applyMultipleOffsets(date, ['+1w', '+2d']);

        expect(result.format('YYYY-MM-DD')).toBe('2024-01-24');
      });

      test('应该支持正负混合偏移', () => {
        const date = dayjs('2024-01-15');
        const result = dateService.applyMultipleOffsets(date, ['+1w', '-2d']);

        expect(result.format('YYYY-MM-DD')).toBe('2024-01-20');
      });

      test('应该支持三个或更多偏移', () => {
        const date = dayjs('2024-01-15');
        const result = dateService.applyMultipleOffsets(date, ['+1w', '+2d', '-1w', '+5d']);

        expect(result.format('YYYY-MM-DD')).toBe('2024-01-22');
      });
    });

    describe('无效偏移表达式', () => {
      test('应该拒绝缺少符号的偏移', () => {
        const date = dayjs('2024-01-15');
        expect(() => {
          dateService.applyOffset(date, '7d');
        }).toThrow('无效的偏移表达式');
      });

      test('应该拒绝无效的单位', () => {
        const date = dayjs('2024-01-15');
        expect(() => {
          dateService.applyOffset(date, '+7x');
        }).toThrow('无效的偏移表达式');
      });

      test('应该拒绝非数字数量', () => {
        const date = dayjs('2024-01-15');
        expect(() => {
          dateService.applyOffset(date, '+xyzd');
        }).toThrow('无效的偏移表达式');
      });
    });
  });

  describe('日期差异', () => {
    test('应该计算正的天数差异（date2在date1之后）', () => {
      const date1 = dayjs('2024-01-01');
      const date2 = dayjs('2024-01-08');
      const diff = dateService.calculateDiff(date1, date2);

      expect(diff.days).toBe(7);
      expect(diff.weeks).toBe(1);
      expect(diff.calendarDays).toBe(7);
      expect(diff.workdays).toBe(5); // 1周一到1月8日，1个周日，5个工作日
    });

    test('应该计算负的天数差异（date2在date1之前）', () => {
      const date1 = dayjs('2024-01-08');
      const date2 = dayjs('2024-01-01');
      const diff = dateService.calculateDiff(date1, date2);

      expect(diff.days).toBe(-7);
      expect(diff.weeks).toBe(1);
      expect(diff.calendarDays).toBe(7);
    });

    test('应该处理相同日期', () => {
      const date1 = dayjs('2024-01-01');
      const date2 = dayjs('2024-01-01');
      const diff = dateService.calculateDiff(date1, date2);

      expect(diff.days).toBe(0);
      expect(diff.weeks).toBe(0);
      expect(diff.calendarDays).toBe(0);
    });

    test('应该处理跨月的差异', () => {
      const date1 = dayjs('2024-01-25');
      const date2 = dayjs('2024-02-05');
      const diff = dateService.calculateDiff(date1, date2);

      expect(diff.days).toBe(11);
    });

    test('应该处理跨年的差异', () => {
      const date1 = dayjs('2023-12-25');
      const date2 = dayjs('2024-01-05');
      const diff = dateService.calculateDiff(date1, date2);

      expect(diff.days).toBe(11);
    });
  });

  describe('工作日计算', () => {
    describe('基本工作日计算', () => {
      test('应该正确计算一周的工作日', () => {
        const startDate = dayjs('2024-01-08'); // 星期一
        const endDate = dayjs('2024-01-12');   // 星期五
        const workdays = dateService.calculateWorkdays(startDate, endDate);

        expect(workdays.totalDays).toBe(5);
        expect(workdays.workdays).toBe(5);
        expect(workdays.weekends).toBe(0);
        expect(workdays.holidays).toBe(0);
      });

      test('应该正确计算包含周末的工作日', () => {
        const startDate = dayjs('2024-01-08'); // 星期一
        const endDate = dayjs('2024-01-14');   // 星期日
        const workdays = dateService.calculateWorkdays(startDate, endDate);

        expect(workdays.totalDays).toBe(7);
        expect(workdays.workdays).toBe(5);
        expect(workdays.weekends).toBe(2);
        expect(workdays.holidays).toBe(0);
      });

      test('应该正确计算仅周末的工作日', () => {
        const startDate = dayjs('2024-01-13'); // 星期六
        const endDate = dayjs('2024-01-14');   // 星期日
        const workdays = dateService.calculateWorkdays(startDate, endDate);

        expect(workdays.totalDays).toBe(2);
        expect(workdays.workdays).toBe(0);
        expect(workdays.weekends).toBe(2);
        expect(workdays.holidays).toBe(0);
      });

      test('应该处理反序日期（startDate > endDate）', () => {
        const startDate = dayjs('2024-01-14'); // 星期日
        const endDate = dayjs('2024-01-08');   // 星期一
        const workdays = dateService.calculateWorkdays(startDate, endDate);

        expect(workdays.totalDays).toBe(7);
        expect(workdays.workdays).toBe(5);
        expect(workdays.weekends).toBe(2);
      });
    });

    describe('节假日处理', () => {
      test('应该从工作日中排除指定的节假日', () => {
        const startDate = dayjs('2024-01-08'); // 星期一
        const endDate = dayjs('2024-01-12');   // 星期五
        const holidays = ['2024-01-10'];       // 周三
        const workdays = dateService.calculateWorkdays(startDate, endDate, holidays);

        expect(workdays.totalDays).toBe(5);
        expect(workdays.workdays).toBe(4);
        expect(workdays.weekends).toBe(0);
        expect(workdays.holidays).toBe(1);
      });

      test('应该处理多个节假日', () => {
        const startDate = dayjs('2024-01-08'); // 星期一
        const endDate = dayjs('2024-01-12');   // 星期五
        const holidays = ['2024-01-09', '2024-01-11']; // 周二和周四
        const workdays = dateService.calculateWorkdays(startDate, endDate, holidays);

        expect(workdays.totalDays).toBe(5);
        expect(workdays.workdays).toBe(3);
        expect(workdays.holidays).toBe(2);
      });

      test('应该使用默认节假日设置', () => {
        dateService.setDefaultHolidays(['2024-01-10']);
        const startDate = dayjs('2024-01-08'); // 星期一
        const endDate = dayjs('2024-01-12');   // 星期五
        const workdays = dateService.calculateWorkdays(startDate, endDate);

        expect(workdays.totalDays).toBe(5);
        expect(workdays.workdays).toBe(4);
        expect(workdays.holidays).toBe(1);
      });

      test('应该合并临时节假日和默认节假日', () => {
        dateService.setDefaultHolidays(['2024-01-09']);
        const startDate = dayjs('2024-01-08'); // 星期一
        const endDate = dayjs('2024-01-12');   // 星期五
        const holidays = ['2024-01-11'];
        const workdays = dateService.calculateWorkdays(startDate, endDate, holidays);

        expect(workdays.totalDays).toBe(5);
        expect(workdays.workdays).toBe(3);
        expect(workdays.holidays).toBe(2);
      });
    });

    describe('长时间跨度', () => {
      test('应该正确计算一个月的工作日', () => {
        const startDate = dayjs('2024-01-01'); // 星期一
        const endDate = dayjs('2024-01-31');   // 星期三
        const workdays = dateService.calculateWorkdays(startDate, endDate);

        expect(workdays.totalDays).toBe(31);
        expect(workdays.workdays).toBe(23);  // 2024年1月：31天，包含8个周末日
        expect(workdays.weekends).toBe(8);
      });

      test('应该正确计算一年的工作日（不含节假日）', () => {
        const startDate = dayjs('2024-01-01'); // 星期一
        const endDate = dayjs('2024-12-31');   // 星期二
        const workdays = dateService.calculateWorkdays(startDate, endDate);

        expect(workdays.totalDays).toBe(366); // 2024是闰年
        expect(workdays.workdays).toBe(262);
        expect(workdays.weekends).toBe(104);
      });
    });
  });

  describe('日期格式化', () => {
    describe('预定义格式', () => {
      test('应该格式化为短格式（中文）', () => {
        const date = dayjs('2024-01-15');
        const formatted = dateService.formatDate(date, 'short', 'zh');
        expect(formatted).toBe('01月15日');
      });

      test('应该格式化为短格式（英文）', () => {
        const date = dayjs('2024-01-15');
        const formatted = dateService.formatDate(date, 'short', 'en');
        expect(formatted).toBe('Jan 15');
      });

      test('应该格式化为长格式（中文）', () => {
        const date = dayjs('2024-01-15');
        const formatted = dateService.formatDate(date, 'long', 'zh');
        expect(formatted).toBe('2024年01月15日');
      });

      test('应该格式化为长格式（英文）', () => {
        const date = dayjs('2024-01-15');
        const formatted = dateService.formatDate(date, 'long', 'en');
        expect(formatted).toBe('January 15, 2024');
      });

      test('应该格式化为ISO格式', () => {
        const date = dayjs('2024-01-15');
        const formatted = dateService.formatDate(date, 'iso', 'zh');
        expect(formatted).toBe('2024-01-15');
      });
    });

    describe('自定义格式', () => {
      test('应该支持自定义格式字符串', () => {
        const date = dayjs('2024-01-15');
        const formatted = dateService.formatDate(date, 'YYYY年MM月DD日 dddd', 'zh');
        expect(formatted).toBe('2024年01月15日 星期一');
      });

      test('应该支持标准dayjs格式', () => {
        const date = dayjs('2024-01-15');
        const formatted = dateService.formatDate(date, 'DD/MM/YYYY');
        expect(formatted).toBe('15/01/2024');
      });
    });
  });

  describe('辅助方法', () => {
    describe('获取特定工作日', () => {
      test('应该获取本周的指定星期几', () => {
        const date = dayjs('2024-01-15'); // 星期一
        const monday = dateService.getWeekday(date, 1); // 周一
        expect(monday.format('YYYY-MM-DD')).toBe('2024-01-15');

        const friday = dateService.getWeekday(date, 5); // 周五
        expect(friday.format('YYYY-MM-DD')).toBe('2024-01-19');
      });

      test('应该获取下周的指定星期几', () => {
        const date = dayjs('2024-01-15'); // 星期一
        const nextMonday = dateService.getWeekday(date, 1, 1);
        expect(nextMonday.format('YYYY-MM-DD')).toBe('2024-01-22');
      });

      test('应该获取上周的指定星期几', () => {
        const date = dayjs('2024-01-15'); // 星期一
        const lastMonday = dateService.getWeekday(date, 1, -1);
        expect(lastMonday.format('YYYY-MM-DD')).toBe('2024-01-08');
      });

      test('应该正确处理星期日（索引0）', () => {
        const date = dayjs('2024-01-15'); // 星期一
        const sunday = dateService.getWeekday(date, 0);
        expect(sunday.format('YYYY-MM-DD')).toBe('2024-01-14');
      });
    });

    describe('月份边界', () => {
      test('应该获取月份的第一天', () => {
        const date = dayjs('2024-01-15');
        const firstDay = dateService.getFirstDayOfMonth(date);
        expect(firstDay.format('YYYY-MM-DD')).toBe('2024-01-01');
        expect(firstDay.hour()).toBe(0);
        expect(firstDay.minute()).toBe(0);
        expect(firstDay.second()).toBe(0);
      });

      test('应该获取月份的最后一天', () => {
        const date = dayjs('2024-01-15');
        const lastDay = dateService.getLastDayOfMonth(date);
        expect(lastDay.format('YYYY-MM-DD')).toBe('2024-01-31');
        expect(lastDay.hour()).toBe(23);
        expect(lastDay.minute()).toBe(59);
        expect(lastDay.second()).toBe(59);
      });

      test('应该正确处理二月的最后一天（平年）', () => {
        const date = dayjs('2023-02-15');
        const lastDay = dateService.getLastDayOfMonth(date);
        expect(lastDay.format('YYYY-MM-DD')).toBe('2023-02-28');
      });

      test('应该正确处理二月的最后一天（闰年）', () => {
        const date = dayjs('2024-02-15');
        const lastDay = dateService.getLastDayOfMonth(date);
        expect(lastDay.format('YYYY-MM-DD')).toBe('2024-02-29');
      });

      test('应该正确处理12月', () => {
        const date = dayjs('2024-12-15');
        const lastDay = dateService.getLastDayOfMonth(date);
        expect(lastDay.format('YYYY-MM-DD')).toBe('2024-12-31');
      });
    });

    describe('年份边界', () => {
      test('应该获取年份的第一天', () => {
        const date = dayjs('2024-06-15');
        const firstDay = dateService.getFirstDayOfYear(date);
        expect(firstDay.format('YYYY-MM-DD')).toBe('2024-01-01');
      });

      test('应该获取年份的最后一天', () => {
        const date = dayjs('2024-06-15');
        const lastDay = dateService.getLastDayOfYear(date);
        expect(lastDay.format('YYYY-MM-DD')).toBe('2024-12-31');
      });
    });
  });

  describe('语言环境设置', () => {
    test('应该能够切换语言环境', () => {
      dateService.setLocale('en');
      const date = dayjs('2024-01-15');
      const info = dateService.getDateInfo(date);
      expect(info.weekday).toBe('Monday');

      dateService.setLocale('zh');
      const info2 = dateService.getDateInfo(date);
      expect(info2.weekday).toBe('星期一');
    });
  });

  describe('节假日设置', () => {
    test('应该能够设置默认节假日', () => {
      const holidays = ['2024-01-01', '2024-02-10'];
      dateService.setDefaultHolidays(holidays);

      const startDate = dayjs('2024-01-01');
      const endDate = dayjs('2024-01-05');
      const workdays = dateService.calculateWorkdays(startDate, endDate);

      expect(workdays.holidays).toBe(1); // 2024-01-01是节假日
    });

    test('应该能够清空默认节假日', () => {
      dateService.setDefaultHolidays(['2024-01-01']);
      dateService.setDefaultHolidays([]);

      const startDate = dayjs('2024-01-01');
      const endDate = dayjs('2024-01-05');
      const workdays = dateService.calculateWorkdays(startDate, endDate);

      // 2024-01-01是周一，不算周末，但不是节假日
      expect(workdays.holidays).toBe(0);
    });
  });
});
