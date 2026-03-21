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
utils/           - 工具函数 (db.js, errorHandler.ts, validate.js)
calc/            - 业务计算逻辑
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

### 2. CRUD 操作完整性

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
| `calc/index.ts`         | 业务计算逻辑             |
