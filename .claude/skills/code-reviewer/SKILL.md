---
name: code-reviewer
description: |
  为 train-departure-diary 项目进行代码质量审查。当用户要求审查代码、检查bug、验证实现、审视代码质量、或请求代码回顾时触发。
  特别关注：Pinia store 模式、uniCloud 数据库操作、角色权限控制、错误处理一致性。
  使用此技能检查：代码重复、安全漏洞、性能问题、类型安全、错误处理完整性。
triggers:
  - "审查代码"
  - "检查bug"
  - "代码回顾"
  - "review code"
  - "code review"
  - "检查代码质量"
  - "验证实现"
---

# 代码质量审查技能

## 项目背景

这是一个 **uni-app + Vue 3 + Pinia + uniCloud** 的发车日记应用。

### 技术栈

| 类别     | 技术            |
| -------- | --------------- |
| 框架     | UniApp (Vue 3)  |
| 状态管理 | Pinia           |
| 数据库   | uniCloud 阿里云 |
| UI 组件  | uni-ui          |

### 关键目录

```
store/           - Pinia 状态管理 (user, departure, merchant, worker, transaction, settings, dailyQuote)
utils/           - 工具函数 (db.js, errorHandler.ts, validate.js)、业务计算逻辑
pages/           - Vue 页面组件
uniCloud-aliyun/database/  - 云数据库 Schema
```

---

## 审查标准

### 1. 错误处理一致性

**必须检查项：**

- 所有 async 数据库操作必须有 try-catch
- catch 块必须调用 `showErrorToast()` 显示用户提示
- catch 块必须 `console.error()` 记录详细错误
- 错误信息前缀使用 `【StoreName】` 格式

**正确示例：**

```typescript
const addRecord = async (record) => {
  try {
    const newRecord = { ...record, id: Date.now().toString() };
    records.value.push(newRecord);
    await saveRecords();
  } catch (e) {
    console.error("【Departure】保存发车记录失败:", e);
    showErrorToast("保存发车记录失败");
    throw e;
  }
};
```

**错误示例：**

```typescript
// 缺少 try-catch
const addRecord = async (record) => {
  const newRecord = { ...record, id: Date.now().toString() }
  records.value.push(newRecord)
  await saveRecords()
}

// 缺少用户提示
const addRecord = async (record) => {
  try {
    ...
  } catch (e) {
    console.error('保存失败', e)  // 没有 showErrorToast
  }
}

```

### 2. 相关数据计算

发车记录表单中计算逻辑:

**注意避免 js 计算中的精度丢失问题，确保所有数据都是 number 计算，计算逻辑完全按照一下方式计算，不允许修改**

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

员工发车总应收 = 时间范围内发车记录.reduce((record, amount) => {
const recordAmount = record.发车费用 + record.装车费 / record.装车人员数量
amount += recordAmount
return amount
}, 0)
员工应结 = 员工发车总应收 - 已结金额

鸡场结账中计算逻辑：

时间范围内发车记录中该鸡场应结总和 - 已结金额

### 3. CRUD 操作完整性

**Store CRUD 标准方法：**
| 方法 | 必须行为 |
|------|----------|
| `loadXxx()` | 从云端加载数据，设置空数组作为失败安全值 |
| `addXxx()` | 生成 ID，添加到 state，调用 save |
| `updateXxx()` | 查找 index，合并更新，调用 save |
| `deleteXxx()` | 从 state 过滤掉，调用 delete |
| `saveXxx()` | 遍历操作，云端 upsert 模式 |

### 3. 角色权限控制

**角色定义 (store/user.ts)：**

```typescript
export const ROLES = {
  ADMIN: "admin", // 管理员 - 全部数据
  MIDDLEMAN: "middleman", // 中间商 - 自己+下属
  LOADER: "loader", // 装发车 - 自己的数据
  FARM: "farm", // 鸡场 - 无发车记录权限
};
```

**filteredXxx computed 必须包含：**

- ADMIN 返回全部
- MIDDLEMAN 返回自己创建 + parentId 为自己的装发车数据
- LOADER 返回 userId 为自己的数据
- FARM 返回空数组

### 4. 数据库操作规范

**db.js 封装模块：**

```javascript
dbOps; // 通用 CRUD: queryAll, insert, update, delete, queryBy, deleteAll
userDbOps; // 用户操作: getUserByPhone, getUserById, createUser, updateUser
inviteDbOps; // 邀请码: getByCode, create, useCode, getByCreator
```

**规范：**

- 所有数据库操作通过 dbOps 封装
- 不直接操作 uniCloud API
- JSON 字段存储前序列化，读取后反序列化

### 5. 性能与安全

**禁止：**

- 在 computed 中执行 async 操作
- 在模板中调用有副作用的方法
- 拼接用户输入到数据库查询（SQL 注入风险）
- 在 store 初始化外直接修改 state

**推荐：**

- 使用 `computed` 处理派生数据
- 使用 `watch` 处理副作用
- 用户输入先验证再使用

---

## 审查流程

### 步骤 1：识别变更范围

- 读取 git diff 或用户指定的文件
- 分类：store/ 页面对应/ 工具函数/ 配置

### 步骤 2：按类别审查

**Store 文件审查点：**

1. 是否有完整的 CRUD 方法
2. errorHandler 是否正确导入和使用
3. filteredXxx computed 是否正确实现角色过滤
4. 是否有适当的 fail-safe 默认值

**页面文件审查点：**

1. 是否正确导入和使用 store
2. 是否有必要的 onMounted/init 初始化调用
3. 表单验证是否完整
4. 是否有内存泄漏风险（未卸载的 listener）

**工具函数审查点：**

1. 是否处理边界情况
2. 是否有适当的类型标注
3. 是否有单元测试

### 步骤 3：生成审查报告

使用以下格式：

```
## 审查报告

### 概要
- 审查文件：xxx
- 发现问题：N 个
  - 🔴 严重：M 个
  - 🟡 警告：K 个
  - 💡 建议：L 个

### 严重问题
[问题描述及修复建议]

### 警告
[可能的问题]

### 建议
[可改进的地方]
```

---

## 快速检查清单

对每个变更的文件执行：

- [ ] 所有 async 函数有 try-catch
- [ ] catch 中调用 showErrorToast()
- [ ] console.error 包含上下文前缀
- [ ] 失败时有 fail-safe 默认值
- [ ] 角色过滤逻辑正确
- [ ] 没有 console.log 遗留（生产环境）
- [ ] JSON 序列化/反序列化正确

---

## 参考文件

| 文件                    | 用途                     |
| ----------------------- | ------------------------ |
| `store/user.ts`         | 角色定义和用户认证       |
| `store/departure.ts`    | 发车记录 CRUD + 角色过滤 |
| `store/merchant.ts`     | 商户 CRUD + 角色过滤     |
| `store/worker.ts`       | 员工 CRUD + 角色过滤     |
| `utils/db.js`           | 数据库操作封装           |
| `utils/errorHandler.ts` | 统一错误提示             |
| `utils/calc.ts`         | 业务计算逻辑             |
