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

| 类别     | 技术              |
| -------- | ----------------- |
| 框架     | UniApp (Vue 3)   |
| 状态管理 | Pinia             |
| 数据库   | 自建阿里云 MySQL |
| 后端     | Express (Node.js) |
| API      | HTTP REST API    |
| 图表     | uCharts           |
| UI 组件  | uni-ui            |

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
│   ├── calc.ts          # 业务计算逻辑
│   ├── api.js           # HTTP API 调用封装
│   ├── db-mysql.js      # MySQL 操作封装 (已废弃)
│   ├── db.js            # 数据库操作封装 (已迁移到 api.js)
│   ├── validate.js      # 表单验证
│   └── eventBus.js      # 事件总线
├── components/          # 公共组件
├── static/              # 静态资源
├── config/              # 配置文件
│   └── database.js      # 数据库配置
├── sql/                 # SQL 脚本
│   └── schema-mysql.sql # MySQL 建表语句
└── uniCloud-aliyun/     # 历史遗留 (uniCloud 时期)
    └── database/        # 旧数据表 Schema
```

> **注意**: Express 后端已独立为单独项目 [train-departure-diary-server](https://github.com/your-repo/train-departure-diary-server)

---

## 数据库设计 (MySQL 数据库)

### 数据表结构

| 表名               | 说明       | 主要字段                                                             |
| ------------------ | ---------- | -------------------------------------------------------------------- |
| `users`            | 用户表     | id, phone, nickname, password, role, inviteCode, parentId            |
| `merchants`        | 鸡场表     | id, name, margin, contact, phone, address, userId                   |
| `workers`          | 员工表     | id, name, type(departure/loading/both), phone, userId                |
| `departures`       | 发车记录表 | id, date, dailyQuote, merchantDetails(JSON), truckRows(JSON), userId |
| `invitation_codes` | 邀请码表   | id, code, type, creatorId, usedBy, workerInfo                       |
| `transactions`     | 交易记录表 | id, date, targetId, amount, type, userId                             |
| `settings`         | 设置表     | id, userId, 各种斤数和费用默认值                                     |
| `daily_quotes`     | 日报价表   | id, date, quote, userId                                              |

### 表详细结构

#### users (用户表)

| 字段       | 类型   | 说明                               |
| ---------- | ------ | ---------------------------------- |
| id         | string | 用户 ID (UUID)                     |
| phone      | string | 手机号 (唯一)                      |
| nickname   | string | 昵称                               |
| password   | string | 密码                               |
| role       | string | 角色 (admin/middleman/loader/farm) |
| inviteCode | string | 用户的邀请码                       |
| invitedBy  | string | 使用的邀请码                       |
| parentId   | string | 上级用户 ID                        |
| workerId   | string | 关联的员工 ID                      |
| workerType | string | 员工类型 (departure/loading/both)  |
| createdAt  | string | 创建时间                           |

#### merchants (鸡场表)

| 字段      | 类型   | 说明         |
| --------- | ------ | ------------ |
| id        | string | ID           |
| name      | string | 名称         |
| margin    | double | 利润/ margin |
| contact   | string | 联系人       |
| phone     | string | 电话         |
| address   | string | 地址         |
| note      | string | 备注         |
| userId    | string | 所属用户 ID  |
| createdAt | string | 创建时间     |

#### workers (员工表)

| 字段      | 类型   | 说明                          |
| --------- | ------ | ----------------------------- |
| id        | string | ID                            |
| name      | string | 姓名                          |
| type      | string | 类型 (departure/loading/both) |
| phone     | string | 电话                          |
| note      | string | 备注                          |
| userId    | string | 所属用户 ID                   |
| createdAt | string | 创建时间                      |

#### departures (发车记录表)

| 字段                  | 类型   | 说明                      |
| --------------------- | ------ | ------------------------- |
| id                    | string | ID                        |
| date                  | string | 日期                      |
| dailyQuote            | double | 日报价                    |
| merchantDetails       | string | 商户明细 (JSON)           |
| reservedBigBoxes      | int    | 预留大箱                  |
| reservedSmallBoxes    | int    | 预留小箱                  |
| reservedBigBoxesTotal | int    | 预留大箱合计              |
| reservedSmallBoxesTotal | int  | 预留小箱合计              |
| reservedTotal         | double | 预留合计                  |
| departureWorkerId     | string | 发车人员 ID               |
| loadingWorkerIds      | string | 装车人员 ID 列表 (JSON)   |
| fuelCost / oilFee     | double | 油费                      |
| entryFee              | double | 入场费                    |
| tollFee               | double | 过路费                    |
| loadingFee            | double | 装车费                    |
| unloadingFee          | double | 卸车费                    |
| departureFee          | double | 发车费                    |
| truckRows             | string | 车行 (JSON)               |
| truckBig              | int    | 车辆大箱                  |
| truckSmall            | int    | 车辆小箱                  |
| truckCartonBoxesBig   | int    | 车辆纸箱大箱              |
| truckCartonBoxesSmall | int    | 车辆纸箱小箱              |
| truckWeightTotal      | double | 车辆重量合计              |
| arrivalBigBoxes       | int    | 到达大箱                  |
| arrivalSmallBoxes     | int    | 到达小箱                  |
| returnedBigBoxes      | int    | 返回大箱                  |
| returnedSmallBoxes    | int    | 返回小箱                  |
| depotBigBoxes         | int    | 库存大箱                  |
| depotSmallBoxes       | int    | 库存小箱                  |
| depotCartonBoxesBig   | int    | 库存纸箱大箱              |
| depotCartonBoxesSmall | int    | 库存纸箱小箱              |
| smallBoxWeight        | double | 小箱重量                  |
| totalBigBoxes         | int    | 大箱合计                  |
| totalSmallBoxes       | int    | 小箱合计                  |
| merchantBigTotal      | int    | 商户大箱合计              |
| merchantSmallTotal     | int    | 商户小箱合计              |
| merchantWeightTotal   | double | 商户重量合计              |
| allMerchantWeight     | double | 商户总重量                |
| totalReceivePrice     | double | 收款金额合计              |
| totalDeliveryPrice    | double | 付金额合计                |
| merchantAmount        | string | 商户金额 (JSON)           |
| getMoney              | double | 收款金额                  |
| profit                | double | 利润                      |
| userId                | string | 用户 ID                   |
| note                  | string | 备注                      |
| createdAt             | string | 创建时间                  |

#### invitation_codes (邀请码表)

| 字段        | 类型   | 说明                         |
| ----------- | ------ | ---------------------------- |
| id          | string | ID                           |
| code        | string | 邀请码 (6 位数字)            |
| type        | string | 类型 (middleman/loader/farm) |
| creatorId   | string | 创建者 ID                    |
| usedBy      | string | 使用者 ID                    |
| usedAt      | string | 使用时间                     |
| workerId    | string | 关联员工 ID                  |
| workerPhone | string | 员工手机号                   |
| workerName  | string | 员工姓名                     |
| workerType  | string | 员工类型                     |
| createdAt   | string | 创建时间                     |

#### transactions (交易记录表)

| 字段       | 类型   | 说明     |
| ---------- | ------ | -------- |
| id         | string | ID       |
| date       | string | 日期     |
| targetId   | string | 目标 ID  |
| targetType | string | 目标类型 |
| amount     | double | 金额     |
| type       | string | 类型     |
| userId     | string | 用户 ID  |
| note       | string | 备注     |
| createdAt  | string | 创建时间 |

#### settings (设置表)

| 字段                  | 类型   | 说明                   |
| --------------------- | ------ | ---------------------- |
| id                    | string | ID (UUID)              |
| userId                | string | 所属用户 ID (中间商 ID) |
| receiptBigBoxWeight   | double | 收货大箱重量 (默认 45) |
| deliveryBigBoxWeight  | double | 发货大箱重量 (默认 44) |
| smallBoxWeight        | double | 小箱重量 (默认 29.5)   |
| loadingFee            | double | 装车费                 |
| depotCartonBoxesBig   | double | 大箱斤数 (默认 43)     |
| depotCartonBoxesSmall | double | 小箱斤数 (默认 30)     |
| unloadingFee          | double | 卸车费                 |
| departureFee          | double | 发车费                 |
| tollFee               | double | 过路费                 |
| entryFee              | double | 入场费                 |
| oilFee                | double | 油费                   |

#### daily_quotes (日报价表)

| 字段      | 类型   | 说明                   |
| --------- | ------ | ---------------------- |
| id        | string | ID (UUID)              |
| date      | string | 日期 (YYYY-MM-DD)       |
| quote     | double | 日报价                 |
| userId    | string | 所属用户 ID (中间商 ID) |
| createdAt | string | 创建时间               |

---

## 用户角色体系

### 角色定义

```typescript
ROLES = {
  ADMIN: "admin", // 管理员 - 可见全部数据
  MIDDLEMAN: "middleman", // 中间商 - 可见自己+下属数据
  LOADER: "loader", // 装发车 - 可见自己的数据
  FARM: "farm", // 鸡场 - 无发车记录权限
};
```

### 角色权限

| 角色   | 发车记录  | 鸡场管理 | 员工管理 | 交易记录 |
| ------ | --------- | -------- | -------- | -------- |
| 管理员 | 全部      | 全部     | 全部     | 全部     |
| 中间商 | 自己+下属 | 自己创建 | 自己创建 | 自己     |
| 装发车 | 自己的    | 无       | 无       | 无       |
| 鸡场   | 无        | 无       | 无       | 无       |

### 测试用户

| 手机号      | 角色   | 邀请码 | 密码   |
| ----------- | ------ | ------ | ------ |
| 15369375170 | 管理员 | 888888 | 123456 |
| 18131172057 | 中间商 | 111111 | 123456 |

---

## 核心数据流

### 应用初始化流程

```
App.vue (onLaunch)
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

