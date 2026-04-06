## 项目解析

入口文件`main.js`

- `createSSRApp`是 Vue3 的 SSR 入口
- 通过 `app.use(pinia)`注册后，所有组件可通过 `useXxxStore()`访问状态

应用初始化 - `App.vue`

- `onLaunch` 初始化用户状态 ， 应用启动时执行一次
- `onShow`检查登录状态 ， 应用每次显示时执行
- `uni.getStorageSync('key')`获取缓存数据

页面路由 - `pages.json`

- `tabBar` 定义底部 4 个 Tab 页 （最多5个）
- 非 `Tab` 页需用 `uni.navigateTo` 或 `uni.reLaunch` 跳转