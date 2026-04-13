/**
 * 发车记录相关 API
 */

import { apiOps } from './apiOps.js'
import { request } from './request.js'
import { buildQueryString } from './apiOps.js'

// 解析 JSON 字段，兼容字符串和对象
const parseJsonField = (value) => {
  if (!value) return []
  if (typeof value === 'object') return value
  if (typeof value === 'string') {
    try {
      return JSON.parse(value)
    } catch (e) {
      return []
    }
  }
  return []
}

// 发车记录相关 API
export const departureApi = {
  // 获取所有发车记录（带缓存，后端已过滤权限）
  getRecords: (limit = 500) => apiOps.queryAll('departures', limit),

  // 员工统计信息
  getWorkerStats: (workerId, startDate, endDate) => {
    const queryString = buildQueryString({ startDate, endDate })
    return request(`/workers/${workerId}/stats${queryString}`, {
      method: 'GET'
    })
  },

  // 员工日历数据
  getWorkerCalendar: (workerId, startDate, endDate) => {
    const queryString = buildQueryString({ startDate, endDate })
    return request(`/workers/${workerId}/calendar${queryString}`, {
      method: 'GET'
    })
  },

  // 员工列表数据（分页）
  getWorkerList: (workerId, startDate, endDate, page = 1, pageSize = 20) => {
    const queryString = buildQueryString({ startDate, endDate, page, pageSize })
    return request(`/workers/${workerId}/departures${queryString}`, {
      method: 'GET'
    })
  },

  // 商户列表数据（分页）
  getMerchantList: (merchantId, startDate, endDate, page = 1, pageSize = 20) => {
    const queryString = buildQueryString({ startDate, endDate, page, pageSize })
    return request(`/merchants/${merchantId}/departures${queryString}`, {
      method: 'GET'
    })
  },

  // 按日期范围获取（前端过滤）
  getByDateRange: (records, startDate, endDate) => {
    return records.filter(r => r.date >= startDate && r.date <= endDate)
  },

  // 按日期范围获取记录（后端分页过滤）
  getRecordsByDateRange: (startDate, endDate, page = 1, pageSize = 50) => {
    const queryString = buildQueryString({ startDate, endDate, page, pageSize })
    return request(`/departures/list${queryString}`, {
      method: 'GET'
    }).then(res => {
      // 解析 JSON 字段
      const results = res.data || []
      return {
        ...res,
        data: results.map(r => ({
          ...r,
          merchantDetails: parseJsonField(r.merchantDetails),
          loadingWorkerIds: parseJsonField(r.loadingWorkerIds),
          truckRows: parseJsonField(r.truckRows),
          merchantAmount: parseJsonField(r.merchantAmount)
        }))
      }
    })
  },

  // 按日期获取（前端过滤）
  getByDate: (records, date) => {
    return records.filter(r => r.date === date)
  },

  // 获取今日记录
  getTodayRecords: (records) => {
    const today = new Date().toISOString().split('T')[0]
    return records.filter(r => r.date === today)
  },

  // 获取单条记录
  getById: (id) => apiOps.getById('departures', id),

  // 按日期加载记录（支持后端排序）
  loadRecordsByDate: async (date) => {
    const queryString = buildQueryString({ startDate: date, endDate: date, sort: 'date', order: 'desc' })
    const res = await request(`/departures/list${queryString}`, { method: 'GET' })
    const results = res.data || []
    return results.map(r => ({
      ...r,
      merchantDetails: parseJsonField(r.merchantDetails),
      loadingWorkerIds: parseJsonField(r.loadingWorkerIds),
      truckRows: parseJsonField(r.truckRows),
      merchantAmount: parseJsonField(r.merchantAmount)
    }))
  },

  // 加载并解析记录
  loadRecords: async () => {
    const res = await apiOps.queryAll('departures')
    const results = res.data || []
    return results.map(r => ({
      ...r,
      merchantDetails: parseJsonField(r.merchantDetails),
      loadingWorkerIds: parseJsonField(r.loadingWorkerIds),
      truckRows: parseJsonField(r.truckRows),
      merchantAmount: parseJsonField(r.merchantAmount)
    }))
  },

  // 创建记录
  create: (data) => {
    const dbRecord = {
      ...data,
      merchantDetails: JSON.stringify(data.merchantDetails || []),
      loadingWorkerIds: JSON.stringify(data.loadingWorkerIds || []),
      truckRows: JSON.stringify(data.truckRows || []),
      merchantAmount: JSON.stringify(data.merchantAmount || [])
    }
    return apiOps.insert('departures', dbRecord)
  },

  // 更新记录
  update: (id, data) => {
    const dbRecord = {
      ...data,
      merchantDetails: JSON.stringify(data.merchantDetails || []),
      loadingWorkerIds: JSON.stringify(data.loadingWorkerIds || []),
      truckRows: JSON.stringify(data.truckRows || []),
      merchantAmount: JSON.stringify(data.merchantAmount || [])
    }
    return apiOps.update('departures', id, dbRecord)
  },

  // 删除记录
  delete: (id) => apiOps.delete('departures', id)
}

export { parseJsonField }

export default departureApi
