import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export const useWorkerStore = defineStore('worker', () => {
  const workers = ref([])

  const loadWorkers = () => {
    const data = uni.getStorageSync('workers')
    workers.value = data ? JSON.parse(data) : []
  }

  const saveWorkers = () => {
    uni.setStorageSync('workers', JSON.stringify(workers.value))
  }

  const addWorker = (worker) => {
    workers.value.push({
      ...worker,
      id: Date.now().toString(),
      createdAt: new Date().toISOString()
    })
    saveWorkers()
  }

  const updateWorker = (id, updates) => {
    const index = workers.value.findIndex(w => w.id === id)
    if (index !== -1) {
      workers.value[index] = { ...workers.value[index], ...updates }
      saveWorkers()
    }
  }

  const deleteWorker = (id) => {
    workers.value = workers.value.filter(w => w.id !== id)
    saveWorkers()
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
