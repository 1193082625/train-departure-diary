/**
 * 定时任务调度器
 * 使用 node-cron 实现全量同步和增量同步的定时任务
 */

import cron from 'node-cron'
import syncService from './syncService.js'
import syncConfig from '../config/sync.json' with { type: 'json' }

let scheduledTasks = []

/**
 * 启动全量同步调度器（每周日凌晨2点）
 */
export const startFullSyncScheduler = () => {
  const cronExpression = syncConfig.sync.cronFull || '0 2 * * 0'

  if (!cron.validate(cronExpression)) {
    console.error(`❌ 无效的全量同步 cron 表达式: ${cronExpression}`)
    return null
  }

  const task = cron.schedule(cronExpression, async () => {
    console.log('⏰ [调度器] 触发全量同步任务')
    try {
      const result = await syncService.fullSync()
      console.log(`✅ [调度器] 全量同步完成: ${result.results}`)
    } catch (err) {
      console.error('❌ [调度器] 全量同步失败:', err)
    }
  }, {
    scheduled: true,
    timezone: 'Asia/Shanghai'
  })

  scheduledTasks.push(task)
  console.log(`📅 全量同步调度器已启动: ${cronExpression} (每周日凌晨2点)`)
  return task
}

/**
 * 启动增量同步调度器（每周一至周六凌晨2点）
 */
export const startIncrementalSyncScheduler = () => {
  const cronExpression = syncConfig.sync.cronIncremental || '0 2 * * 1-6'

  if (!cron.validate(cronExpression)) {
    console.error(`❌ 无效的增量同步 cron 表达式: ${cronExpression}`)
    return null
  }

  const task = cron.schedule(cronExpression, async () => {
    console.log('⏰ [调度器] 触发增量同步任务')
    try {
      const result = await syncService.incrementalSync()
      console.log(`✅ [调度器] 增量同步完成`)
    } catch (err) {
      console.error('❌ [调度器] 增量同步失败:', err)
    }
  }, {
    scheduled: true,
    timezone: 'Asia/Shanghai'
  })

  scheduledTasks.push(task)
  console.log(`📅 增量同步调度器已启动: ${cronExpression} (周一至周六凌晨2点)`)
  return task
}

/**
 * 停止所有调度任务
 */
export const stopAllSchedulers = () => {
  for (const task of scheduledTasks) {
    task.stop()
  }
  scheduledTasks = []
  console.log('🛑 所有调度任务已停止')
}

/**
 * 启动所有调度任务
 */
export const startAllSchedulers = () => {
  stopAllSchedulers()
  startFullSyncScheduler()
  startIncrementalSyncScheduler()
  console.log('🚀 所有同步调度任务已启动')
}

export default {
  startFullSyncScheduler,
  startIncrementalSyncScheduler,
  stopAllSchedulers,
  startAllSchedulers
}
