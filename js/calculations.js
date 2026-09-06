(function () {
  const MS_PER_MINUTE = 60 * 1000;
  const MS_PER_HOUR = 60 * MS_PER_MINUTE;
  const MS_PER_DAY = 24 * MS_PER_HOUR;

  function number(value) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function parseTimeToMinutes(value) {
    const [hours = 0, minutes = 0] = String(value || "00:00").split(":").map(Number);
    return hours * 60 + minutes;
  }

  function isValidWorkSchedule(settings) {
    return parseTimeToMinutes(settings.workEnd) > parseTimeToMinutes(settings.workStart);
  }

  function isWorkday(date = new Date()) {
    const day = date.getDay();
    return day >= 1 && day <= 5;
  }

  function startOfDay(date) {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate());
  }

  function combineDateAndTime(date, timeValue) {
    const minutes = parseTimeToMinutes(timeValue);
    const result = startOfDay(date);
    result.setMinutes(minutes);
    return result;
  }

  function getIncomeRates(settings) {
    const monthlyIncome = number(settings.monthlyIncome);
    const workingDays = Math.max(1, number(settings.workingDaysPerMonth));
    const workingHours = Math.max(0.01, number(settings.workingHoursPerDay));
    const daily = monthlyIncome / workingDays;
    const hourly = daily / workingHours;

    return {
      daily,
      hourly,
      minute: hourly / 60,
      second: hourly / 3600
    };
  }

  function getWorkWindow(settings, now = new Date()) {
    const start = combineDateAndTime(now, settings.workStart);
    const configuredEnd = combineDateAndTime(now, settings.workEnd);
    if (!isValidWorkSchedule(settings)) {
      return { start, configuredEnd, end: start, valid: false };
    }

    const maxWorkDuration = Math.max(0, number(settings.workingHoursPerDay) * MS_PER_HOUR);
    const cappedEnd = new Date(start.getTime() + Math.min(configuredEnd - start, maxWorkDuration));
    return { start, configuredEnd, end: cappedEnd, valid: true };
  }

  function getWorkedMilliseconds(settings, now = new Date()) {
    if (!isWorkday(now)) return 0;
    const { start, end, valid } = getWorkWindow(settings, now);
    if (!valid || now <= start) return 0;
    return clamp(now - start, 0, end - start);
  }

  function getWorkdayProgress(settings, now = new Date()) {
    const { start, end, valid } = getWorkWindow(settings, now);
    const nonWorkingDay = !isWorkday(now);
    const total = Math.max(1, end - start);
    const worked = valid && !nonWorkingDay ? getWorkedMilliseconds(settings, now) : 0;
    const completed = valid && !nonWorkingDay && worked >= total;

    return {
      valid,
      nonWorkingDay,
      started: valid && !nonWorkingDay && now >= start,
      completed,
      progress: valid && !nonWorkingDay ? clamp(worked / total, 0, 1) : 0,
      workedMilliseconds: worked,
      remainingMilliseconds: valid && !nonWorkingDay ? Math.max(0, total - worked) : 0,
      totalMilliseconds: valid ? total : 0,
      start,
      end
    };
  }

  function getEffectiveWorkMillisecondsBetween(settings, from, to) {
    const startAt = new Date(from);
    const endAt = new Date(to);
    if (!isValidWorkSchedule(settings) || endAt <= startAt) return 0;

    let cursor = startOfDay(startAt);
    let total = 0;
    while (cursor <= endAt) {
      if (isWorkday(cursor)) {
        const work = getWorkWindow(settings, cursor);
        if (work.valid) {
          const overlapStart = Math.max(startAt.getTime(), work.start.getTime());
          const overlapEnd = Math.min(endAt.getTime(), work.end.getTime());
          if (overlapEnd > overlapStart) total += overlapEnd - overlapStart;
        }
      }
      cursor = new Date(cursor.getTime() + MS_PER_DAY);
    }
    return total;
  }

  function getTodayEarned(settings, now = new Date()) {
    const rates = getIncomeRates(settings);
    return (getWorkedMilliseconds(settings, now) / 1000) * rates.second;
  }

  function isWithinWorkTime(settings, now = new Date()) {
    const progress = getWorkdayProgress(settings, now);
    return progress.valid && progress.started && !progress.completed && !progress.nonWorkingDay;
  }

  function isSameDay(isoValue, now = new Date()) {
    const date = new Date(isoValue);
    return date.getFullYear() === now.getFullYear() &&
      date.getMonth() === now.getMonth() &&
      date.getDate() === now.getDate();
  }

  function sumBy(items, getter) {
    return items.reduce((total, item) => total + number(getter(item)), 0);
  }

  function getAssetSummary(data) {
    const totalAssets = sumBy(data.accounts, account => account.balance);
    const totalLiabilities = sumBy(data.liabilities, liability => liability.amount);
    return {
      totalAssets,
      totalLiabilities,
      netWorth: totalAssets - totalLiabilities
    };
  }

  function getTodayTransactionTotal(data, type, now = new Date()) {
    return data.transactions
      .filter(item => item.type === type && isSameDay(item.createdAt, now))
      .reduce((total, item) => total + number(item.amount), 0);
  }

  function getTodayFeedback(data, now = new Date()) {
    const earnedFromWork = getTodayEarned(data.settings, now);
    const directIncome = getTodayTransactionTotal(data, "income", now);
    const todayIncome = earnedFromWork + directIncome;
    const usedToday = getTodayTransactionTotal(data, "expense", now);
    const retained = todayIncome - usedToday;
    const retentionRate = todayIncome > 0 ? retained / todayIncome : 0;
    const workday = getWorkdayProgress(data.settings, now);

    return {
      earnedFromWork,
      directIncome,
      todayIncome,
      usedToday,
      retained,
      retentionRate,
      workedMilliseconds: workday.workedMilliseconds,
      remainingMilliseconds: workday.remainingMilliseconds,
      progress: workday.progress,
      completed: workday.completed,
      started: workday.started,
      nonWorkingDay: workday.nonWorkingDay,
      valid: workday.valid
    };
  }

  function amountToLaborTime(amount, settings) {
    const rates = getIncomeRates(settings);
    if (rates.hourly <= 0) return "暂无可换算收入";
    const totalMinutes = Math.round(Math.abs(number(amount)) / rates.hourly * 60);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    const days = totalMinutes / 60 / Math.max(0.01, number(settings.workingHoursPerDay));

    if (hours <= 0) return `约 ${minutes}分钟劳动成果`;
    if (days >= 1) return `约 ${hours}小时${minutes ? `${minutes}分钟` : ""}，约 ${days.toFixed(1)}个工作日`;
    return `约 ${hours}小时${minutes ? `${minutes}分钟` : ""}劳动成果`;
  }

  function getPrimaryGoal(data) {
    if (!data.goals.length) return null;
    return [...data.goals].sort((a, b) => getGoalProgress(a) - getGoalProgress(b))[0];
  }

  function getGoalProgress(goal) {
    if (!goal) return 0;
    const target = Math.max(1, number(goal.targetAmount));
    return clamp(number(goal.currentAmount) / target, 0, 1);
  }

  function getGoalDailyAdvance(data, now = new Date()) {
    const goal = getPrimaryGoal(data);
    if (!goal) return { goal: null, before: 0, after: 0, delta: 0 };
    const target = Math.max(1, number(goal.targetAmount));
    const feedback = getTodayFeedback(data, now);
    const current = number(goal.currentAmount);
    const after = getGoalProgress(goal);
    const before = clamp((current - feedback.retained) / target, 0, 1);
    return { goal, before, after, delta: after - before };
  }

  function getDailyClear(data, now = new Date()) {
    const feedback = getTodayFeedback(data, now);
    const advance = getGoalDailyAdvance(data, now);
    return {
      completed: feedback.completed,
      investedTime: feedback.workedMilliseconds,
      earned: feedback.todayIncome,
      usedToday: feedback.usedToday,
      retained: feedback.retained,
      retentionRate: feedback.retentionRate,
      goal: advance.goal,
      progressBefore: advance.before,
      progressAfter: advance.after,
      progressDelta: advance.delta
    };
  }

  function getWeekProgress(now = new Date()) {
    const day = now.getDay();
    const weekday = day === 0 ? 7 : day;
    return {
      completed: Math.min(5, Math.max(0, weekday - 1)),
      total: 5
    };
  }

  function formatDuration(milliseconds) {
    const totalMinutes = Math.max(0, Math.floor(milliseconds / MS_PER_MINUTE));
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    if (hours <= 0) return `${minutes}分钟`;
    return `${hours}小时${minutes}分钟`;
  }

  function formatDateKey(date = new Date()) {
    return date.toISOString().slice(0, 10);
  }

  window.LifeCapitalCalculations = {
    number,
    clamp,
    parseTimeToMinutes,
    isValidWorkSchedule,
    isWorkday,
    getIncomeRates,
    getWorkWindow,
    getWorkdayProgress,
    getEffectiveWorkMillisecondsBetween,
    getWorkedMilliseconds,
    getTodayEarned,
    isWithinWorkTime,
    isSameDay,
    getAssetSummary,
    getTodayFeedback,
    amountToLaborTime,
    getPrimaryGoal,
    getGoalProgress,
    getGoalDailyAdvance,
    getDailyClear,
    getWeekProgress,
    formatDuration,
    formatDateKey
  };
})();
