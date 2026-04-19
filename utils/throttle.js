/**
 * 防抖函数 - 延迟执行，delay 内的重复调用重置计时器
 * @param {Function} fn - 要执行的函数
 * @param {number} delay - 延迟时间(ms)，默认 1000
 */
export const debounce = (fn, delay = 1000) => {
  let timer = null
  return function (...args) {
    if (timer) clearTimeout(timer)
    timer = setTimeout(() => {
      fn.apply(this, args)
      timer = null
    }, delay)
  }
}

/**
 * 节流函数 - 限制执行频率，delay 时间内只执行一次
 * @param {Function} fn - 要执行的函数
 * @param {number} delay - 间隔时间(ms)，默认 1000
 */
export const throttle = (fn, delay = 1000) => {
  let lastTime = 0
  return function (...args) {
    const now = Date.now()
    if (now - lastTime >= delay) {
      lastTime = now
      fn.apply(this, args)
    }
  }
}

export default { debounce, throttle }
