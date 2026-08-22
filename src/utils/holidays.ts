/**
 * Utility for determining Japanese National Holidays (国民の祝日)
 */

function getNthMonday(year: number, month: number, n: number): number {
  let count = 0;
  for (let day = 1; day <= 31; day++) {
    const d = new Date(year, month - 1, day);
    if (d.getMonth() !== month - 1) break;
    if (d.getDay() === 1) {
      count++;
      if (count === n) return day;
    }
  }
  return 0;
}

function getShunbunDay(year: number): number {
  return Math.floor(20.8431 + 0.242194 * (year - 1980) - Math.floor((year - 1980) / 4));
}

function getShubunDay(year: number): number {
  return Math.floor(23.2488 + 0.242194 * (year - 1980) - Math.floor((year - 1980) / 4));
}

export function isJapaneseHoliday(date: Date): boolean {
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();

  // Primary Holidays Map for the month
  const isPrimaryHoliday = (y: number, m: number, d: number): boolean => {
    // Fixed Holidays
    if (m === 1 && d === 1) return true; // 元日
    if (m === 2 && d === 11) return true; // 建国記念の日
    if (m === 2 && d === 23) return true; // 天皇誕生日
    if (m === 4 && d === 29) return true; // 昭和の日
    if (m === 5 && d === 3) return true; // 憲法記念日
    if (m === 5 && d === 4) return true; // みどりの日
    if (m === 5 && d === 5) return true; // こどもの日
    if (m === 8 && d === 11) return true; // 山の日
    if (m === 11 && d === 3) return true; // 文化の日
    if (m === 11 && d === 23) return true; // 勤労感謝の日

    // Happy Monday Holidays
    if (m === 1 && d === getNthMonday(y, 1, 2)) return true; // 成人の日 (第2月曜)
    if (m === 7 && d === getNthMonday(y, 7, 3)) return true; // 海の日 (第3月曜)
    if (m === 9 && d === getNthMonday(y, 9, 3)) return true; // 敬老の日 (第3月曜)
    if (m === 10 && d === getNthMonday(y, 10, 2)) return true; // スポーツの日 (第2月曜)

    // Equinox Holidays
    if (m === 3 && d === getShunbunDay(y)) return true; // 春分の日
    if (m === 9 && d === getShubunDay(y)) return true; // 秋分の日

    return false;
  };

  if (isPrimaryHoliday(year, month, day)) {
    return true;
  }

  // Substitute Holiday (振替休日): If Sunday was a holiday, Monday (or first non-holiday weekday) is a holiday
  const checkDate = new Date(year, month - 1, day);
  const dayOfWeek = checkDate.getDay();

  if (dayOfWeek !== 0) { // Not Sunday
    // Check previous days up to Sunday
    let p = new Date(checkDate);
    p.setDate(p.getDate() - 1);
    while (p.getDay() >= 0) {
      if (isPrimaryHoliday(p.getFullYear(), p.getMonth() + 1, p.getDate())) {
        if (p.getDay() === 0) {
          return true; // Sunday was a holiday
        }
      } else {
        break;
      }
      p.setDate(p.getDate() - 1);
    }
  }

  // Bridge Holiday (国民の休日): A weekday between two national holidays
  if (dayOfWeek !== 0 && dayOfWeek !== 6) {
    const prevDay = new Date(year, month - 1, day - 1);
    const nextDay = new Date(year, month - 1, day + 1);
    if (
      isPrimaryHoliday(prevDay.getFullYear(), prevDay.getMonth() + 1, prevDay.getDate()) &&
      isPrimaryHoliday(nextDay.getFullYear(), nextDay.getMonth() + 1, nextDay.getDate())
    ) {
      return true;
    }
  }

  return false;
}
