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

  function percent(value, digits = 1) {
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

  function progressBar(value, label) {
    const width = C.clamp(value, 0, 1) * 100;
    return `<div class="progress-track" aria-label="${escapeHtml(label)}"><div class="progress-fill" style="width: ${width}%"></div></div>`;
  }

  function renderHome(data, sessionEarned, now = new Date()) {
    document.documentElement.dataset.mode = data.displayMode;
    setText("app-title", data.displayMode === "focus" ? "今日推进" : "人生资本");
    renderModeToggle(data.displayMode);
    renderQuickButton(data.displayMode);

    if (data.displayMode === "focus") {
      renderFocusHome(data, now);
      document.getElementById("detail-home").innerHTML = "";
      return;
    }

    document.getElementById("focus-home").innerHTML = "";
    renderDetailHome(data, sessionEarned, now);
  }

  function renderModeToggle(mode) {
    const button = document.getElementById("mode-toggle");
    if (!button) return;
    button.textContent = mode === "focus" ? "详细模式" : "专注模式";
    button.setAttribute("aria-pressed", mode === "detail" ? "true" : "false");
  }

  function renderQuickButton(mode) {
    const button = document.getElementById("open-quick-record");
    if (!button) return;
    button.hidden = mode === "focus";
    button.setAttribute("aria-hidden", mode === "focus" ? "true" : "false");
  }

  function renderFocusHome(data, now) {
    const workday = C.getWorkdayProgress(data.settings, now);
    const advance = C.getGoalDailyAdvance(data, now);
    const week = C.getWeekProgress(now);
    const stageProgress = advance.goal ? C.getGoalProgress(advance.goal) : 0;
    const completed = workday.completed;
    const status = workday.nonWorkingDay ? "休息日" : completed ? "今日完成" : workday.started ? "持续推进中" : "今日开始";

    document.getElementById("focus-home").innerHTML = `
      <section class="hero-panel quiet-hero">
        <div>
          <p class="label">今日进度</p>
          <div class="hero-percent">${percent(workday.progress)}</div>
          ${progressBar(workday.progress, "今日进度")}
          <div class="status-line">
            <span>已进行：${C.formatDuration(workday.workedMilliseconds)}</span>
            <span>剩余：${C.formatDuration(workday.remainingMilliseconds)}</span>
            <span>${status}</span>
          </div>
        </div>
      </section>

      <section class="progress-chain">
        <article class="panel step-panel">
          <span class="step-index">现在</span>
          <h3>${status}</h3>
          <p>${workday.nonWorkingDay ? "今天不累计推进，保持节奏。" : "这一秒正在进入今天的进度。"}</p>
        </article>
        <article class="panel step-panel">
          <span class="step-index">今天</span>
          <h3>${percent(workday.progress)}</h3>
          <p>今日阶段已经推进到这里。</p>
        </article>
        <article class="panel step-panel">
          <span class="step-index">未来</span>
          <h3>${advance.goal ? percent(stageProgress) : "未设置"}</h3>
          <p>${advance.goal ? `当前阶段：${escapeHtml(advance.goal.name)}` : "可以在详细模式设置长期阶段。"}</p>
        </article>
      </section>

      <section class="two-column">
        <article class="panel">
          <div class="section-heading"><h3>当前阶段</h3><span>${advance.goal ? percent(stageProgress) : "0.0%"}</span></div>
          ${progressBar(stageProgress, "当前阶段")}
          <div class="status-line column">
            <span>今日推进：${advance.goal ? `+${percent(Math.max(0, advance.delta), 2)}` : "+0.00%"}</span>
            <span>距离下一阶段：${advance.goal ? percent(1 - stageProgress) : "100.0%"}</span>
          </div>
        </article>
        <article class="panel">
          <div class="section-heading"><h3>本周进度</h3><span>${week.completed} / ${week.total}</span></div>
          ${progressBar(week.completed / week.total, "本周进度")}
          <div class="week-dots">${Array.from({ length: week.total }, (_, index) => `<span class="week-dot ${index < week.completed ? "is-done" : ""}"></span>`).join("")}</div>
        </article>
      </section>

      ${completed ? renderFocusDailyClear(data, now) : ""}
    `;
  }

  function renderFocusDailyClear(data, now) {
    const clear = C.getDailyClear(data, now);
    return `
      <section class="panel clear-panel">
        <p class="eyebrow">今日结算</p>
        <h3>今日完成</h3>
        <div class="clear-grid focus-clear">
          <div><span>今天投入</span><strong>${C.formatDuration(clear.investedTime)}</strong></div>
          <div><span>今日推进</span><strong>${clear.goal ? `+${percent(Math.max(0, clear.progressDelta), 2)}` : "+0.00%"}</strong></div>
          <div><span>当前阶段</span><strong>${clear.goal ? percent(clear.progressAfter) : "未设置"}</strong></div>
        </div>
      </section>
    `;
  }

  function renderDetailHome(data, sessionEarned, now) {
    const rates = C.getIncomeRates(data.settings);
    const workday = C.getWorkdayProgress(data.settings, now);
    const feedback = C.getTodayFeedback(data, now);
    const summary = C.getAssetSummary(data);
    const advance = C.getGoalDailyAdvance(data, now);
    const goal = advance.goal;
    const status = workday.nonWorkingDay ? "非工作日" : C.isWithinWorkTime(data.settings, now) ? "积累中" : workday.completed ? "今日完成" : "等待开始";

    document.getElementById("detail-home").innerHTML = `
      <section class="hero-panel">
        <div>
          <p class="label">今日进度</p>
          <div class="hero-percent">${percent(workday.progress)}</div>
          ${progressBar(workday.progress, "今日进度")}
          <div class="status-line">
            <span>已进行 ${C.formatDuration(workday.workedMilliseconds)}</span>
            <span>剩余 ${C.formatDuration(workday.remainingMilliseconds)}</span>
            <span>${status}</span>
          </div>
        </div>
        <div class="live-card">
          <p class="label">今日已获得</p>
          <strong>${money(feedback.earnedFromWork)}</strong>
          <span>+${money(rates.second, 4)} / 秒</span>
          <small>本次打开以来 ${signedMoney(sessionEarned)}</small>
        </div>
      </section>

      <section class="progress-chain detail-chain">
        <article class="panel step-panel"><span class="step-index">现在</span><h3>${money(feedback.earnedFromWork)}</h3><p>时间正在变成今日劳动成果。</p></article>
        <article class="panel step-panel"><span class="step-index">今天</span><h3>${money(feedback.retained)}</h3><p>今天仍然留下的部分。</p></article>
        <article class="panel step-panel"><span class="step-index">未来</span><h3>${goal ? percent(C.getGoalProgress(goal)) : "未设置"}</h3><p>${goal ? `${escapeHtml(goal.name)} 正在推进。` : "设置长期阶段后，这里会连接今天与未来。"}</p></article>
      </section>

      <section class="two-column">
        <article class="panel">
          <div class="section-heading"><h3>劳动成果</h3><span>今天</span></div>
          <div class="allocation-grid">
            <div><span>今日获得</span><strong>${money(feedback.todayIncome)}</strong></div>
            <div><span>用于今天</span><strong>${money(feedback.usedToday)}</strong></div>
            <div><span>留给未来</span><strong>${money(feedback.retained)}</strong></div>
            <div><span>成果保留率</span><strong>${percent(feedback.retentionRate)}</strong></div>
          </div>
          ${renderAllocationBar(feedback)}
        </article>

        <article class="panel">
          <div class="section-heading"><h3>长期进度</h3><span>${goal ? percent(C.getGoalProgress(goal)) : "未设置"}</span></div>
          ${goal ? `
            <div class="large-number">${money(goal.currentAmount)}</div>
            <p class="muted">目标 ${money(goal.targetAmount)} · 今日推进 +${percent(Math.max(0, advance.delta), 2)}</p>
            ${progressBar(C.getGoalProgress(goal), "长期进度")}
          ` : `<p class="empty-state">可以在我的页面添加一个真实阶段目标。</p>`}
        </article>
      </section>

      <section class="panel sensitive-panel">
        <div class="section-heading"><h3>当前资本</h3><span>详细模式</span></div>
        <div class="capital-grid">
          <div><span>当前</span><strong>${money(summary.netWorth)}</strong></div>
          <div><span>资产</span><strong>${money(summary.totalAssets)}</strong></div>
          <div><span>负债</span><strong>${money(summary.totalLiabilities)}</strong></div>
        </div>
      </section>

      ${workday.completed ? renderDetailDailyClear(data, now) : ""}
    `;
  }

  function renderAllocationBar(feedback) {
    const used = feedback.todayIncome > 0 ? C.clamp(feedback.usedToday / feedback.todayIncome, 0, 1) : 0;
    const future = C.clamp(1 - used, 0, 1);
    return `
      <div class="allocation-bar" aria-label="劳动成果分配">
        <span style="width: ${used * 100}%"></span>
        <strong style="width: ${future * 100}%"></strong>
      </div>
      <div class="allocation-labels"><span>用于今天 ${percent(used)}</span><span>留给未来 ${percent(future)}</span></div>
    `;
  }

  function renderDetailDailyClear(data, now) {
    const clear = C.getDailyClear(data, now);
    return `
      <section class="panel clear-panel sensitive-panel">
        <p class="eyebrow">今日结算</p>
        <h3>今日完成</h3>
        <div class="clear-grid">
          <div><span>今天投入</span><strong>${C.formatDuration(clear.investedTime)}</strong></div>
          <div><span>劳动获得</span><strong>${signedMoney(clear.earned)}</strong></div>
          <div><span>用于今天</span><strong>${money(clear.usedToday)}</strong></div>
          <div><span>留给未来</span><strong>${signedMoney(clear.retained)}</strong></div>
          <div><span>成果保留率</span><strong>${percent(clear.retentionRate)}</strong></div>
          <div><span>今日推进</span><strong>${clear.goal ? `+${percent(Math.max(0, clear.progressDelta), 2)}` : "未设置"}</strong></div>
        </div>
        ${clear.goal ? `<p class="muted">${escapeHtml(clear.goal.name)}：${percent(clear.progressBefore)} → ${percent(clear.progressAfter)}</p>` : ""}
      </section>
    `;
  }

  function renderHistory(data) {
    const list = document.getElementById("history-list");
    if (!list) return;
    const items = getActivities(data);
    setText("history-count", data.displayMode === "focus" ? `${items.length} 次` : `${items.length} 条`);
    list.innerHTML = "";
    if (!items.length) {
      list.appendChild(emptyState("还没有历史。记录现实变化后，这里会保留发生过的推进。"));
      return;
    }
    items.forEach(item => {
      const row = document.createElement("article");
      row.className = "history-row";
      row.innerHTML = data.displayMode === "focus" ? getFocusActivityMarkup(item) : getActivityMarkup(item, data);
      list.appendChild(row);
    });
  }

  function getFocusActivityMarkup(activity) {
    if (activity.kind === "transfer") {
      return `<span>位置更新</span><strong>已记录</strong><small>${dateTime(activity.createdAt)}</small>`;
    }
    if (activity.kind === "goal") {
      const delta = C.number(activity.progressAfter) - C.number(activity.progressBefore);
      return `<span>阶段推进</span><strong>${delta >= 0 ? "+" : ""}${percent(delta, 2)}</strong><small>${dateTime(activity.createdAt)}</small>`;
    }
    const label = activity.type === "expense" ? "今日使用" : activity.type === "income" ? "今日获得" : "现实校准";
    return `<span>${label}</span><strong>已记录</strong><small>${dateTime(activity.createdAt)}</small>`;
  }

  function renderMine(data) {
    if (data.displayMode === "focus") {
      renderFocusMine(data);
      return;
    }
    setText("mine-summary", "同一套数据，两种解释");
    fillSettingsForm(data);
    renderRates(data);
    renderOptions(document.getElementById("quick-account"), data.accounts, "默认账户");
    renderOptions(document.getElementById("quick-transfer-from"), data.accounts, "转出账户");
    renderOptions(document.getElementById("quick-transfer-to"), data.accounts, "转入账户");
    renderAccounts(data);
    renderLiabilities(data);
    renderGoalSettings(data);
  }

  function renderFocusMine(data) {
    setText("mine-summary", "切换详细模式后管理参数");
    const accountList = document.getElementById("account-list");
    const liabilityList = document.getElementById("liability-list");
    const goalList = document.getElementById("goal-settings-list");
    const rateGrid = document.getElementById("rate-grid");
    if (rateGrid) rateGrid.innerHTML = "";
    if (accountList) accountList.innerHTML = `<p class="empty-state">专注模式下隐藏具体数据。</p>`;
    if (liabilityList) liabilityList.innerHTML = `<p class="empty-state">专注模式下隐藏具体数据。</p>`;
    if (goalList) {
      const goal = C.getPrimaryGoal(data);
      goalList.innerHTML = goal ? `<article class="simple-row"><span>当前阶段</span><strong>${percent(C.getGoalProgress(goal))}</strong></article>` : `<p class="empty-state">还没有长期阶段。</p>`;
    }
  }

  function renderRates(data) {
    const rates = C.getIncomeRates(data.settings);
    const element = document.getElementById("rate-grid");
    if (!element) return;
    element.innerHTML = `
      <div><span>日获得</span><strong>${money(rates.daily)}</strong></div>
      <div><span>小时</span><strong>${money(rates.hourly)}</strong></div>
      <div><span>分钟</span><strong>${money(rates.minute)}</strong></div>
      <div><span>每秒</span><strong>${money(rates.second, 4)}</strong></div>
    `;
  }

  function fillSettingsForm(data) {
    const form = document.getElementById("settings-form");
    if (!form) return;
    Object.entries(data.settings).forEach(([key, value]) => {
      if (form.elements[key]) form.elements[key].value = value;
    });
  }

  function renderOptions(select, accounts, placeholder) {
    if (!select) return;
    select.innerHTML = "";
    const placeholderOption = document.createElement("option");
    placeholderOption.value = "";
    placeholderOption.textContent = placeholder;
    select.appendChild(placeholderOption);
    accounts.forEach(account => {
      const option = document.createElement("option");
      option.value = account.id;
      option.textContent = account.name;
      select.appendChild(option);
    });
  }

  function renderAccounts(data) {
    const list = document.getElementById("account-list");
    if (!list) return;
    list.innerHTML = "";
    if (!data.accounts.length) {
      list.appendChild(emptyState("还没有账户。"));
      return;
    }
    data.accounts.forEach(account => {
      const row = document.createElement("article");
      row.className = "compact-row";
      row.innerHTML = `
        <div><strong>${escapeHtml(account.name)}</strong><span>${escapeHtml(account.type)}</span></div>
        <form class="inline-account-form" data-account-id="${account.id}">
          <input name="balance" type="number" step="0.01" value="${C.number(account.balance)}" aria-label="${escapeHtml(account.name)}当前金额">
          <button class="secondary-action" type="submit">校准</button>
        </form>
      `;
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
      row.className = "simple-row";
      row.innerHTML = `<span>${escapeHtml(liability.name)}</span><strong>${money(liability.amount)}</strong>`;
      list.appendChild(row);
    });
  }

  function renderGoalSettings(data) {
    const list = document.getElementById("goal-settings-list");
    if (!list) return;
    list.innerHTML = "";
    if (!data.goals.length) {
      list.appendChild(emptyState("还没有长期阶段。"));
      return;
    }
    data.goals.forEach(goal => {
      const row = document.createElement("article");
      row.className = "goal-editor";
      row.innerHTML = `
        <div>
          <strong>${escapeHtml(goal.name)}</strong>
          <span>${money(goal.currentAmount)} / ${money(goal.targetAmount)} · ${percent(C.getGoalProgress(goal))}</span>
        </div>
        <form class="inline-goal-form" data-goal-id="${goal.id}">
          <input name="currentAmount" type="number" min="0" step="0.01" value="${C.number(goal.currentAmount)}" aria-label="${escapeHtml(goal.name)}当前进度">
          <button class="secondary-action" type="submit">调整</button>
        </form>
      `;
      list.appendChild(row);
    });
  }

  function getActivities(data) {
    return [
      ...data.transactions.map(item => ({ ...item, kind: "transaction" })),
      ...data.transfers.map(item => ({ ...item, kind: "transfer" })),
      ...data.goals.flatMap(goal => (goal.history || []).map(item => ({ ...item, kind: "goal", goalName: goal.name })))
    ].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }

  function getActivityMarkup(activity, data) {
    if (activity.kind === "transfer") {
      const from = findAccount(data, activity.fromAccountId);
      const to = findAccount(data, activity.toAccountId);
      return `<span>账户转移</span><strong>${money(activity.amount)}</strong><small>${escapeHtml(from ? from.name : "账户")} → ${escapeHtml(to ? to.name : "账户")} · ${dateTime(activity.createdAt)}</small>`;
    }
    if (activity.kind === "goal") {
      return `<span>${escapeHtml(activity.goalName)} 推进</span><strong>${signedMoney(activity.delta)}</strong><small>${C.amountToLaborTime(activity.delta, data.settings)} · ${percent(activity.progressBefore)} → ${percent(activity.progressAfter)} · ${dateTime(activity.createdAt)}</small>`;
    }
    const typeLabel = activity.type === "expense" ? "用于今天" : activity.type === "income" ? "额外获得" : "资产校准";
    const sign = activity.type === "expense" ? "" : C.number(activity.amount) >= 0 ? "+" : "";
    return `<span>${typeLabel} · ${escapeHtml(activity.category || activity.note || "记录")}</span><strong>${sign}${money(activity.amount)}</strong><small>${C.amountToLaborTime(activity.amount, data.settings)} · ${dateTime(activity.createdAt)}</small>`;
  }

  function showMeaningFeedback(result, data) {
    const element = document.getElementById("meaning-feedback");
    if (!element) return;
    element.hidden = false;
    element.innerHTML = renderMeaningFeedback(result, data);
  }

  function renderMeaningFeedback(result, data) {
    const feedback = C.getTodayFeedback(data);
    const advance = C.getGoalDailyAdvance(data);
    if (result.kind === "expense") {
      return `
        <p class="eyebrow">意义反馈</p>
        <h3>${money(result.amount)} 用于今天</h3>
        <div class="feedback-lines">
          <span>${C.amountToLaborTime(result.amount, data.settings)}</span>
          <span>今天已经获得：${money(feedback.todayIncome)}</span>
          <span>今天仍然留下：${money(feedback.retained)}</span>
          <span>成果保留率：${percent(feedback.retentionRate)}</span>
        </div>
      `;
    }
    if (result.kind === "adjustment") {
      return `
        <p class="eyebrow">意义反馈</p>
        <h3>${signedMoney(result.delta)} 本次校准</h3>
        <div class="feedback-lines">
          <span>${C.amountToLaborTime(result.delta, data.settings)}</span>
          <span>长期进度：${advance.goal ? percent(advance.before) + " → " + percent(advance.after) : "未设置"}</span>
        </div>
      `;
    }
    if (result.kind === "transfer") {
      return `
        <p class="eyebrow">意义反馈</p>
        <h3>${money(result.amount)} 改变了位置</h3>
        <div class="feedback-lines"><span>这次转移不会计入今天的获得或用于今天。</span></div>
      `;
    }
    return `
      <p class="eyebrow">意义反馈</p>
      <h3>${signedMoney(result.amount)} 进入今天</h3>
      <div class="feedback-lines"><span>${C.amountToLaborTime(result.amount, data.settings)}</span><span>今天已经获得：${money(feedback.todayIncome)}</span></div>
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
    renderHome,
    renderHistory,
    renderMine,
    showMeaningFeedback,
    renderOptions
  };
})();
