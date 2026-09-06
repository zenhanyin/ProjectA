# Life Capital / 人生资本

Life Capital 是一个本地运行的现实人生进度系统。它把时间、工作、收入、消费、资产和长期目标转换成实时推进、每日进度、每日结算和长期阶段反馈。

当前版本为 Phase 0.5 产品体验原型，仍然保持纯静态实现：

- HTML
- CSS
- Vanilla JavaScript
- LocalStorage
- GitHub Pages

线上地址：

```text
https://zenhanyin.github.io/ProjectA/
```

## Phase 0.5 体验重点

首页不再是传统财务 Dashboard，而是按照「现在 → 今天 → 未来」组织：

- 此刻：工作时间内持续推进
- 今天：今日进度、已进行、剩余、今日完成
- 长期：当前阶段、今日推进、距离下一阶段

详细模式会显示真实金额、劳动成果分配、今日结算和当前资本。专注模式会隐藏所有明显财务语言和金额，只显示时间、百分比、阶段与状态。

## 功能范围

- 首页：即时 / 今日 / 长期三层进度
- 今日工作进度：根据工作开始、结束和每日有效工作小时计算
- 每日结算：工作完成后展示投入时间、劳动获得、用于今天、留给未来、保留率和长期推进
- 快速记录：支出、收入、调整资产、账户转移
- 记录后意义反馈：金额对应劳动时间、今日留下、保留率、长期阶段变化
- 资产快速校准：直接把账户校准到现实数字，并记录差额
- 历史：展示收入、支出、资产校准、账户转移和目标推进
- 我的：管理收入参数、工作时间、账户、负债和长期阶段
- 专注 / 详细模式切换，并持久化到 LocalStorage

## 数据保存

数据保存在浏览器 LocalStorage：

```text
lifeCapitalData
```

核心结构：

```js
{
  initialized: true,
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
}
```

`transactions` 保存收入、支出和资产校准；`transfers` 单独保存账户内部转移，不计入收入或支出。

## 隐私模式

页面加载时，`index.html` 会在 CSS 加载前读取 `lifeCapitalData.displayMode`，并设置：

```html
<html data-mode="focus">
```

专注模式下：

- 不渲染详细首页金额 DOM
- CSS 隐藏带有 `sensitive-panel` 的管理区域
- 首页文案避免工资、收入、资产、负债、财富、储蓄、消费、理财、财务、人民币、¥ 等明显财务语义

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
DEPLOYMENT.md
```

## 当前限制

- 预计达成时间暂缓实现，因为 Phase 0.5 还没有可靠的月度积累速度数据
- 长期阶段的今日推进以当前阶段金额和今日留下金额进行解释性计算，不自动替用户改变目标当前金额
- 没有银行同步、股票行情、预算建议、AI 建议或复杂报表
