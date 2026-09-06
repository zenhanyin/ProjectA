(function () {
  const STORAGE_KEY = "lifeCapitalData";

  const defaultData = {
    initialized: false,
    displayMode: "focus",
    settings: {
      monthlyIncome: 0,
      workingDaysPerMonth: 22,
      workingHoursPerDay: 8,
      workStart: "09:00",
      workEnd: "18:00"
    },
    accounts: [],
    liabilities: [],
    transactions: [],
    transfers: [],
    goals: []
  };

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function normalizeData(data) {
    const source = data || {};
    return {
      ...clone(defaultData),
      ...source,
      displayMode: source.displayMode === "detail" ? "detail" : "focus",
      settings: { ...defaultData.settings, ...(source.settings || {}) },
      accounts: Array.isArray(source.accounts) ? source.accounts : [],
      liabilities: Array.isArray(source.liabilities) ? source.liabilities : [],
      transactions: Array.isArray(source.transactions) ? source.transactions : [],
      transfers: Array.isArray(source.transfers) ? source.transfers : [],
      goals: Array.isArray(source.goals) ? source.goals : []
    };
  }

  function loadData() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? normalizeData(JSON.parse(raw)) : clone(defaultData);
    } catch (error) {
      console.warn("Life Capital data could not be loaded.", error);
      return clone(defaultData);
    }
  }

  function saveData(data) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(normalizeData(data)));
  }

  function createId(prefix) {
    return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }

  window.LifeCapitalStorage = {
    STORAGE_KEY,
    defaultData,
    loadData,
    saveData,
    createId
  };
})();
