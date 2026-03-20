# CLAUDE.md

本文档为 Claude Code (claude.ai/code) 在本项目中工作时提供指导。

## 项目介绍，此项目为 uni-app 项目

- 遇到语法问题时参考：https://uniapp.dcloud.net.cn/tutorial/
- 遇到组件问题时参考：https://uniapp.dcloud.net.cn/component/
- 遇到 api 问题时参考：https://uniapp.dcloud.net.cn/api/
- 插件问题参考：https://uniapp.dcloud.net.cn/plugin/
- 工程化问题参考：http://uniapp.dcloud.net.cn/worktile/
- uniCloud 问题参考：https://doc.dcloud.net.cn/uniCloud/
- IDE 问题参考： https://hx.dcloud.net.cn/
- 项目中的图表问题参考：https://www.ucharts.cn/v2/#/guide/index 和 https://www.ucharts.cn/v2/#/demo/index

## 修改时注意

- 本项目不是基于 vite 构建的
- 本项目是通过 HBuilderX 直接创建的 uniapp+uni-ui 项目
- 不要修改本项目结构
- pages.json 中 tab list 不能超过 5 个
- .json 文件中不能有注释

---

## 架构概览

### 技术栈

| 类别 | 技术 |
|------|------|
| 框架 | UniApp (Vue 3) |
| 状态管理 | Pinia |
| 数据库 | uniCloud 阿里云 |
| 图表 | uCharts |
| UI 组件 | uni-ui |

### 项目目录结构

```
├── App.vue              # 应用入口
├── main.js              # Vue 初始化
├── pages.json           # 页面路由配置
├── pages/               # 页面组件
│   ├── login/           # 登录页
│   ├── home/            # 首页
│   ├── departure/       # 发车管理
│   ├── merchant/        # 鸡场管理
│   ├── worker/          # 员工管理
│   ├── transaction/     # 交易记录
│   ├── statistics/      # 结账统计
│   ├── user/            # 盈利统计
│   └── profile/         # 个人中心
├── store/               # Pinia 状态管理
├── utils/               # 工具函数
│   └── db.js           # 数据库操作封装
├── components/          # 公共组件
├── static/              # 静态资源
└── uniCloud-aliyun/     # 云数据库
    └── database/        # 数据表 Schema
```

---

## 数据库设计 (uniCloud 云数据库)

### 数据表结构

| 表名 | 说明 | 主要字段 |
|------|------|----------|
| `users` | 用户表 | id, phone, nickname, password, role, inviteCode, parentId |
| `merchants` | 鸡场表 | id, name, margin, contact, phone, address, userId |
| `workers` | 员工表 | id, name, type(departure/loading/both), phone, userId |
| `departures` | 发车记录表 | id, date, dailyQuote, merchantDetails(JSON), truckRows(JSON), userId |
| `invitation_codes` | 邀请码表 | id, code, type, creatorId, usedBy, workerInfo |
| `transactions` | 交易记录表 | id, date, targetId, amount, type, userId |
| `settings` | 设置表 | id, 各种斤数和费用默认值 |

### 表详细结构

#### users (用户表)

| 字段 | 类型 | 说明 |
|------|------|------|
| id | string | 用户ID (UUID) |
| phone | string | 手机号 (唯一) |
| nickname | string | 昵称 |
| password | string | 密码 |
| role | string | 角色 (admin/middleman/loader/farm) |
| inviteCode | string | 用户的邀请码 |
| invitedBy | string | 使用的邀请码 |
| parentId | string | 上级用户ID |
| workerId | string | 关联的员工ID |
| workerType | string | 员工类型 (departure/loading/both) |
| createdAt | string | 创建时间 |

#### merchants (鸡场表)

| 字段 | 类型 | 说明 |
|------|------|------|
| id | string | ID |
| name | string | 名称 |
| margin | double | 利润/ margin |
| contact | string | 联系人 |
| phone | string | 电话 |
| address | string | 地址 |
| note | string | 备注 |
| userId | string | 所属用户ID |
| createdAt | string | 创建时间 |

#### workers (员工表)

| 字段 | 类型 | 说明 |
|------|------|------|
| id | string | ID |
| name | string | 姓名 |
| type | string | 类型 (departure/loading/both) |
| phone | string | 电话 |
| note | string | 备注 |
| userId | string | 所属用户ID |
| createdAt | string | 创建时间 |

#### departures (发车记录表)

