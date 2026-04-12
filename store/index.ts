import { createPinia } from 'pinia'

const pinia = createPinia()

export default pinia

export { useDepartureStore } from './departure'
export { useSettingsStore } from './settings'
export { useUserStore, ROLES, ROLE_NAMES } from './user'
