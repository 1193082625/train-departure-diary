/**
 * 日报价相关 API
 */

import { apiOps } from './apiOps.js'
import { request } from './request.js'

export const dailyQuoteApi = {
  // 获取指定日期的报价
  getByDate: (date) => apiOps.queryBy('daily_quotes', 'date', date),
  // 获取日期范围内的报价
  getByDateRange: (startDate, endDate, options = {}) => {
    let url = `/daily_quotes/list?startDate=${startDate}&endDate=${endDate}`
    if (options.groupBy) {
      url += `&groupBy=${options.groupBy}`
    }
    return request(url)
  },
  // 创建报价
  create: (data) => apiOps.insert('daily_quotes', data),
  // 更新报价
  update: (id, data) => apiOps.update('daily_quotes', id, data),
  // 删除报价
  delete: (id) => apiOps.delete('daily_quotes', id)
}

export default dailyQuoteApi