| 字段 | 类型 | 说明 |
|------|------|------|
| id | string | ID |
| date | string | 日期 |
| dailyQuote | double | 日报价 |
| merchantDetails | string | 商户明细 (JSON) |
| reservedBigBoxes | int | 预留大箱 |
| reservedSmallBoxes | int | 预留小箱 |
| departureWorkerId | string | 发车人员ID |
| loadingWorkerIds | string | 装车人员ID列表 (JSON) |
| fuelCost | double | 油费 |
| entryFee | double | 入场费 |
| tollFee | double | 过路费 |
| loadingFee | double | 装车费 |
| unloadingFee | double | 卸车费 |
| departureFee | double | 发车费 |
| truckRows | string | 车行 (JSON) |
| truckBig | int | 车辆大箱 |
| truckSmall | int | 车辆小箱 |
| arrivalBigBoxes | int | 到达大箱 |
| arrivalSmallBoxes | int | 到达小箱 |
| returnedBigBoxes | int | 返回大箱 |
| returnedSmallBoxes | int | 返回小箱 |
| merchantAmount | string | 商户金额 (JSON) |
| profit | double | 利润 |
| userId | string | 用户ID |
| note | string | 备注 |
| createdAt | string | 创建时间 |

#### invitation_codes (邀请码表)

| 字段 | 类型 | 说明 |
|------|------|------|
| id | string | ID |
| code | string | 邀请码 (6位数字) |
| type | string | 类型 (middleman/loader/farm) |
| creatorId | string | 创建者ID |
| usedBy | string | 使用者ID |
| usedAt | string | 使用时间 |
| workerId | string | 关联员工ID |
| workerPhone | string | 员工手机号 |
| workerName | string | 员工姓名 |
| workerType | string | 员工类型 |
| createdAt | string | 创建时间 |

#### transactions (交易记录表)

| 字段 | 类型 | 说明 |
|------|------|------|
| id | string | ID |
| date | string | 日期 |
| targetId | string | 目标ID |
| targetType | string | 目标类型 |
| amount | double | 金额 |
| type | string | 类型 |
| userId | string | 用户ID |
| note | string | 备注 |
| createdAt | string | 创建时间 |

#### settings (设置表)

| 字段 | 类型 | 说明 |
|------|------|------|
| id | int | ID |
| receiptBigBoxWeight | double | 收货大箱重量 (默认45) |
| deliveryBigBoxWeight | double | 发货大箱重量 (默认44) |
| smallBoxWeight | double | 小箱重量 (默认29.5) |
| loadingFee | double | 装车费 |
| depotCartonBoxesBig | double | 大箱斤数 (默认43) |
| depotCartonBoxesSmall | double | 小箱斤数 (默认30) |
| unloadingFee | double | 卸车费 |
| departureFee | double | 发车费 |
| tollFee | double | 过路费 |
| entryFee | double | 入场费 |
| oilFee | double | 油费 |

---

## 用户角色体系

### 角色定义

```typescript
ROLES = {
  ADMIN: 'admin',           // 管理员 - 可见全部数据
  MIDDLEMAN: 'middleman',   // 中间商 - 可见自己+下属数据
  LOADER: 'loader',         // 装发车 - 可见自己的数据
  FARM: 'farm'             // 鸡场 - 无发车记录权限
}
```

### 角色权限

| 角色 | 发车记录 | 鸡场管理 | 员工管理 | 交易记录 |
|------|----------|----------|----------|----------|
| 管理员 | 全部 | 全部 | 全部 | 全部 |
| 中间商 | 自己+下属 | 自己创建 | 自己创建 | 自己 |
| 装发车 | 自己的 | 无 | 无 | 无 |
| 鸡场 | 无 | 无 | 无 | 无 |

### 测试用户

| 手机号 | 角色 | 邀请码 | 密码 |
|--------|------|--------|------|
| 15369375170 | 管理员 | 888888 | 123456 |
| 18131172057 | 中间商 | 111111 | 123456 |
| 13800000002 | 装发车 | 222222 | 123456 |
| 13800000003 | 鸡场 | 333333 | 123456 |

---

## 核心数据流

### 应用初始化流程

```
App.vue (onLaunch)
  └── initDB() -> 初始化 uniCloud 数据库连接
  └── useUserStore().init() -> 初始化用户状态
        ├── loadUsers() -> 加载所有用户列表
        └── 恢复登录状态 -> 检查会话是否过期
```

### 用户登录流程

```
login(phone, code)
  ├── 管理员登录: phone=15369375170, code=888888
  ├── 已有密码用户: 验证密码登录
  └── 新用户: 邀请码验证 -> 创建用户 -> 设置密码
```

### 发车记录流程

```
departureStore.loadRecords()
  └── dbOps.queryAll('departures')
        └── 解析 JSON 字符串字段 (merchantDetails, truckRows, etc.)

departureStore.addRecord()
  └── 生成 id, userId, createdAt
  └── saveRecords() -> 遍历写入云端数据库
```

### 数据计算流程 (form.vue)

```
calculateMerchantCost() -> 计算鸡场成本
  ├── 收货价 = (日报价 - 鸡场margin) / 收货大框斤数 * 斤数
  └── 交货价 = 复杂公式计算
```

