import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { dbOps } from '@/utils/db'

export const useWorkerStore = defineStore('worker', () => {
  const workers = ref([])

  const loadWorkers = async () => {
    try {
      const results = await dbOps.queryAll('workers')
      if (results && results.length > 0) {
        workers.value = results
      } else {
        // 兼容：从 localStorage 读取
        const data = uni.getStorageSync('workers')
        workers.value = data ? JSON.parse(data) : []
      }
    } catch (e) {
      // 兼容：localStorage 读取
      const data = uni.getStorageSync('workers')
      workers.value = data ? JSON.parse(data) : []
    }
  }

  const saveWorkers = async () => {
    try {
      // 删除旧数据，重新插入（简化处理）
      // 实际生产中应该使用更高效的更新方式
      await dbOps.dbOps?.executeSql?.({ sql: 'DELETE FROM workers' })
      for (const worker of workers.value) {
        await dbOps.insert('workers', worker)
      }
    } catch (e) {
      // 兼容：保存到 localStorage
      uni.setStorageSync('workers', JSON.stringify(workers.value))
    }
  }

  const addWorker = async (worker) => {
    const newWorker = {
      ...worker,
      id: Date.now().toString(),
      createdAt: new Date().toISOString()
    }
    workers.value.push(newWorker)
    await saveWorkers()
    return newWorker
  }

  const updateWorker = async (id, updates) => {
    const index = workers.value.findIndex(w => w.id === id)
    if (index !== -1) {
      workers.value[index] = { ...workers.value[index], ...updates }
      await saveWorkers()
    }
  }

  const deleteWorker = async (id) => {
    workers.value = workers.value.filter(w => w.id !== id)
    await saveWorkers()
  }

  const getWorkerById = (id) => workers.value.find(w => w.id === id)

  const departureWorkers = computed(() =>
    workers.value.filter(w => w.type === 'departure' || w.type === 'both')
  )

  const loadingWorkers = computed(() =>
    workers.value.filter(w => w.type === 'loading' || w.type === 'both')
  )

  // 初始化加载
  loadWorkers()

  return {
    workers,
    departureWorkers,
    loadingWorkers,
    addWorker,
    updateWorker,
    deleteWorker,
    getWorkerById,
    loadWorkers
  }
})
