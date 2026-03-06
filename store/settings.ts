import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useSettingsStore = defineStore('settings', () => {
  const bigBoxWeight = ref(50)
  const smallBoxWeight = ref(30)

  const loadSettings = () => {
    const data = uni.getStorageSync('settings')
    if (data) {
      const settings = JSON.parse(data)
      bigBoxWeight.value = settings.bigBoxWeight ?? 50
      smallBoxWeight.value = settings.smallBoxWeight ?? 30
    }
  }

  const saveSettings = () => {
    uni.setStorageSync('settings', JSON.stringify({
      bigBoxWeight: bigBoxWeight.value,
      smallBoxWeight: smallBoxWeight.value
    }))
  }

  const setBigBoxWeight = (weight) => {
    bigBoxWeight.value = weight
    saveSettings()
  }

  const setSmallBoxWeight = (weight) => {
    smallBoxWeight.value = weight
    saveSettings()
  }

  // 初始化加载
  loadSettings()

  return {
    bigBoxWeight,
    smallBoxWeight,
    setBigBoxWeight,
    setSmallBoxWeight,
    loadSettings
  }
})
