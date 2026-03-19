// 使用正则表达式校验是否为正确的手机号
export const validatePhone = (phone) => {
  return /^1[3-9]\d{9}$/.test(phone)
}