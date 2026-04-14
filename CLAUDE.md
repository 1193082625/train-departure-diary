# CLAUDE.md

本文档为 Claude Code (claude.ai/code) 在本项目中工作时提供指导。

## 项目介绍

此项目为 uni-app 项目 (Vue 3)。

## uni-app 参考文档

- 语法问题：https://uniapp.dcloud.net.cn/tutorial/
- 组件问题：https://uniapp.dcloud.net.cn/component/
- API 问题：https://uniapp.dcloud.net.cn/api/
- 插件问题：https://uniapp.dcloud.net.cn/plugin/
- 工程化问题：http://uniapp.dcloud.net.cn/worktile/
- uniCloud 问题：https://doc.dcloud.net.cn/uniCloud/
- IDE 问题：https://hx.dcloud.net.cn/
- 图表问题：https://www.ucharts.cn/v2/#/guide/index 和 https://www.ucharts.cn/v2/#/demo/index

## 修改时注意

- 本项目不是基于 vite 构建的
- 本项目是通过 HBuilderX 直接创建的 uniapp+uni-ui 项目
- 不要修改本项目结构
- pages.json 中 tab list 不能超过 5 个
- .json 文件中不能有注释

## 文档索引

详细文档在 `docs/` 目录下，按需读取：

| 文档 | 内容 |
| ---- | ---- |
| [architecture.md](docs/architecture.md) | 项目结构、技术栈、目录、关键文件、工作原则 |
| [database.md](docs/database.md) | MySQL 数据库设计、所有表结构 |
| [roles.md](docs/roles.md) | 用户角色体系、权限、数据归属逻辑 |
| [stores.md](docs/stores.md) | Pinia Store 模块、数据流、角色过滤逻辑 |
| [api.md](docs/api.md) | API 调用封装、后端服务、端点说明 |
| [pages.md](docs/pages.md) | 页面路由 (Tab 页面、其他页面) |
| [calc.md](docs/calc.md) | 发车记录、员工结账、鸡场结账计算逻辑 |
| [testing.md](docs/testing.md) | 测试框架、Vitest/Playwright 配置 |
