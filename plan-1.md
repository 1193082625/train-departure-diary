# 货车物流管理系统【发车日记】Implementation Plan

目标: 为货车中间商量身打造的手机应用，实现人员管理、商户管理、发车记录自动计算和财务统计功能

## 技术栈: UniApp + Vue 3 + Pinia + dayjs + 本地存储

### Step 1: 初始化 UniApp 项目

### Step 2: 添加依赖

`npm install pinia dayjs sass`

### Step 3: 配置项目名称

`Modify: src/manifest.json` - 添加应用名称 "发车日记"

## 数据模型设计

1. 人员 (Worker)

   ```
   interface Worker {
    name: string
    phone: string
    type: 'departure' | 'loading' | 'both' // 发车人员 | 装车人员 | 两者皆可
    createdAt: string
   }
   ```

2. 商户 (Merchant)

   ```
   interface Merchant {
   id: string
    name: string
    phone: string
    margin: number // 差额（元/斤）
   createdAt: string
   }
   ```

3. 发车记录 (DepartureRecord)

   ```
   interface DepartureRecord {
      id: string
      date: string // 日期 YYYY-MM-DD
      dailyQuote: number // 当日报价（元/斤）

      // 商户信息（一个记录可包含多个商户）
      merchantDetails: MerchantDetail[]

      // 留货数量
      reservedBigBoxes: number // 留货大框数
      reservedSmallBoxes: number // 留货小框数

      // 人员
      departureWorkerId: string // 发车人员ID
      loadingWorkerIds: string[] // 装车人员ID数组

      // 费用
      fuelCost: number // 加油费（元）
      entryFee: number // 进门费（元）

      // 货车信息
      truckRows: TruckRow[] // 货车每排信息

      // 到达
      arrivalBigBoxes: number // 到货大框数
      arrivalSmallBoxes: number // 到货小框数
      returnedBigBoxes: number // 回框大框数
      returnedSmallBoxes: number // 回框小框数

      // 其他
      note: string

      // 自动计算的金额
      totalAmount?: number // 本次总金额
      createdAt: string
   }

   interface MerchantDetail {
    merchantId: string
    merchantName: string
    bigBoxes: number // 大框数
    smallBoxes: number // 小框数
   }

   interface TruckRow {
    rowNumber: number // 排号 1,2,3...
    bigBoxes: number // 本排大框数
    smallBoxes: number // 本排小框数
   }
   ```

4. 帐目 (Transaction)

   ```
   interface Transaction {
    id: string
    type: 'payment_to_merchant' | 'payment_to_worker' // 向商户结账 | 向员工结账
    targetId: string // 商户ID或员工ID
    targetName: string // 商户名或员工名
    amount: number // 金额
    date: string // 日期
    note: string
    createdAt: string
   }
   ```

### 计算公式

按商户计算金额

金额 = (当日报价 - 商户差额) × 大框斤数 × 大框数 + (当日报价 - 商户差额) × 小框斤数 × 小框数
注：大框斤数和小型框斤数需要在前端设置（默认待定）

本次共拉：

- 大框 = Σ(各商户大框) - 留货大框
- 小框 = Σ(各商户小框) - 留货小框

货车共装：

- 大框 = Σ(每排大框)
- 小框 = Σ(每排小框)

## 页面结构

TabBar 页面（5个）

1. 首页 - 数据概览、快捷操作
2. 发车记录 - 每日发车记录列表、新增记录
3. 商户管理 - 商户列表、新增商户
4. 人员管理 - 人员列表、新增人员
5. 结账 - 按人员/按商户统计

页面详细设计

1. 首页 (pages/home/home.vue)

- 今日发车次数
- 今日总收入
- 快捷按钮：新增发车记录、单次结账

2. 发车记录 (pages/departure/departure.vue)

- 日历视图选择日期
- 当日发车记录列表（可多条）
- 每条记录显示：时间、商户、金额
- 新增/编辑发车记录按钮

3. 发车记录表单 (pages/departure/form.vue)

- 日期选择器
- 当日报价输入
- 商户选择（多选）+ 大框/小框数量输入
- 留货大框/小框输入
- 发车人员选择（单选）
- 装车人员选择（多选）
- 加油费、进门费输入
- 货车排数配置（动态添加排数，每排大小框数）
- 到货数、回框数输入
- 备注
- 自动计算结果展示

4. 商户管理 (pages/merchant/merchant.vue)

