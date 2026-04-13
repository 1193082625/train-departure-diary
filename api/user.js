/**
 * 用户相关 API
 */

import { apiOps } from './apiOps.js'
import { request } from './request.js'

export const userApi = {
  getUserByPhone: (phone) => apiOps.queryBy('users', 'phone', phone),
  getUserById: (id) => apiOps.getById('users', id),
  getUserByInviteCode: (inviteCode) => apiOps.queryBy('users', 'inviteCode', inviteCode),
  createUser: (data) => apiOps.insert('users', data),
  updateUser: (id, data) => apiOps.update('users', id, data),
  deleteUser: (id) => apiOps.delete('users', id),
  getAllUsers: () => apiOps.queryAll('users'),
  // 密码登录（后端验证密码）
  login: (phone, password) => {
    return request('/users/login', {
      method: 'POST',
      data: JSON.stringify({ phone, password })
    })
  },
  // 事务性注册/登录（邀请码）
  register: (phone, inviteCode) => {
    return request('/users/register', {
      method: 'POST',
      data: JSON.stringify({ phone, inviteCode })
    })
  }
}

export default userApi
