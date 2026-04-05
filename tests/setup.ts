import { vi } from 'vitest'

// Mock uni global object
global.uni = {
  getStorageSync: vi.fn((key) => {
    const storage: Record<string, any> = {}
    return storage[key] || null
  }),
  setStorageSync: vi.fn((key, value) => {
    // Mock implementation
  }),
  removeStorageSync: vi.fn((key) => {
    // Mock implementation
  }),
  showToast: vi.fn(),
  getProvider: vi.fn(),
  request: vi.fn()
}

// Mock eventBus
vi.mock('@/utils/eventBus', () => ({
  publish: vi.fn(),
  subscribe: vi.fn(),
  unsubscribe: vi.fn()
}))

// Mock errorHandler
vi.mock('@/utils/errorHandler', () => ({
  showErrorToast: vi.fn()
}))

// Mock api module
vi.mock('@/utils/api', () => ({
  apiOps: {
    queryAll: vi.fn(),
    queryBy: vi.fn(),
    getById: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    delete: vi.fn()
  },
  userApi: {
    getUserByPhone: vi.fn(),
    getUserById: vi.fn(),
    createUser: vi.fn(),
    updateUser: vi.fn(),
    deleteUser: vi.fn(),
    getAllUsers: vi.fn()
  },
  inviteApi: {
    getByCode: vi.fn(),
    create: vi.fn(),
    useCode: vi.fn(),
    getByCreator: vi.fn()
  },
  setApiBaseUrl: vi.fn()
}))