- 商户列表（姓名、手机、差额）
- 新增/编辑/删除商户

5. 人员管理 (pages/worker/worker.vue)

- 人员列表（姓名、手机、类型）
- 新增/编辑/删除人员
- 类型标签：发车/装车

6. 统计 (pages/statistics/statistics.vue)

- 顶部切换：按人员 | 按商户
- 按人员：
  - 选择人员
  - 选择时间范围：日/月/年/自定义
  - 显示：出勤天数、装车次数、发车次数
  - 日历视图：标记出勤/缺勤
- 按商户：
  - 选择商户
  - 选择时间范围
  - 显示：总拉货量（大框/小框）、应收金额、已结金额、待结金额
  - 明细列表

7. 结账 (pages/transaction/transaction.vue)

- 切换结账对象：商户/员工
- 选择人员
- 输入金额
- 记录列表

### Store 设计

1. worker.ts

- 状态：workers[]
- Actions: addWorker, updateWorker, deleteWorker, getWorkerById

2. merchant.ts

- 状态：merchants[]
- Actions: addMerchant, updateMerchant, deleteMerchant, getMerchantById

3. departure.ts

- 状态：records[]
- Getters: getRecordsByDate, getRecordsByDateRange, getTodayRecords
- Actions: addRecord, updateRecord, deleteRecord

4. transaction.ts

- 状态：transactions[]
- Getters: getTransactionsByTarget, getTransactionsByDateRange
- Actions: addTransaction, deleteTransaction

5. settings.ts (扩展)

- 新增：bigBoxWeight(大框斤数), smallBoxWeight(小框斤数)

### 实现任务

Phase 1: 数据模型和Store

Task 1: 创建人员 Store

Step 1: src/store/worker.ts

Step 2: 导出 Store
`export { useWorkerStore } from './worker'`

Step 3: 提交

```
git add store/worker.ts store/index.ts
git commit -m "feat: add worker store"
```

Task 2: 创建商户 Store

Files:

- Create: store/merchant.ts

Step 1: 创建 Store

Step 2: 导出 Store

```
export { useMerchantStore } from './merchant'
```

Step 3: 提交

```
git add store/merchant.ts store/index.ts
git commit -m "feat: add merchant store"
```

Task 3: 创开发车记录 Store

Files:

- Create: store/departure.ts

  Step 1: 创建 Store

Step 2: 导出 Store

```
 export { useDepartureStore } from './departure'
```

Step 3: 提交

```
git add store/departure.ts store/index.ts
git commit -m "feat: add departure record store"
```

Task 4: 创建账目 Store

Files:

- Create: store/transaction.ts

Step 1: 创建 Store

Step 2: 导出 Store

```
 export { useTransactionStore } from './transaction'
```

Step 3: 提交

```
git add store/transaction.ts store/index.ts
git commit -m "feat: add transaction store"
```

Task 5: 扩展设置 Store

Files:

- Modify: store/settings.ts

Step 1: 添加新设置项

```
// 在现有状态中添加
const bigBoxWeight = ref(50) // 大框斤数，默认50斤
const smallBoxWeight = ref(30) // 小框斤数，默认30斤
```

Step 2: 添加保存/加载逻辑

在` loadSettings` 和 `saveSettings `中处理这两个新字段

Step 3: 提交

```
 git add store/settings.ts
 git commit -m "feat: add box weight settings"
```

Phase 2: 页面开发

Task 6: 配置页面路由

Files:

- Modify: pages.json

Step 1: 添加页面配置

