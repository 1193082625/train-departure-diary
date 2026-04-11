// Vitest setup file
// Mock uni API for testing

global.uni = {
  request: vi.fn(),
  getStorageSync: vi.fn(() => 'mock-token'),
  setStorageSync: vi.fn(),
  removeStorageSync: vi.fn(),
  showModal: vi.fn(),
  showToast: vi.fn(),
  stopPullDownRefresh: vi.fn(),
  reLaunch: vi.fn(),
  navigateTo: vi.fn(),
  navigateBack: vi.fn(),
}

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  log: vi.fn(),
  debug: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
}