---

## Store 模块结构

| Store | 文件 | 职责 |
|-------|------|------|
| userStore | store/user.ts | 用户认证、角色、邀请码管理 |
| merchantStore | store/merchant.ts | 鸡场 CRUD |
| workerStore | store/worker.ts | 员工 CRUD |
| departureStore | store/departure.ts | 发车记录 CRUD |
| transactionStore | store/transaction.ts | 交易记录 CRUD |
| settingsStore | store/settings.ts | 系统参数配置 |

### userStore 主要功能

- `login(phone, code)` - 登录/注册
- `logout()` - 登出
- `generateCode(type, workerInfo)` - 生成邀请码
- `getMyCodes()` - 获取自己生成的邀请码
- `loadUsers()` - 加载所有用户
- `getMiddlemanId()` - 获取中间商ID
- `getMyMerchantIds()` - 获取可访问的商户ID列表
- `getMyWorkerIds()` - 获取可访问的员工ID列表

### departureStore 角色过滤逻辑

```typescript
filteredRecords = computed(() => {
  // 管理员: 返回全部
  if (user.role === ROLES.ADMIN) return records

  // 中间商: 返回自己的 + parentId 为自己的装发车用户添加的记录
  if (user.role === ROLES.MIDDLEMAN) {
    const loaderUserIds = users.filter(u =>
      u.role === ROLES.LOADER && u.parentId === user.id
    ).map(u => u.id)
    return records.filter(r =>
      r.userId === user.id || loaderUserIds.includes(r.userId)
    )
  }

  // 装发车: 返回自己的
  if (user.role === ROLES.LOADER) {
    return records.filter(r => r.userId === user.id)
  }

  // 鸡场: 无发车记录
  return []
})
```

---

## 数据库操作封装 (utils/db.js)

### 主要模块

| 模块 | 方法 | 说明 |
|------|------|------|
| initDB | initDB() | 初始化数据库连接 |
| dbOps | queryAll, insert, update, delete, queryBy | 通用 CRUD |
| userDbOps | getUserByPhone, getUserById, createUser, updateUser | 用户操作 |
| inviteDbOps | getByCode, create, useCode, getByCreator | 邀请码操作 |

### 关键特性

- **幂等初始化**: initDB() 成功后缓存，后续调用直接返回
- **超时重试**: 最多等待 60 秒 (300次 × 200ms)
- **云端优先**: 所有操作直接读写云端数据库
- **JSON 字段处理**: merchantDetails, truckRows 等字段自动序列化/反序列化

---

## 页面路由

### Tab 页面 (底部导航)

| 页面 | 路径 | 说明 |
|------|------|------|
| 首页 | pages/home/home | 报价日历、图表、今日记录 |
| 盈利 | pages/user/user | 利润分析 |
| 结账 | pages/statistics/statistics | 交易统计 |
| 我的 | pages/profile/profile | 用户设置 |

### 其他页面

| 页面 | 路径 | 说明 |
|------|------|------|
| 登录 | pages/login/login | 用户认证 |
| 全屏图表 | pages/home/chart-fullscreen | 图表全屏展示 |
| 发车列表 | pages/departure/departure | 发车记录列表 |
| 发车表单 | pages/departure/form | 新增/编辑发车记录 |
| 鸡场管理 | pages/merchant/merchant | 鸡场 CRUD |
| 人员管理 | pages/worker/worker | 员工 CRUD |
| 交易记录 | pages/transaction/transaction | 交易流水 |
| 邀请码管理 | pages/profile/invitation | 邀请码管理 |

---

## 关键文件

| 文件 | 说明 |
|------|------|
| utils/db.js | 数据库操作封装 |
| store/user.ts | 用户状态管理 |
| store/departure.ts | 发车记录状态管理 |
| pages/departure/form.vue | 发车表单 (含成本计算) |
| calc/index.ts | 计算工具函数 |
| uniCloud-aliyun/database/*.schema.json | 数据库表结构定义 |

---

## 计算逻辑 (calc/index.ts)

发车记录表单中的成本计算逻辑:

1. **收货价计算**: 鸡场收货价格
2. **交货价计算**: 鸡场交货价格
3. **利润计算**: 收入 - 成本 - 费用
4. **箱数统计**: 大箱/小箱的收发存统计

---

## 开发注意事项

1. **数据库操作**: 所有数据库操作通过 `utils/db.js` 封装
2. **角色权限**: 发车记录、员工、鸡场等数据按角色过滤
3. **JSON 字段**: merchantDetails, truckRows, merchantAmount 等为 JSON 字符串
4. **会话管理**: 登录状态通过 localStorage 存储，7天有效期
5. **邀请码**: 6位数字，唯一性由云端保证