| Store            | 文件                 | 职责                       |
| ---------------- | -------------------- | -------------------------- |
| userStore        | store/user.ts        | 用户认证、角色、邀请码管理 |
| merchantStore    | store/merchant.ts    | 鸡场 CRUD                  |
| workerStore      | store/worker.ts      | 员工 CRUD                  |
| departureStore   | store/departure.ts   | 发车记录 CRUD              |
| transactionStore | store/transaction.ts | 交易记录 CRUD              |
| settingsStore    | store/settings.ts    | 系统参数配置               |

### userStore 主要功能

- `login(phone, code)` - 登录/注册
- `logout()` - 登出
- `generateCode(type, workerInfo)` - 生成邀请码
- `getMyCodes()` - 获取自己生成的邀请码
- `loadUsers()` - 加载所有用户
- `getMiddlemanId()` - 获取中间商 ID
- `getMyMerchantIds()` - 获取可访问的商户 ID 列表
- `getMyWorkerIds()` - 获取可访问的员工 ID 列表

### departureStore 角色过滤逻辑

```typescript
filteredRecords = computed(() => {
  // 管理员: 返回全部
  if (user.role === ROLES.ADMIN) return records;

  // 中间商: 返回自己的 + parentId 为自己的装发车用户添加的记录
  if (user.role === ROLES.MIDDLEMAN) {
    const loaderUserIds = users
      .filter((u) => u.role === ROLES.LOADER && u.parentId === user.id)
      .map((u) => u.id);
    return records.filter(
      (r) => r.userId === user.id || loaderUserIds.includes(r.userId),
    );
  }

  // 装发车: 返回自己的
  if (user.role === ROLES.LOADER) {
    return records.filter((r) => r.userId === user.id);
  }

  // 鸡场: 无发车记录
  return [];
});
```

