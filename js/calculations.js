(function () {
  const MS_PER_MINUTE = 60 * 1000;
  const MS_PER_HOUR = 60 * MS_PER_MINUTE;

  function number(value) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  function parseTimeToMinutes(value) {
    const [hours = 0, minutes = 0] = String(value || "00:00").split(":").map(Number);
    return hours * 60 + minutes;
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
    const end = combineDateAndTime(now, settings.workEnd);

    if (end <= start) {
      end.setDate(end.getDate() + 1);
    }

    return { start, end };
  }

  function getWorkedMilliseconds(settings, now = new Date()) {
    const { start, end } = getWorkWindow(settings, now);
    const maxWorkDuration = number(settings.workingHoursPerDay) * MS_PER_HOUR;
    const workWindowDuration = end - start;
    const cappedDuration = Math.max(0, Math.min(workWindowDuration, maxWorkDuration));
    if (now <= start) return 0;
    return Math.min(now - start, cappedDuration);
  }

  function getTodayEarned(settings, now = new Date()) {
    const rates = getIncomeRates(settings);
    return (getWorkedMilliseconds(settings, now) / 1000) * rates.second;
  }

  function isWithinWorkTime(settings, now = new Date()) {
    const { start, end } = getWorkWindow(settings, now);
    return now >= start && now < end;
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
    const todayIncome = getTodayEarned(data.settings, now) + getTodayTransactionTotal(data, "income", now);
    const todaySpending = getTodayTransactionTotal(data, "expense", now);
    const retained = todayIncome - todaySpending;
    const retentionRate = todayIncome > 0 ? retained / todayIncome : 0;

    return {
      todayIncome,
      todaySpending,
      retained,
      retentionRate,
      workedMilliseconds: getWorkedMilliseconds(data.settings, now)
    };
  }

  function amountToLaborTime(amount, settings) {
    const rates = getIncomeRates(settings);
    if (rates.hourly <= 0) return "暂无可换算收入";
    const totalMinutes = Math.round(Math.abs(number(amount)) / rates.hourly * 60);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    const days = totalMinutes / 60 / Math.max(0.01, number(settings.workingHoursPerDay));

    if (hours <= 0) return `≈ ${minutes}分钟劳动收入`;
    if (days >= 1) return `≈ ${hours}小时${minutes ? `${minutes}分钟` : ""}，≈ ${days.toFixed(1)}个工作日`;
    return `≈ ${hours}小时${minutes ? `${minutes}分钟` : ""}劳动收入`;
  }

  function getGoalProgress(goal) {
    const target = Math.max(1, number(goal.targetAmount));
    return Math.min(1, Math.max(0, number(goal.currentAmount) / target));
  }

  function formatDuration(milliseconds) {
    const totalMinutes = Math.floor(milliseconds / MS_PER_MINUTE);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    if (hours <= 0) return `${minutes}分钟`;
    return `${hours}小时${minutes}分钟`;
  }

  window.LifeCapitalCalculations = {
    number,
    getIncomeRates,
    getWorkWindow,
    getWorkedMilliseconds,
    getTodayEarned,
    isWithinWorkTime,
    isSameDay,
    getAssetSummary,
    getTodayFeedback,
    amountToLaborTime,
    getGoalProgress,
    formatDuration
  };
})();
