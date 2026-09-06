(function () {
  const Storage = window.LifeCapitalStorage;
  const C = window.LifeCapitalCalculations;
  const UI = window.LifeCapitalUI;

  let data = Storage.loadData();
  let activeRecordType = "expense";
  const openedAt = new Date();
  const openedEarned = C.getTodayEarned(data.settings, openedAt);

  function saveAndRender() {
    Storage.saveData(data);
    render();
  }

  function getSessionEarned() {
    return Math.max(0, C.getTodayEarned(data.settings) - openedEarned);
  }

  function render() {
    document.documentElement.dataset.mode = data.displayMode;
    UI.renderHome(data, getSessionEarned());
    UI.renderHistory(data);
    UI.renderMine(data);
    document.getElementById("onboarding").hidden = data.initialized;
  }

  function renderLiveMetrics() {
    UI.renderHome(data, getSessionEarned());
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

  function defaultAccount() {
    return data.accounts[0] || null;
  }

  function selectedOrDefaultAccount(selectName, form) {
    return accountById(form.elements[selectName].value) || defaultAccount();
  }

  function addAccountBalance(accountId, delta) {
    const account = accountById(accountId);
    if (account) account.balance = C.number(account.balance) + delta;
    return account;
  }

  function addTransaction(type, amount, accountId, note, category) {
    const transaction = {
      id: Storage.createId("transaction"),
      type,
      amount,
      accountId,
      category: category || note || "记录",
      note: note || "",
      createdAt: new Date().toISOString()
    };
    data.transactions.push(transaction);
    return transaction;
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

  function bindModeToggle() {
    document.getElementById("mode-toggle").addEventListener("click", () => {
      data.displayMode = data.displayMode === "focus" ? "detail" : "focus";
      saveAndRender();
    });
  }

  function bindQuickRecord() {
    const sheet = document.getElementById("quick-sheet");
    const form = document.getElementById("quick-record-form");
    document.getElementById("open-quick-record").addEventListener("click", () => {
      if (data.displayMode === "focus") {
        data.displayMode = "detail";
        Storage.saveData(data);
        render();
      }
      sheet.hidden = false;
      document.getElementById("meaning-feedback").hidden = true;
      updateQuickRecordFields();
      form.elements.amount.focus();
    });
    document.getElementById("close-quick-record").addEventListener("click", () => {
      sheet.hidden = true;
    });
    sheet.addEventListener("click", event => {
      if (event.target === sheet) sheet.hidden = true;
    });

    document.querySelectorAll(".record-type").forEach(button => {
      button.addEventListener("click", () => {
        activeRecordType = button.dataset.recordType;
        document.querySelectorAll(".record-type").forEach(item => item.classList.remove("is-active"));
        button.classList.add("is-active");
        document.getElementById("meaning-feedback").hidden = true;
        updateQuickRecordFields();
      });
    });

    form.addEventListener("submit", event => {
      event.preventDefault();
      const amount = C.number(form.elements.amount.value);
      const note = form.elements.note.value.trim();
      if (amount <= 0) return;
      const result = applyQuickRecord(form, amount, note);
      if (!result) return;
      form.reset();
      saveAndRender();
      UI.showMeaningFeedback(result, data);
    });
  }

  function updateQuickRecordFields() {
    const isTransfer = activeRecordType === "transfer";
    const noteLabel = document.querySelector(".record-note");
    document.querySelectorAll(".detail-field").forEach(element => { element.hidden = isTransfer; });
    document.querySelectorAll(".transfer-field").forEach(element => { element.hidden = !isTransfer; });
    if (noteLabel) noteLabel.firstChild.textContent = activeRecordType === "adjustment" ? "说明" : "用途";
  }

  function applyQuickRecord(form, amount, note) {
    if (activeRecordType === "transfer") {
      const from = accountById(form.elements.fromAccountId.value);
      const to = accountById(form.elements.toAccountId.value);
      if (!from || !to || from.id === to.id) return null;
      addAccountBalance(from.id, -amount);
      addAccountBalance(to.id, amount);
      data.transfers.push({
        id: Storage.createId("transfer"),
        fromAccountId: from.id,
        toAccountId: to.id,
        amount,
        note,
        createdAt: new Date().toISOString()
      });
      return { kind: "transfer", amount, fromAccountId: from.id, toAccountId: to.id };
    }

    const account = selectedOrDefaultAccount("accountId", form);
    if (!account) return null;

    if (activeRecordType === "expense") {
      addAccountBalance(account.id, -amount);
      addTransaction("expense", amount, account.id, note || "用于今天", note || "用于今天");
      return { kind: "expense", amount };
    }

    if (activeRecordType === "income") {
      addAccountBalance(account.id, amount);
      addTransaction("income", amount, account.id, note || "额外获得", note || "额外获得");
      return { kind: "income", amount };
    }

    const before = C.number(account.balance);
    const delta = amount - before;
    account.balance = amount;
    addTransaction("asset-adjustment", delta, account.id, note || "资产校准", note || "资产校准");
    return { kind: "adjustment", amount, delta, before, after: amount };
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

      data.displayMode = data.displayMode || "focus";
      data.initialized = true;
      saveAndRender();
    });
  }

  function bindMine() {
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

    document.getElementById("account-list").addEventListener("submit", event => {
      const form = event.target.closest(".inline-account-form");
      if (!form) return;
      event.preventDefault();
      const account = accountById(form.dataset.accountId);
      if (!account) return;
      const before = C.number(account.balance);
      const after = C.number(form.elements.balance.value);
      const delta = after - before;
      account.balance = after;
      addTransaction("asset-adjustment", delta, account.id, "账户校准", "账户校准");
      saveAndRender();
      document.getElementById("quick-sheet").hidden = false;
      UI.showMeaningFeedback({ kind: "adjustment", amount: after, delta, before, after }, data);
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

  function init() {
    document.documentElement.dataset.mode = data.displayMode;
    bindTabs();
    bindModeToggle();
    bindQuickRecord();
    bindOnboarding();
    bindMine();
    render();
    window.setInterval(renderLiveMetrics, 1000);
  }

  document.addEventListener("DOMContentLoaded", init);
})();