---

## 数据库操作封装

### 前端 API 调用 (utils/api.js)

前端通过 HTTP API 与后端通信，封装了所有数据库操作。

| 模块        | 方法                                                      | 说明               |
| ----------- | -------------------------------------------------------- | ------------------ |
| apiOps      | queryAll, queryBy, getById, insert, update, delete       | 通用 CRUD          |
| userApi     | getUserByPhone, getUserById, getUserByInviteCode, etc.  | 用户操作           |
| inviteApi   | getByCode, create, useCode, getByCreator                | 邀请码操作         |
| setApiBaseUrl | (url)                                                  | 设置 API 基础地址  |

### 后端服务 (独立项目 train-departure-diary-server)

Express 后端已独立为单独项目，提供 RESTful API，数据库操作在服务端完成。

| 模块                  | 文件                          | 说明               |
| --------------------- | ---------------------------- | ------------------ |
| MySQL 连接            | train-departure-diary-server/config/db.js   | MySQL 连接池封装   |
| CRUD 路由工厂         | train-departure-diary-server/routes/users.js | 通用 CRUD 路由生成 |
| 数据库配置            | train-departure-diary-server/config/database.js | 数据库连接配置   |

**本地启动后端**: `cd ~/Desktop/train-departure-diary/train-departure-diary-server && node index.js`
**远程服务器**: `root@47.96.90.103:/root/train-departure-diary-server/`

### API 端点

