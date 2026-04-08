import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { apiOps } from '@/utils/api'
import { useUserStore } from './user'
import { ROLES } from '@/enums/roles'
import { showErrorToast } from '@/utils/errorHandler'
import { publish } from '@/utils/eventBus'
import { generateUUID } from '@/utils/uuid'

export const useWorkerStore = defineStore('worker', () => {
  const workers = ref([])

  // 分页状态
  const pagination = ref({
    page: 1,
    pageSize: 20,
    total: 0,
    totalPages: 0,
    hasMore: true
  })
  const loading = ref(false)
  const refreshing = ref(false)

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

  // 加载员工列表（始终替换数据，用于列表页）
  const loadWorkers = async () => {
    if (loading.value) return
    loading.value = true

    try {
      const userStore = useUserStore()
      const user = userStore.currentUser

      // 构建查询参数
      const params = {
        page: 1,
        pageSize: pagination.value.pageSize
      }

      // 根据角色设置 userId 过滤
      if (user.role === ROLES.ADMIN) {
        // 管理员：如果选择了中间商，按中间商过滤
        if (userStore.currentMiddlemanId) {
          params.userId = userStore.currentMiddlemanId
        }
        // 不传 userId 则查看全部
      } else if (user.role === ROLES.MIDDLEMAN) {
        // 中间商：查看自己的员工
        params.userId = user.id
      } else if (user.parentId) {
        // 装发车/鸡场：查看所属中间商的员工
        params.userId = user.parentId
      }

      const res = await apiOps.queryAll('workers', params)

      // 始终替换数据
      workers.value = res.data || []

      // 更新分页信息
      if (res.pagination) {
        pagination.value = {
          ...pagination.value,
          ...res.pagination,
          hasMore: 1 < res.pagination.totalPages
        }
      }
    } catch (e) {
      console.error('【Worker】加载员工列表失败:', e)
      showErrorToast('加载员工列表失败')
    } finally {
      loading.value = false
    }
  }

  // 刷新（从第一页开始）
  const refresh = async () => {
    pagination.value.page = 1
    refreshing.value = true
    await loadWorkers()
    refreshing.value = false
  }

  // 加载更多（追加数据）
  const loadMore = async () => {
    if (!pagination.value.hasMore || loading.value) return
    loading.value = true

    try {
      const userStore = useUserStore()
      const user = userStore.currentUser

      const params = {
        page: pagination.value.page + 1,
        pageSize: pagination.value.pageSize
      }

      if (user.role === ROLES.ADMIN) {
        if (userStore.currentMiddlemanId) {
          params.userId = userStore.currentMiddlemanId
        }
      } else if (user.role === ROLES.MIDDLEMAN) {
        params.userId = user.id
      } else if (user.parentId) {
        params.userId = user.parentId
      }

      const res = await apiOps.queryAll('workers', params)
      workers.value = [...workers.value, ...(res.data || [])]

      if (res.pagination) {
        pagination.value = {
          ...pagination.value,
          ...res.pagination,
          hasMore: pagination.value.page < res.pagination.totalPages
        }
      }
    } catch (e) {
      console.error('【Worker】加载更多失败:', e)
      showErrorToast('加载更多失败')
    } finally {
      loading.value = false
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
      showErrorToast('保存员工失败')
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
        id: generateUUID(),
        userId: userStore.currentUser?.id || null,
        createdAt: new Date().toISOString()
      }
      workers.value.push(newWorker)
      await saveWorkers()
      publish('worker:refresh', newWorker)
      return newWorker
    } catch (e) {
      console.error('【Worker】添加员工失败:', e)
      showErrorToast('添加员工失败')
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
      showErrorToast('更新员工失败')
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
      showErrorToast('删除员工失败')
      throw e
    }
  }

  const departureWorkers = computed(() =>
    filteredWorkers.value.filter(w => w.type === 'departure' || w.type === 'both')
  )

  const loadingWorkers = computed(() =>
    filteredWorkers.value.filter(w => w.type === 'loading' || w.type === 'both')
  )

  // 初始化加载
  // loadWorkers() // 移除模块级别自动加载，改由页面按需调用

  return {
    workers,
    filteredWorkers,
    departureWorkers,
    loadingWorkers,
    pagination,
    loading,
    refreshing,
    addWorker,
    updateWorker,
    deleteWorker,
    loadWorkers,
    loadMore,
    refresh
  }
})
