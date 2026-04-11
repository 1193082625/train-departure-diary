import { test, expect } from '@playwright/test'

/**
 * E2E 测试注意事项:
 * 1. 这些测试需要在 H5 模式下运行 uni-app 项目
 * 2. 需要先启动后端服务: cd ~/Desktop/train-departure-diary/train-departure-diary-server && node index.js
 * 3. 需要启动前端 H5 服务: 使用 HBuilderX 运行或手动构建 H5
 * 4. 测试账号: 中间商 18131172057/123456, 管理员 15369375170/123456
 */

test.describe('人员管理页面 E2E 测试', () => {
  test.beforeEach(async ({ page }) => {
    // 跳过所有 E2E 测试 - 需要完整的 H5 环境
    // 这些测试需要: 1) 后端服务运行 2) 前端 H5 服务运行
    test.skip(true, 'E2E tests require H5 dev server running')
  })

  test('应该正确加载人员管理页面', async ({ page }) => {
    await page.goto('/pages/login/login')
    // 等待页面加载
    await page.waitForSelector('.login-container')
    // 验证标题
    await expect(page.locator('.title')).toHaveText('发车日记')
  })

  test('应该能够打开添加人员弹窗', async ({ page }) => {
    // 登录流程
    await page.goto('/pages/login/login')
    await page.waitForSelector('.login-container')

    // 输入手机号 (中间商账号)
    await page.fill('input[type="number"]', '18131172057')
    await page.waitForTimeout(500) // 等待手机号验证

    // 输入密码
    await page.fill('input[type="text"]', '123456')

    // 勾选协议
    await page.click('.agreement-label checkbox')

    // 点击登录
    await page.click('.login-btn')

    // 等待登录成功后导航到人员管理页面
    await page.waitForURL('**/pages/home/home', { timeout: 10000 })

    // 跳转到人员管理页面
    await page.click('text=人员管理')
    await page.waitForURL('**/pages/worker/worker')

    // 验证页面标题
    await expect(page.locator('.title')).toHaveText('人员管理')

    // 验证添加按钮存在 (中间商角色)
    await expect(page.locator('.add-btn')).toBeVisible()
  })

  test('应该能够关闭添加人员弹窗', async ({ page }) => {
    await page.goto('/pages/worker/worker')
    await page.click('.add-btn')
    await expect(page.locator('.modal')).toBeVisible()
    await page.click('.modal-actions button:first-child')
    await expect(page.locator('.modal')).not.toBeVisible()
  })

  test('应该验证表单必填项', async ({ page }) => {
    await page.goto('/pages/worker/worker')
    await page.click('.add-btn')
    await page.click('.modal-actions button:last-child')
    // 验证错误提示
    const toast = page.locator('.toast-text')
    await expect(toast).toBeVisible()
  })

  test('应该能够添加新人员', async ({ page }) => {
    await page.goto('/pages/worker/worker')
    await page.click('.add-btn')
    await page.fill('input[placeholder="请输入姓名"]', '测试员工')
    await page.fill('input[placeholder="请输入手机号"]', '13900000001')
    await page.click('.modal-actions button:last-child')
    await expect(page.locator('text=添加成功')).toBeVisible({ timeout: 5000 })
  })

  test('应该能够编辑已有人员', async ({ page }) => {
    await page.goto('/pages/worker/worker')
    await page.waitForSelector('.worker-card')
    await page.click('.worker-card .actions text:first-child')
    await expect(page.locator('.modal-title')).toHaveText('编辑人员')
    const nameInput = page.locator('input[placeholder="请输入姓名"]')
    await nameInput.clear()
    await nameInput.fill('修改后的姓名')
    await page.click('.modal-actions button:last-child')
    await expect(page.locator('text=更新成功')).toBeVisible({ timeout: 5000 })
  })

  test('应该能够删除人员', async ({ page }) => {
    await page.goto('/pages/worker/worker')
    await page.waitForSelector('.worker-card')
    await page.click('.worker-card .actions text:last-child')
    await expect(page.locator('text=确认删除')).toBeVisible()
    await page.click('.uni-modal__btn_primary')
    await expect(page.locator('text=删除成功')).toBeVisible({ timeout: 5000 })
  })

  test('应该能够下拉刷新', async ({ page }) => {
    await page.goto('/pages/worker/worker')
    await page.evaluate(() => uni.startPullDownRefresh())
    await page.waitForTimeout(1000)
    await page.evaluate(() => uni.stopPullDownRefresh())
  })

  test('应该正确显示员工类型标签', async ({ page }) => {
    await page.goto('/pages/worker/worker')
    await page.waitForSelector('.worker-card')
    const tags = page.locator('.worker-card .worker-type .tag')
    const count = await tags.count()
    expect(count).toBeGreaterThan(0)
  })
})

test.describe('人员管理页面角色权限测试', () => {
  test.beforeEach(async ({ page }) => {
    test.skip(true, 'E2E tests require H5 dev server running')
  })

  test('管理员应该看到分组展示', async ({ page }) => {
    await page.goto('/pages/login/login')
    await page.fill('input[type="number"]', '15369375170')
    await page.waitForTimeout(500)
    await page.fill('input[type="text"]', '123456')
    await page.click('.agreement-label checkbox')
    await page.click('.login-btn')
    await page.waitForURL('**/pages/home/home')
    await page.click('text=人员管理')
    await page.waitForURL('**/pages/worker/worker')
    await expect(page.locator('.uni-collapse')).toBeVisible()
  })

  test('非管理员不应该看到添加按钮', async ({ page }) => {
    await page.goto('/pages/login/login')
    await page.fill('input[type="number"]', '18800000001') // 装发车角色
    await page.waitForTimeout(500)
    await page.fill('input[type="text"]', '123456')
    await page.click('.agreement-label checkbox')
    await page.click('.login-btn')
    await page.waitForURL('**/pages/home/home')
    await page.click('text=人员管理')
    await page.waitForURL('**/pages/worker/worker')
    await expect(page.locator('.add-btn')).not.toBeVisible()
  })
})
