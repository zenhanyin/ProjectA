(function () {
  const C = window.LifeCapitalCalculations;

  function money(value, digits = 2) {
    return `¥${C.number(value).toLocaleString("zh-CN", {
      minimumFractionDigits: digits,
      maximumFractionDigits: digits
    })}`;
  }

  function signedMoney(value, digits = 2) {
    const sign = C.number(value) >= 0 ? "+" : "-";
    return `${sign}${money(Math.abs(value), digits)}`;
  }

  function percent(value, digits = 0) {
    return `${(C.number(value) * 100).toFixed(digits)}%`;
  }

  function dateTime(value) {
    return new Date(value).toLocaleString("zh-CN", {
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit"
    });
  }

  function setText(id, value) {
    const element = document.getElementById(id);
    if (element) element.textContent = value;
  }

  function renderOptions(select, accounts, placeholder) {
    select.innerHTML = "";
    if (placeholder) {
      const option = document.createElement("option");
      option.value = "";
      option.textContent = placeholder;
      select.appendChild(option);
    }
    accounts.forEach(account => {
      const option = document.createElement("option");
      option.value = account.id;
      option.textContent = `${account.name} (${money(account.balance)})`;
      select.appendChild(option);
    });
  }

  function renderDashboard(data, sessionEarned) {
    const rates = C.getIncomeRates(data.settings);
    const assetSummary = C.getAssetSummary(data);
    const feedback = C.getTodayFeedback(data);
    const todayEarned = C.getTodayEarned(data.settings);

    setText("today-earned", money(todayEarned));
    setText("per-second", `+${money(rates.second, 4)} / 秒`);
    setText("work-status", C.isWithinWorkTime(data.settings) ? "工作时间内" : "非工作时间");
    setText("session-earned", signedMoney(sessionEarned));
    setText("net-worth", money(assetSummary.netWorth));
    setText("total-assets", money(assetSummary.totalAssets));
    setText("total-liabilities", money(assetSummary.totalLiabilities));
    setText("worked-time", C.formatDuration(feedback.workedMilliseconds));
    setText("today-spending", money(feedback.todaySpending));
    setText("today-retained", money(feedback.retained));
    setText("retention-rate", percent(feedback.retentionRate));
    setText("goal-count", `${data.goals.length} 个目标`);

    const liveAmount = document.getElementById("today-earned");
    if (liveAmount) liveAmount.classList.toggle("is-live", C.isWithinWorkTime(data.settings));

    renderGoals(data);
    renderRecentActivity(data);
  }

  function renderRates(data) {
    const rates = C.getIncomeRates(data.settings);
    setText("daily-rate", money(rates.daily));
    setText("hourly-rate", money(rates.hourly));
    setText("minute-rate", money(rates.minute));
    setText("second-rate", money(rates.second, 4));
  }

  function renderGoals(data) {
    const list = document.getElementById("goal-list");
    if (!list) return;
    list.innerHTML = "";
    if (!data.goals.length) {
      list.appendChild(emptyState("还没有目标。可以在设置里创建一个长期积累目标。"));
      return;
    }

    data.goals.forEach(goal => {
      const progress = C.getGoalProgress(goal);
      const item = document.createElement("article");
      item.className = "goal-item";
      item.innerHTML = `
        <div class="goal-row">
          <strong>${escapeHtml(goal.name)}</strong>
          <span>${money(goal.currentAmount)} / ${money(goal.targetAmount)}</span>
        </div>
        <div class="progress-track" aria-label="${escapeHtml(goal.name)}进度">
          <div class="progress-fill" style="width: ${progress * 100}%"></div>
        </div>
        <div class="goal-row subtle">
          <span>${percent(progress, 1)}</span>
          <span>${C.amountToLaborTime(goal.currentAmount, data.settings)}</span>
        </div>
      `;
      list.appendChild(item);
    });
  }

  function renderRecentActivity(data) {
    const list = document.getElementById("recent-activity");
    if (!list) return;
    list.innerHTML = "";
    const activities = [
      ...data.transactions.map(item => ({ ...item, kind: "transaction" })),
      ...data.transfers.map(item => ({ ...item, kind: "transfer" })),
      ...data.goals.flatMap(goal => (goal.history || []).map(item => ({ ...item, kind: "goal", goalName: goal.name })))
    ].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 8);

    if (!activities.length) {
      list.appendChild(emptyState("记录现实变化后，这里会显示最近反馈。"));
      return;
    }

    activities.forEach(activity => {
      const row = document.createElement("div");
      row.className = "timeline-row";
      row.innerHTML = getActivityMarkup(activity, data);
      list.appendChild(row);
    });
  }

  function getActivityMarkup(activity, data) {
    if (activity.kind === "transfer") {
      const from = findAccount(data, activity.fromAccountId);
      const to = findAccount(data, activity.toAccountId);
      return `
        <span>资产转移</span>
        <strong>${money(activity.amount)}</strong>
        <small>${escapeHtml(from ? from.name : "账户")} → ${escapeHtml(to ? to.name : "账户")} · ${dateTime(activity.createdAt)}</small>
      `;
    }
    if (activity.kind === "goal") {
      return `
        <span>${escapeHtml(activity.goalName)}</span>
        <strong>${signedMoney(activity.delta)}</strong>
        <small>${C.amountToLaborTime(activity.delta, data.settings)} · 推进 ${percent(activity.progressAfter - activity.progressBefore, 1)} · ${dateTime(activity.createdAt)}</small>
      `;
    }
    const sign = activity.type === "expense" ? "-" : "+";
    const label = activity.type === "expense" ? "支出" : activity.type === "income" ? "收入" : "资产调整";
    return `
      <span>${label} · ${escapeHtml(activity.category || "未分类")}</span>
      <strong>${sign}${money(activity.amount)}</strong>
      <small>${C.amountToLaborTime(activity.amount, data.settings)} · ${dateTime(activity.createdAt)}</small>
    `;
  }

  function renderRecords(data) {
    const transactionAccount = document.getElementById("transaction-account");
    const transferFrom = document.getElementById("transfer-from");
    const transferTo = document.getElementById("transfer-to");
    if (transactionAccount) renderOptions(transactionAccount, data.accounts, "选择账户");
    if (transferFrom) renderOptions(transferFrom, data.accounts, "转出账户");
    if (transferTo) renderOptions(transferTo, data.accounts, "转入账户");

    const list = document.getElementById("transaction-list");
    setText("transaction-count", `${data.transactions.length + data.transfers.length} 条`);
    if (!list) return;
    list.innerHTML = "";
    const records = [
      ...data.transactions.map(item => ({ ...item, kind: "transaction" })),
      ...data.transfers.map(item => ({ ...item, kind: "transfer" }))
    ].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    if (!records.length) {
      list.appendChild(emptyState("还没有流水。记录收入、支出或资产转移后会显示在这里。"));
      return;
    }

    records.forEach(record => {
      const row = document.createElement("div");
      row.className = "record-row";
      row.innerHTML = getActivityMarkup(record, data);
      list.appendChild(row);
    });
  }

  function renderSettings(data) {
    renderRates(data);
    fillSettingsForm(data);
    renderAccounts(data);
    renderLiabilities(data);
    renderGoalSettings(data);
  }

  function fillSettingsForm(data) {
    const form = document.getElementById("settings-form");
    if (!form) return;
    Object.entries(data.settings).forEach(([key, value]) => {
      if (form.elements[key]) form.elements[key].value = value;
    });
  }

  function renderAccounts(data) {
    const list = document.getElementById("account-list");
    if (!list) return;
    list.innerHTML = "";
    if (!data.accounts.length) {
      list.appendChild(emptyState("还没有资产账户。"));
      return;
    }
    data.accounts.forEach(account => {
      const row = document.createElement("div");
      row.className = "compact-row";
      row.innerHTML = `<span>${escapeHtml(account.name)} · ${escapeHtml(account.type)}</span><strong>${money(account.balance)}</strong>`;
      list.appendChild(row);
    });
  }

  function renderLiabilities(data) {
    const list = document.getElementById("liability-list");
    if (!list) return;
    list.innerHTML = "";
    if (!data.liabilities.length) {
      list.appendChild(emptyState("当前没有记录负债。"));
      return;
    }
    data.liabilities.forEach(liability => {
      const row = document.createElement("div");
      row.className = "compact-row";
      row.innerHTML = `<span>${escapeHtml(liability.name)}</span><strong>${money(liability.amount)}</strong>`;
      list.appendChild(row);
    });
  }

  function renderGoalSettings(data) {
    const list = document.getElementById("goal-settings-list");
    if (!list) return;
    list.innerHTML = "";
    if (!data.goals.length) {
      list.appendChild(emptyState("还没有储蓄目标。"));
      return;
    }

    data.goals.forEach(goal => {
      const row = document.createElement("article");
      row.className = "goal-editor";
      row.innerHTML = `
        <div>
          <strong>${escapeHtml(goal.name)}</strong>
          <span>${money(goal.currentAmount)} / ${money(goal.targetAmount)} · ${percent(C.getGoalProgress(goal), 1)}</span>
        </div>
        <form class="inline-goal-form" data-goal-id="${goal.id}">
          <input name="currentAmount" type="number" min="0" step="0.01" value="${C.number(goal.currentAmount)}" aria-label="${escapeHtml(goal.name)}当前金额">
          <button class="secondary-action" type="submit">调整</button>
        </form>
      `;
      list.appendChild(row);
    });
  }

  function renderAll(data, sessionEarned) {
    renderDashboard(data, sessionEarned);
    renderRecords(data);
    renderSettings(data);
  }

  function showTransactionFeedback(transaction, data) {
    const element = document.getElementById("transaction-feedback");
    if (!element) return;
    if (transaction.type !== "expense") {
      element.hidden = true;
      return;
    }
    const feedback = C.getTodayFeedback(data);
    element.hidden = false;
    element.innerHTML = `
      <span>本次消费 ${money(transaction.amount)}</span>
      <strong>${C.amountToLaborTime(transaction.amount, data.settings)}</strong>
      <small>今日已获得：${money(feedback.todayIncome)} · 消费后今日保留：${money(feedback.retained)} · 保留率：${percent(feedback.retentionRate)}</small>
    `;
  }

  function emptyState(text) {
    const element = document.createElement("p");
    element.className = "empty-state";
    element.textContent = text;
    return element;
  }

  function findAccount(data, id) {
    return data.accounts.find(account => account.id === id);
  }

  function escapeHtml(value) {
    return String(value || "").replace(/[&<>"']/g, character => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;"
    }[character]));
  }

  window.LifeCapitalUI = {
    money,
    signedMoney,
    percent,
    renderAll,
    renderDashboard,
    renderRecords,
    renderSettings,
    showTransactionFeedback
  };
})();
