# Life Capital / 人生资本

Life Capital 是一个本地运行的轻量现实财富成长工具。它不是传统记账软件，而是把工作、储蓄和资产变化换算成更即时、更可感知的成长反馈。

## Phase 0 MVP

当前版本是纯静态单页原型：

- HTML
- CSS
- Vanilla JavaScript
- LocalStorage

不需要后端、数据库、登录或构建工具。直接用浏览器打开 `index.html` 即可运行。

## 功能范围

- 首次初始化收入、工作时间、资产账户和负债
- Dashboard 显示净资产、总资产、负债和今日实时收入
- 工作时间内按秒增长，非工作时间停止增长
- 显示本次打开页面以来的收入变化
- 手动记录收入、支出和资产调整
- 支出后显示劳动时间换算、今日已获得、今日保留和保留率
- 资产转移单独保存到 `transfers`，不计入收入或支出
- 创建储蓄目标并显示进度
- 调整目标当前金额后记录本次推进反馈

## 数据保存

数据保存在浏览器 LocalStorage：

```text
lifeCapitalData
```

结构包含：

```js
{
  initialized: true,
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
}
```

## 文件结构

```text
index.html
css/
  style.css
js/
  app.js
  storage.js
  calculations.js
  ui.js
README.md
```

## 验证清单

- 刷新页面后数据应保留
- 月收入、工作天数、每日工作小时会换算为日、小时、分钟和每秒收入
- Dashboard 的今日收入只在设置的工作时间内增长
- 手动支出会减少对应账户余额，并计入今日支出
- 手动收入会增加对应账户余额，并计入今日收入
- 资产转移只改变两个账户余额，不写入 `transactions`
- 目标调整会记录金额变化、劳动时间换算和进度变化
