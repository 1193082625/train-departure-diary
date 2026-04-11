import { createPinia } from 'pinia'

const pinia = createPinia()

export default pinia

export { useDepartureStore } from './departure'
export { useMerchantStore } from './merchant'
export { useSettingsStore } from './settings'
export { useTransactionStore } from './transaction'
export { useUserStore, ROLES, ROLE_NAMES } from './user'
