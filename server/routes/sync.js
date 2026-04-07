/**
 * 同步管理 API 路由
 * 提供手动触发同步、查看同步状态等接口
 */

import express from 'express'
import { authMiddleware } from '../middleware/auth.js'
import syncService from '../services/syncService.js'
import { startAllSchedulers, stopAllSchedulers } from '../services/scheduler.js'

const router = express.Router()

// 需要管理员权限的接口
const adminMiddleware = (req, res, next) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ success: false, error: '需要管理员权限' })
  }
  next()
}

/**
 * POST /api/sync/full - 手动触发全量同步
 */
router.post('/full', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const result = await syncService.fullSync()
    res.json({
      success: true,
      message: '全量同步完成',
      data: result
    })
  } catch (err) {
    console.error('全量同步失败:', err)
    res.status(500).json({ success: false, error: err.message })
  }
})

/**
 * POST /api/sync/incremental - 手动触发增量同步
 */
router.post('/incremental', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const result = await syncService.incrementalSync()
    res.json({
      success: true,
      message: '增量同步完成',
      data: result
    })
  } catch (err) {
    console.error('增量同步失败:', err)
    res.status(500).json({ success: false, error: err.message })
  }
})

/**
 * GET /api/sync/status - 获取同步状态
 */
router.get('/status', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const result = syncService.getSyncStatus()
    res.json(result)
  } catch (err) {
    console.error('获取同步状态失败:', err)
    res.status(500).json({ success: false, error: err.message })
  }
})

/**
 * GET /api/sync/files - 获取已备份的文件列表
 */
router.get('/files', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const result = syncService.getBackupFiles()
    res.json(result)
  } catch (err) {
    console.error('获取备份文件列表失败:', err)
    res.status(500).json({ success: false, error: err.message })
  }
})

/**
 * POST /api/sync/cleanup - 清理过期备份
 */
router.post('/cleanup', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const result = syncService.cleanupOldBackups()
    res.json({
      success: true,
      message: '清理完成',
      data: result
    })
  } catch (err) {
    console.error('清理过期备份失败:', err)
    res.status(500).json({ success: false, error: err.message })
  }
})

/**
 * POST /api/sync/scheduler/start - 启动调度器
 */
router.post('/scheduler/start', authMiddleware, adminMiddleware, (req, res) => {
  try {
    startAllSchedulers()
    res.json({ success: true, message: '调度器已启动' })
  } catch (err) {
    console.error('启动调度器失败:', err)
    res.status(500).json({ success: false, error: err.message })
  }
})

/**
 * POST /api/sync/scheduler/stop - 停止调度器
 */
router.post('/scheduler/stop', authMiddleware, adminMiddleware, (req, res) => {
  try {
    stopAllSchedulers()
    res.json({ success: true, message: '调度器已停止' })
  } catch (err) {
    console.error('停止调度器失败:', err)
    res.status(500).json({ success: false, error: err.message })
  }
})

export default router
