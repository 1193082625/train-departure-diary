# 架构概览

## 技术栈

| 类别     | 技术              |
| -------- | ----------------- |
| 框架     | UniApp (Vue 3)   |
| 状态管理 | Pinia             |
| 数据库   | 自建阿里云 MySQL |
| 后端     | Express (Node.js) |
| API      | HTTP REST API    |
| 图表     | uCharts           |
| UI 组件  | uni-ui            |

## 项目目录结构

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
│   ├── toast.js         # Toast 提示封装
│   └── validate.js      # 表单验证
├── components/          # 公共组件
├── static/              # 静态资源
├── sql/                 # SQL 脚本
│   └── schema-mysql.sql # MySQL 建表语句
├── types/               # TypeScript 类型定义
├── uni_modules/         # uni-ui 插件
└── uniCloud-aliyun/     # 历史遗留 (uniCloud 时期)
```

> **注意**: Express 后端已独立为单独项目 `train-departure-diary-server`

## 关键文件

| 文件                              | 说明                    |
| --------------------------------- | ----------------------- |
| utils/api.js                      | HTTP API 调用封装       |
| utils/toast.js                    | Toast 提示封装          |
| utils/calc.ts                     | 计算工具函数            |
| store/user.ts                     | 用户状态管理            |
| store/departure.ts                | 发车记录状态管理        |
| pages/home/components/daily-quotes.vue | 日报价组件 (API-first) |
| pages/departure/form.vue          | 发车表单 (含成本计算)   |
| components/record-card.vue        | 发车记录卡片组件        |
| sql/schema-mysql.sql              | MySQL 建表语句          |
| train-departure-diary-server/index.js | Express 后端服务入口 |
| uniCloud-aliyun/database/*.schema.json | 历史遗留 (旧 Schema) |

## 开发注意事项

1. **数据库操作**: 所有数据库操作通过 `utils/api.js` 封装，调用后端 HTTP API
2. **角色权限**: 发车记录、员工、鸡场等数据按角色过滤
3. **JSON 字段**: merchantDetails, truckRows, merchantAmount 等为 JSON 字符串
4. **会话管理**: 登录状态通过 localStorage 存储，7 天有效期
5. **邀请码**: 6 位数字，唯一性由云端 MySQL 保证
6. **后端服务**: 前端 API 请求发送至 `http://47.96.90.103:3000/api`（独立部署）

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

## 自动推送

- 每次更新完对应代码，涉及到敏感信息的文件，主动添加到 `.gitignore` 中，如果不确定信息是否敏感，可以先询问。

## 测试原则

- 每一次修改都应该有对应的测试处理和质量审查，按情况更新测试用例和测试代码
- 测试应验证外部行为，而不是过度关注内部实现
