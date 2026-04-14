# API 调用封装

## 前端 API 调用 (utils/api.js)

前端通过 HTTP API 与后端通信，封装了所有数据库操作。

| 模块          | 方法                                                      | 说明               |
| ------------- | -------------------------------------------------------- | ------------------ |
| apiOps        | queryAll, queryBy, getById, insert, update, delete       | 通用 CRUD          |
| userApi       | getUserByPhone, getUserById, getUserByInviteCode, etc.  | 用户操作           |
| inviteApi     | getByCode, create, useCode, getByCreator                | 邀请码操作         |
| dailyQuoteApi | getByDate, getByDateRange, create, update, delete       | 日报价 CRUD (API-first) |
| setApiBaseUrl | (url)                                                    | 设置 API 基础地址  |

## 后端服务 (独立项目 train-departure-diary-server)

Express 后端已独立为单独项目，提供 RESTful API，数据库操作在服务端完成。

| 模块                  | 文件                          | 说明               |
| --------------------- | ---------------------------- | ------------------ |
| MySQL 连接            | train-departure-diary-server/config/db.js   | MySQL 连接池封装   |
| CRUD 路由工厂         | train-departure-diary-server/routes/users.js | 通用 CRUD 路由生成 |
| 数据库配置            | train-departure-diary-server/config/database.js | 数据库连接配置   |

**本地启动后端**: `cd ~/Desktop/train-departure-diary/train-departure-diary-server && node index.js`
**远程服务器**: `root@47.96.90.103:/root/train-departure-diary-server/`

## API 端点

| 方法   | 端点                           | 说明         |
| ------ | ----------------------------- | ------------ |
| GET    | /api/:table                   | 查询所有记录 |
| GET    | /api/:table/:id               | 根据 ID 查询 |
| GET    | /api/:table/by/:field/:value  | 根据字段查询 |
| POST   | /api/:table                   | 新增记录     |
| PUT    | /api/:table/:id               | 更新记录     |
| DELETE | /api/:table/:id               | 删除记录     |

## 关键特性

- **HTTP API 调用**: 所有数据库操作通过 `utils/api.js` 封装
- **统一错误处理**: API 请求失败时抛出异常，由调用方处理
- **JSON 字段处理**: merchantDetails, truckRows 等字段在调用方序列化/反序列化
