# Store 模块结构

## Store 模块列表

| Store            | 文件                    | 职责                       |
| ---------------- | ----------------------- | -------------------------- |
| userStore        | store/user.ts           | 用户认证、角色、邀请码管理 |
| merchantStore    | store/merchant.ts       | 鸡场 CRUD                  |
| workerStore      | store/worker.ts         | 员工 CRUD                  |
| departureStore   | store/departure.ts      | 发车记录 CRUD              |
| transactionStore | store/transaction.ts    | 交易记录 CRUD              |
| settingsStore    | store/settings.ts       | 系统参数配置               |

> **注意**: 日报价 (daily-quotes.vue) 已重构为 API-first 模式，直接使用 `dailyQuoteApi` 调用后端 API，不再使用 Pinia store 管理。

## userStore 主要功能

- `login(phone, code)` - 登录/注册
- `logout()` - 登出
- `generateCode(type, workerInfo)` - 生成邀请码
- `getMyCodes()` - 获取自己生成的邀请码
- `loadUsers()` - 加载所有用户
- `getMiddlemanId()` - 获取中间商 ID
- `getMyMerchantIds()` - 获取可访问的商户 ID 列表
- `getMyWorkerIds()` - 获取可访问的员工 ID 列表

## departureStore 角色过滤逻辑

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
