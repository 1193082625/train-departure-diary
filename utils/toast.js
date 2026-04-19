/**
 * 统一 Toast 提示工具
 */

/**
 * 显示 Toast 提示
 * @param {string} title - 提示内容
 * @param {'success' | 'error' | 'warning' | 'none'} type - 图标类型
 * @param {number} duration - 显示时长(ms)，默认 2000
 */
export const toast = (title, type = 'none', duration = 2000) => {
  uni.showToast({
    title: title || '',
    icon: type,
    duration
  })
}

/**
 * 成功提示
 * @param {string} title - 提示内容
 * @param {number} duration - 显示时长(ms)
 */
toast.success = (title, duration = 2000) => toast(title, 'success', duration)

/**
 * 错误提示
 * @param {string} title - 提示内容
 * @param {number} duration - 显示时长(ms)
 */
toast.error = (title, duration = 2000) => toast(title, 'none', duration)

/**
 * 警告提示
 * @param {string} title - 提示内容
 * @param {number} duration - 显示时长(ms)
 */
toast.warning = (title, duration = 2000) => toast(title, 'none', duration)

/**
 * 显示加载中提示
 * @param {string} title - 提示内容
 */
toast.loading = (title = '处理中...') => {
  uni.showLoading({ title, mask: true })
}

/**
 * 隐藏加载中提示
 */
toast.hideLoading = () => {
  uni.hideLoading()
}

export default toast
