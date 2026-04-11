import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { apiOps } from '@/utils/api'
import { useUserStore } from './user'
import { ROLES } from './user'
import toast from '@/utils/toast'
import { publish } from '@/utils/eventBus'

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
      const res = await apiOps.queryAll('workers')
      workers.value = res.data || []
    } catch (e) {
      console.error('【Worker】加载员工列表失败:', e)
      toast.error('加载员工列表失败')
      workers.value = []
    }
  }

  const saveWorkers = async () => {
    try {
      // 使用 upsert 模式，替代 deleteAll
      for (const worker of workers.value) {
        const existRes = await apiOps.queryBy('workers', 'id', worker.id)
        const existing = existRes.data || []
        if (existing && existing.length > 0) {
          await apiOps.update('workers', worker.id, worker)
        } else {
          await apiOps.insert('workers', worker)
        }
      }
    } catch (e) {
      console.error('【Worker】保存员工失败:', e)
      toast.error('保存员工失败')
      throw e
    }
  }

  const addWorker = async (worker) => {
    try {
      const userStore = useUserStore()

      // 校验手机号是否已被其他中间商的员工使用
      // const currentMiddlemanId = userStore.getMiddlemanId()
      // const existingByPhone = workers.value.filter(w => w.phone === worker.phone)
      // if (existingByPhone.length > 0) {
      //   // 存在，检查是否属于当前中间商
      //   const isOwn = existingByPhone.some(w => w.userId === currentMiddlemanId)
      //   if (isOwn) {
      //     return { success: false, message: '该员工已存在' }
      //   } else {
      //     return { success: false, message: '该手机号已被其他员工使用' }
      //   }
      // }

      const newWorker = {
        ...worker,
        userId: userStore.currentUser?.id || null
      }
      workers.value.push(newWorker)
      await saveWorkers()
      publish('worker:refresh', newWorker)
      return newWorker
    } catch (e) {
      console.error('【Worker】添加员工失败:', e)
      toast.error('添加员工失败')
      throw e
    }
  }

  const updateWorker = async (id, updates) => {
    try {
      const index = workers.value.findIndex(w => w.id === id)
      if (index !== -1) {
        workers.value[index] = { ...workers.value[index], ...updates }
        await saveWorkers()
        publish('worker:refresh', workers.value[index])
      }
    } catch (e) {
      console.error('【Worker】更新员工失败:', e)
      toast.error('更新员工失败')
      throw e
    }
  }

  const deleteWorker = async (id) => {
    const deletedWorker = workers.value.find(w => w.id === id)
    workers.value = workers.value.filter(w => w.id !== id)
    try {
      await apiOps.delete('workers', id)
      publish('worker:refresh', null)
    } catch (e) {
      // 回滚本地状态
      if (deletedWorker) {
        workers.value.push(deletedWorker)
      }
      console.error('【Worker】删除员工失败:', e)
      toast.error('删除员工失败')
      throw e
    }
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
