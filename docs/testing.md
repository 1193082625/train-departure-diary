# 测试框架

项目使用 Vitest 进行单元测试，Playwright 进行 E2E 测试。

## 测试命令

| 命令            | 说明                       |
| -------------- | -------------------------- |
| `npm test`     | 执行单元测试 (watch 模式)   |
| `npm run test:run` | 执行单元测试 (CI 模式)   |
| `npm run test:e2e` | 执行 E2E 测试           |
| `npm run test:e2e:ui` | 执行 E2E 测试 (UI 模式) |

## 测试文件结构

```
tests/
├── setup.js              # Vitest 全局 mock 配置
├── unit/
│   ├── api.test.js       # API 封装测试 (缓存逻辑、CRUD)
│   ├── worker.test.js    # 人员管理模块测试 (角色过滤、表单验证)
│   ├── merchant.test.js  # 鸡场管理模块测试 (CRUD、角色过滤)
│   ├── transaction.test.js # 交易记录模块测试
│   ├── merchantStatistics.test.js # 鸡场统计模块测试
│   └── dailyQuote.test.js # 每日报价模块测试 (API-first)
└── e2e/
    └── worker.spec.js     # 人员管理页面 E2E 测试
```

## 安装测试依赖

```bash
npm install
npx playwright install --with-deps chromium
```

## 单元测试覆盖范围

**api.test.js**:
- `apiOps.queryAll` 缓存逻辑 (命中/未命中/区分表)
- `apiOps.insert/update/delete` 方法调用和缓存清除
- `cacheOps.clear/clearAll/getStats` 缓存管理

**worker.test.js**:
- `loadWorkers` API 调用和分页处理
- 角色过滤逻辑 (管理员/中间商/装发车)
- CRUD 操作 (添加/编辑/删除员工)
- 表单验证 (姓名、手机号)

**dailyQuote.test.js**:
- 角色过滤逻辑 (管理员/中间商/装发车/鸡场)
- 按日期获取报价 (getQuoteByDate)
- API 调用模拟 (加载/新增/更新报价)
- 事件总线集成 (dailyQuote:refresh)
- 数据一致性验证

## E2E 测试覆盖范围

- 页面加载和元素验证
- 添加/编辑/删除人员完整流程
- 弹窗交互和表单验证
- 下拉刷新和上拉加载
- Picker 选择器交互
- 角色权限差异 (管理员 vs 中间商)

## 注意事项

1. **uni-app API Mock**: `tests/setup.js` 中已全局 mock `uni.request` 等 uni API
2. **E2E 测试需要后端**: E2E 测试依赖后端服务运行，确保 `train-departure-diary-server` 已启动
3. **测试隔离**: 每个测试用例使用 `beforeEach` 重置 mock 状态
