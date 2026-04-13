/**
 * 邀请码相关 API
 */

import { apiOps } from './apiOps.js'
import { request } from './request.js'

export const inviteApi = {
  getByCode: (code) => request('/invitation_codes/by/code/' + code),
  create: (data) => apiOps.insert('invitation_codes', data),
  useCode: (code, userId) => {
    return request(`/invitation_codes/by/code/${code}`, {
      method: 'PUT',
      data: JSON.stringify({ usedBy: userId, usedAt: new Date().toISOString() })
    })
  },
  getByCreator: (creatorId) => {
    return apiOps.queryBy('invitation_codes', 'creatorId', creatorId)
  },
  getAll: () => apiOps.queryAll('invitation_codes')
}

export default inviteApi
