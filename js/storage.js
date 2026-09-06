(function () {
  const STORAGE_KEY = "lifeCapitalData";

  const defaultData = {
    initialized: false,
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
    return {
      ...clone(defaultData),
      ...data,
      settings: { ...defaultData.settings, ...(data && data.settings ? data.settings : {}) },
      accounts: Array.isArray(data && data.accounts) ? data.accounts : [],
      liabilities: Array.isArray(data && data.liabilities) ? data.liabilities : [],
      transactions: Array.isArray(data && data.transactions) ? data.transactions : [],
      transfers: Array.isArray(data && data.transfers) ? data.transfers : [],
      goals: Array.isArray(data && data.goals) ? data.goals : []
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
