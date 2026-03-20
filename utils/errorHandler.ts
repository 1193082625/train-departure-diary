// 统一错误提示函数
export const showErrorToast = (message: string) => {
  uni.showToast({
    title: message || '操作失败',
    icon: 'none',
    duration: 2000
  })
}