| 方法   | 端点                           | 说明         |
| ------ | ----------------------------- | ------------ |
| GET    | /api/:table                   | 查询所有记录 |
| GET    | /api/:table/:id               | 根据 ID 查询 |
| GET    | /api/:table/by/:field/:value  | 根据字段查询 |
| POST   | /api/:table                   | 新增记录     |
| PUT    | /api/:table/:id               | 更新记录     |
| DELETE | /api/:table/:id               | 删除记录     |

### 关键特性

- **HTTP API 调用**: 所有数据库操作通过 `utils/api.js` 封装
- **统一错误处理**: API 请求失败时抛出异常，由调用方处理
- **JSON 字段处理**: merchantDetails, truckRows 等字段在调用方序列化/反序列化

---

## 页面路由

### Tab 页面 (底部导航)

| 页面 | 路径                        | 说明                     |
| ---- | --------------------------- | ------------------------ |
| 首页 | pages/home/home             | 报价日历、图表、今日记录 |
| 盈利 | pages/user/user             | 利润分析                 |
| 结账 | pages/statistics/statistics | 交易统计                 |
| 我的 | pages/profile/profile       | 用户设置                 |

### 其他页面

| 页面       | 路径                          | 说明              |
| ---------- | ----------------------------- | ----------------- |
| 登录       | pages/login/login             | 用户认证          |
| 全屏图表   | pages/home/chart-fullscreen   | 图表全屏展示      |
| 发车列表   | pages/departure/departure     | 发车记录列表      |
| 发车表单   | pages/departure/form          | 新增/编辑发车记录 |
| 鸡场管理   | pages/merchant/merchant       | 鸡场 CRUD         |
| 人员管理   | pages/worker/worker           | 员工 CRUD         |
| 交易记录   | pages/transaction/transaction | 交易流水          |
| 邀请码管理 | pages/profile/invitation      | 邀请码管理        |

---

## 关键文件

| 文件                              | 说明                    |
| --------------------------------- | ----------------------- |
| utils/api.js                      | HTTP API 调用封装       |
| utils/db-mysql.js                 | MySQL 操作封装 (已废弃) |
| utils/calc.ts                     | 计算工具函数            |
| store/user.ts                     | 用户状态管理            |
| store/departure.ts                | 发车记录状态管理        |
| pages/departure/form.vue          | 发车表单 (含成本计算)   |
| config/database.js                | 数据库配置              |
| sql/schema-mysql.sql              | MySQL 建表语句          |
| train-departure-diary-server/index.js | Express 后端服务入口 |
| uniCloud-aliyun/database/\*.schema.json | 历史遗留 (旧 Schema) |

---

## 计算逻辑 (utils/calc.ts)

发车记录表单中计算逻辑:

**注意避免 js 计算中的精度丢失问题，确保所有数据都是 number 计算**

1. **留货数量**:
   留货大框 = 本次共拉大框 + 库房出库大框 - 货车装车大框
   留货小框 = 本次共拉小框 + 库房出库小框 - 货车装车小框
2. **本次共拉**: 各鸡场大框 + 各鸡场小框 + 各鸡场斤数
3. **货车共装**: 装车排数中相关信息统计
4. **回框信息数量合计**: 货车共装了多少框 - 回框信息
5. **鸡场金额明细**:
   鸡场大框应结 = (当日报价 - 鸡场 margin) / 系统参数.收货大框斤数 _ 系统参数.交货大框斤数 _ 鸡场大框数量
   鸡场小框应结 = (当日报价 - 鸡场 margin) / 系统参数.收货大框斤数 _ 发车记录中本趟小框斤数 _ 鸡场小框数量
   鸡场散斤应结 = (当日报价 - 鸡场 margin) / 系统参数.收货大框斤数 \* 鸡场斤数
   鸡场应结 = 鸡场大框应结 + 鸡场小框应结 + 鸡场散斤应结
6. **拉货成本**: 所有鸡场应结总和
7. **留存合计**:
   最低差价 = Math.min(本次记录所选鸡场列表中最低 margin) || 0
   留存单价 = (当日报价 - 最低差价) / 系统参数.收货大框斤数
   留存合计 = (留货大框 _ 大框斤数 + 留货小框 _ 小框斤数 + 各鸡场散斤总和) \* 留存单价
