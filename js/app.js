(function () {
  const Storage = window.LifeCapitalStorage;
  const C = window.LifeCapitalCalculations;
  const UI = window.LifeCapitalUI;

  let data = Storage.loadData();
  const openedAt = new Date();
  const openedEarned = C.getTodayEarned(data.settings, openedAt);

  function saveAndRender() {
    Storage.saveData(data);
    render();
  }

  function render() {
    const sessionEarned = Math.max(0, C.getTodayEarned(data.settings) - openedEarned);
    UI.renderAll(data, sessionEarned);
    document.getElementById("onboarding").hidden = data.initialized;
  }

  function renderLiveMetrics() {
    const sessionEarned = Math.max(0, C.getTodayEarned(data.settings) - openedEarned);
    UI.renderDashboard(data, sessionEarned);
  }

  function readSettings(form) {
    return {
      monthlyIncome: C.number(form.elements.monthlyIncome.value),
      workingDaysPerMonth: C.number(form.elements.workingDaysPerMonth.value),
      workingHoursPerDay: C.number(form.elements.workingHoursPerDay.value),
      workStart: form.elements.workStart.value,
      workEnd: form.elements.workEnd.value
    };
  }

  function accountById(id) {
    return data.accounts.find(account => account.id === id);
  }

  function addAccountBalance(accountId, delta) {
    const account = accountById(accountId);
    if (account) account.balance = C.number(account.balance) + delta;
  }

  function bindTabs() {
    document.querySelectorAll(".tab").forEach(tab => {
      tab.addEventListener("click", () => {
        document.querySelectorAll(".tab").forEach(item => item.classList.remove("is-active"));
        document.querySelectorAll(".view").forEach(view => view.classList.remove("is-active"));
        tab.classList.add("is-active");
        document.getElementById(`${tab.dataset.tab}-view`).classList.add("is-active");
      });
    });
  }

  function bindOnboarding() {
    document.getElementById("onboarding-form").addEventListener("submit", event => {
      event.preventDefault();
      const form = event.currentTarget;
      data.settings = readSettings(form);
      data.accounts = [{
        id: Storage.createId("account"),
        name: form.elements.accountName.value.trim(),
        type: form.elements.accountType.value,
        balance: C.number(form.elements.accountBalance.value),
        createdAt: new Date().toISOString()
      }];

      const liabilityAmount = C.number(form.elements.liabilityAmount.value);
      data.liabilities = liabilityAmount > 0 ? [{
        id: Storage.createId("liability"),
        name: "初始负债",
        amount: liabilityAmount,
        createdAt: new Date().toISOString()
      }] : [];

      data.initialized = true;
      saveAndRender();
    });
  }

  function bindSettings() {
    document.getElementById("settings-form").addEventListener("submit", event => {
      event.preventDefault();
      data.settings = readSettings(event.currentTarget);
      saveAndRender();
    });

    document.getElementById("account-form").addEventListener("submit", event => {
      event.preventDefault();
      const form = event.currentTarget;
      data.accounts.push({
        id: Storage.createId("account"),
        name: form.elements.name.value.trim(),
        type: form.elements.type.value,
        balance: C.number(form.elements.balance.value),
        createdAt: new Date().toISOString()
      });
      form.reset();
      saveAndRender();
    });

    document.getElementById("liability-form").addEventListener("submit", event => {
      event.preventDefault();
      const form = event.currentTarget;
      data.liabilities.push({
        id: Storage.createId("liability"),
        name: form.elements.name.value.trim(),
        amount: C.number(form.elements.amount.value),
        createdAt: new Date().toISOString()
      });
      form.reset();
      saveAndRender();
    });

    document.getElementById("goal-form").addEventListener("submit", event => {
      event.preventDefault();
      const form = event.currentTarget;
      data.goals.push({
        id: Storage.createId("goal"),
        name: form.elements.name.value.trim(),
        targetAmount: C.number(form.elements.targetAmount.value),
        currentAmount: C.number(form.elements.currentAmount.value),
        createdAt: new Date().toISOString(),
        history: []
      });
      form.reset();
      saveAndRender();
    });

    document.getElementById("goal-settings-list").addEventListener("submit", event => {
      const form = event.target.closest(".inline-goal-form");
      if (!form) return;
      event.preventDefault();
      const goal = data.goals.find(item => item.id === form.dataset.goalId);
      if (!goal) return;

      const beforeAmount = C.number(goal.currentAmount);
      const beforeProgress = C.getGoalProgress(goal);
      const afterAmount = C.number(form.elements.currentAmount.value);
      goal.currentAmount = afterAmount;
      goal.history = goal.history || [];
      goal.history.push({
        id: Storage.createId("goal-change"),
        delta: afterAmount - beforeAmount,
        amountBefore: beforeAmount,
        amountAfter: afterAmount,
        progressBefore: beforeProgress,
        progressAfter: C.getGoalProgress(goal),
        createdAt: new Date().toISOString()
      });
      saveAndRender();
    });
  }

  function bindRecords() {
    document.getElementById("transaction-form").addEventListener("submit", event => {
      event.preventDefault();
      const form = event.currentTarget;
      const amount = C.number(form.elements.amount.value);
      const accountId = form.elements.accountId.value;
      if (!accountId) return;

      const transaction = {
        id: Storage.createId("transaction"),
        type: form.elements.type.value,
        amount,
        accountId,
        category: form.elements.category.value.trim(),
        note: form.elements.note.value.trim(),
        createdAt: new Date().toISOString()
      };

      if (transaction.type === "expense") addAccountBalance(accountId, -amount);
      if (transaction.type === "income" || transaction.type === "asset-adjustment") addAccountBalance(accountId, amount);
      data.transactions.push(transaction);
      form.reset();
      saveAndRender();
      UI.showTransactionFeedback(transaction, data);
    });

    document.getElementById("transfer-form").addEventListener("submit", event => {
      event.preventDefault();
      const form = event.currentTarget;
      const fromAccountId = form.elements.fromAccountId.value;
      const toAccountId = form.elements.toAccountId.value;
      const amount = C.number(form.elements.amount.value);
      if (!fromAccountId || !toAccountId || fromAccountId === toAccountId) return;

      addAccountBalance(fromAccountId, -amount);
      addAccountBalance(toAccountId, amount);
      data.transfers.push({
        id: Storage.createId("transfer"),
        fromAccountId,
        toAccountId,
        amount,
        note: form.elements.note.value.trim(),
        createdAt: new Date().toISOString()
      });
      form.reset();
      saveAndRender();
    });
  }

  function init() {
    bindTabs();
    bindOnboarding();
    bindSettings();
    bindRecords();
    render();
    window.setInterval(renderLiveMetrics, 1000);
  }

  document.addEventListener("DOMContentLoaded", init);
})();
