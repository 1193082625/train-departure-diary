import { reactive } from 'vue'

// 事件类型常量
export const EVENT_TYPES = {
  DEPARTURE_REFRESH: 'departure:refresh',
  MERCHANT_REFRESH: 'merchant:refresh',
  WORKER_REFRESH: 'worker:refresh',
  TRANSACTION_REFRESH: 'transaction:refresh',
  DAILY_QUOTE_REFRESH: 'dailyQuote:refresh',
}

// 事件总线
const eventBus = reactive({
  listeners: {}
})

// 订阅事件
export const subscribe = (eventType, callback) => {
  if (!eventBus.listeners[eventType]) {
    eventBus.listeners[eventType] = []
  }
  eventBus.listeners[eventType].push(callback)
  return () => {
    const index = eventBus.listeners[eventType].indexOf(callback)
    if (index > -1) eventBus.listeners[eventType].splice(index, 1)
  }
}

// 发布事件
export const publish = (eventType, data) => {
  if (eventBus.listeners[eventType]) {
    eventBus.listeners[eventType].forEach(callback => {
      try { callback(data) } catch (e) { console.error(e) }
    })
  }
}

export default {
  EVENT_TYPES,
  subscribe,
  publish
}