8. **交货应回款**:
   大框应回款 = (当日报价 - 1) _ 货车装车大框数量
   小框应回款 = (当日报价 - 1) / 系统参数.交货大框斤数 _ 发车记录中本趟小框斤数 _ 货车装车小框数量
   大箱应回款 = (当日报价 + 8) / 系统参数.交货大框斤数 _ 货车装车大箱数量 _ 系统参数.大箱斤数
   小箱应回款 = (当日报价 + 5) / 系统参数.交货大框斤数 _ 货车装车小箱数量 \* 系统参数.小箱斤数
9. **本趟盈利**:
   本趟盈利 = 交货应回款 - 拉货成本 - 本趟油费 - 本趟进门费 - 本趟过路费 - 本趟装车费 - 本趟卸车费 - 本趟发车费

员工结账中计算逻辑:

员工应结 = 发车记录.reduce((record, amount) => {
const recordAmount = record.发车费用 + record.装车费 / record.装车人员数量
amount += recordAmount
return amount
}, 0)

鸡场结账中计算逻辑：

时间范围内发车记录中该鸡场应结总和 - 已结金额

---

## 开发注意事项

1. **数据库操作**: 所有数据库操作通过 `utils/api.js` 封装，调用后端 HTTP API
2. **角色权限**: 发车记录、员工、鸡场等数据按角色过滤
3. **JSON 字段**: merchantDetails, truckRows, merchantAmount 等为 JSON 字符串
4. **会话管理**: 登录状态通过 localStorage 存储，7 天有效期
5. **邀请码**: 6 位数字，唯一性由云端 MySQL 保证
6. **后端服务**: 前端 API 请求发送至 `http://47.96.90.103:3000/api`（独立部署）

## 角色与数据相关逻辑

### 中间商角色

- 中间商角色独立管理自己的参数设置
- 中间商角色独立管理自己的鸡场列表，不同中间商之间可能有相同的鸡场
- 中间商角色独立管理自己的人员列表，不同中间商之间可能有相同的员工
- 中间商角色独立管理自己的每日报价，后修改的报价不影响已有的发车记录和根据已有发车记录统计的结账信息
- 发车记录可以查看自己填写的和属于自己人员列表内的装发车角色填写的发车记录，有权修改所有自己能看到的记录

### 超管角色

- 超管角色登录后相关数据按中间商维度展示
- 各中间商之间数据独立

### 装发车角色

- 没有自己的参数设置，默认使用所属中间商的参数设置
- 没有自己的鸡场管理，默认使用所属中间商的鸡场列表填写发车记录
- 没有自己的人员管理，默认使用所属中间商的人员列表填写发车记录
- 只有查看和编辑自己填写的发车记录相关信息和列表，并且不展示和钱相关的统计信息

## 工作原则

- 自动开启所有授权
- 按需要自行决定是否启用多 subAgents
- 按需要自行决定使用哪种工具
- 按需要自行决定使用哪种 skill
- 按需要自行决定使用哪种 mcp
- 按需要自行决定是否在项目中创建新的 Agents、命令、WorkTree
- 属于当前模块的问题，如果不在当前处理的任务中，就额外修复，一起提交
- 执行测试时，如果在浏览器环境中无法正常调用 AI API 时，不要频繁尝试，可以切到 Tauri 模式
- 对于复杂任务或者较大任务，自行拆解多工作流
- 自行阅读修改模块的路程图
- 自行更新对应模块流程图
- 除了 currentUser 和 loginTime，不允许在本地缓存其他数据

## 修改执行前置操作

- 确保不影响其他正常功能
- 尽可能兼容已有数据，避免修改时导致已有数据丢失问题
- 在每一次自动编辑前与用户沟通确保理解一致，如果遇到无法确认的问题要向用户反馈说明，可以要求用户提供相关资源或案例

## 测试原则

- 每一次修改都应该有对应的测试处理和质量审查，按情况更新测试用例和测试代码
- 测试应验证外部行为，而不是过度关注内部实现

## 自动推送

- 每次更新完对应代码，涉及到敏感信息的文件，主动添加到.gitignore 中，如果不确定信息是否敏感，可以先询问。

## 项目中相关规则

### 今日报价

1. 在日历中添加了报价后，添加发车记录自动带出今日报价但不影响编辑今日保价
   比如：
1. 在首页日历中填写报价 120
1. 在发车记录中新增一条记录使用今日报价 120
1. 改日历中今日报价为 130，不影响已创建记录的报价，编辑今日发车记录时，报价还是之前填写的 120，而不应该是 130
