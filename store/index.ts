import { createPinia } from 'pinia'

const pinia = createPinia()

export default pinia

export { useSettingsStore } from './settings'
export { useUserStore, ROLES, ROLE_NAMES } from './user'