```json
{
  "pages": [
    // 现有页面...
    {
      "path": "pages/home/home",
      "style": {
        "navigationBarTitleText": "首页"
      }
    },
    {
      "path": "pages/departure/departure",
      "style": {
        "navigationBarTitleText": "发车记录"
      }
    },
    {
      "path": "pages/departure/form",
      "style": {
        "navigationBarTitleText": "发车记录"
      }
    },
    {
      "path": "pages/merchant/merchant",
      "style": {
        "navigationBarTitleText": "商户管理"
      }
    },
    {
      "path": "pages/worker/worker",
      "style": {
        "navigationBarTitleText": "人员管理"
      }
    },
    {
      "path": "pages/statistics/statistics",
      "style": {
        "navigationBarTitleText": "统计"
      }
    },
    {
      "path": "pages/transaction/transaction",
      "style": {
        "navigationBarTitleText": "结账"
      }
    }
  ],
  "tabBar": {
    "list": [
      {
        "pagePath": "pages/home/home",
        "text": "首页",
        "iconPath": "static/home.png",
        "selectedIconPath": "static/home-active.png"
      },
      {
        "pagePath": "pages/departure/departure",
        "text": "发车",
        "iconPath": "static/truck.png",
        "selectedIconPath": "static/truck-active.png"
      },
      {
        "pagePath": "pages/merchant/merchant",
        "text": "商户",
        "iconPath": "static/merchant.png",
        "selectedIconPath": "static/merchant-active.png"
      },
      {
        "pagePath": "pages/worker/worker",
        "text": "人员",
        "iconPath": "static/worker.png",
        "selectedIconPath": "static/worker-active.png"
      },
      {
        "pagePath": "pages/statistics/statistics",
        "text": "统计",
        "iconPath": "static/chart.png",
        "selectedIconPath": "static/chart-active.png"
      }
    ]
  }
}
```

Step 2: 提交

```
 git add pages.json
 git commit -m "feat: add page routes and tabbar"
```

Task 7: 人员管理页面

Files:

- Create: pages/worker/worker.vue

Step 1: 创建页面

Step 2: 提交

```
git add pages/worker/worker.vue
git commit -m "feat: add worker management page"
```

---

Task 8: 商户管理页面

Files:

- Create: pages/merchant/merchant.vue

类似人员管理页面，包含商户名、手机号、差额字段

Step 1: 创建页面  
 Step 2: 提交

```
git add pages/merchant/merchant.vue
git commit -m "feat: add merchant management page"
```

---

Task 9: 发车记录列表页面

Files:

- Create: pages/departure/departure.vue

Step 1: 创建页面

Step 2: 提交

```
git add pages/departure/departure.vue
git commit -m "feat: add departure list page"
```

---

Task 10: 发车记录表单页面（核心）

Files:

- Create: pages/departure/form.vue

这是最复杂的页面，包含所有字段和自动计算逻辑

Step 1: 创建页面

Step 2: 提交

```
git add pages/departure/form.vue
git commit -m "feat: add departure form page with calculations"
```

---

Task 11: 首页

Files:

- Create: pages/home/home.vue

Step 1: 创建页面

Step 2: 提交

```
git add pages/home/home.vue
git commit -m "feat: add home page"
```

---

Task 12: 统计页面

Files:

- Create: pages/statistics/statistics.vue

Step 1: 创建页面

Step 2: 提交

```
git add pages/statistics/statistics.vue
git commit -m "feat: add statistics page"
```

---

Task 13: 结账页面

Files:

- Create: pages/transaction/transaction.vue

Step 1: 创建页面

Step 2: 提交

```
git add pages/transaction/transaction.vue
git commit -m "feat: add transaction page"
```

---

Phase 3: 完善和测试

Task 14: 添加图标资源

需要添加 TabBar 图标（5组：home, truck, merchant, worker, chart）

Task 15: 测试验证

1.  运行 `npm run dev:好的5` 启动开发服务器
2.  测试各页面功能
3.  验证计算公式

---

关键文件清单

新增文件

- train-departure-diary/store/worker.ts - 人员管理 Store
- train-departure-diary/store/merchant.ts - 商户管理 Store
- train-departure-diary/store/departure.ts - 发车记录 Store
- train-departure-diary/store/transaction.ts - 账目 Store
- train-departure-diary/pages/home/home.vue - 首页
- train-departure-diary/pages/worker/worker.vue - 人员管理页面
- train-departure-diary/pages/merchant/merchant.vue - 商户管理页面
- train-departure-diary/pages/departure/departure.vue - 发车记录列表
- train-departure-diary/pages/departure/form.vue - 发车记录表单
- train-departure-diary/pages/statistics/statistics.vue - 统计页面
- train-departure-diary/pages/transaction/transaction.vue - 结账页面

修改文件

- train-departure-diary/pages.json - 添加页面路由和 TabBar
- train-departure-diary/store/index.ts - 导出新 Store
- train-departure-diary/store/settings.ts - 添加框重设置

---

验证方式

1.  开发测试: `cd train-departure-diary && npm run dev:h5`
2.  功能验证:

- 添加人员和商户
- 创建发车记录，验证自动计算
- 进行结账操作
- 查看统计数据

3.  小程序构建: `cd train-departure-diary && npm run build:mp-weixin`
