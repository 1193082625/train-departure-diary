import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { dbOps, isDBAvailable } from '@/utils/db'
import { useUserStore } from './user'
import { ROLES } from './user'

export const useWorkerStore = defineStore('worker', () => {
  const workers = ref([])

  // 根据用户角色过滤员工
  const filteredWorkers = computed(() => {
    const userStore = useUserStore()
    const user = userStore.currentUser

    if (!user) return []

    // 管理员：返回全部
    if (user.role === ROLES.ADMIN) {
      return workers.value
    }

    // 中间商：返回自己创建的
    if (user.role === ROLES.MIDDLEMAN) {
      return workers.value.filter(w => w.userId === user.id)
    }

    // 装发车：返回中间商的员工
    if (user.parentId) {
      return workers.value.filter(w => w.userId === user.parentId)
    }

    return []
  })

  const loadWorkers = async () => {
    try {
      const results = await dbOps.queryAll('workers')
      workers.value = results || []
    } catch (e) {
      console.error('加载员工列表失败:', e)
      workers.value = []
    }
  }

  const saveWorkers = async () => {
    // 检查数据库是否可用
    if (!isDBAvailable()) {
      uni.showToast({
        title: '数据库不可用，请检查网络连接',
        icon: 'none',
        duration: 3000
      })
      throw new Error('数据库不可用')
    }

    // 先删除所有旧数据
    await dbOps.deleteAll('workers')
    for (const worker of workers.value) {
      await dbOps.insert('workers', worker)
    }
  }

  const addWorker = async (worker) => {
    const userStore = useUserStore()
    const newWorker = {
      ...worker,
      id: Date.now().toString(),
      userId: userStore.currentUser?.id || null,
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
    filteredWorkers.value.filter(w => w.type === 'departure' || w.type === 'both')
  )

  const loadingWorkers = computed(() =>
    filteredWorkers.value.filter(w => w.type === 'loading' || w.type === 'both')
  )

  // 初始化加载
  loadWorkers()

  return {
    workers,
    filteredWorkers,
    departureWorkers,
    loadingWorkers,
    addWorker,
    updateWorker,
    deleteWorker,
    getWorkerById,
    loadWorkers
  }
})
