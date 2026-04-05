// Server test setup
// Mock database pool for isolated testing
const mockPool = {
  query: vi.fn(),
  getConnection: vi.fn()
}

vi.mock('../config/db.js', () => ({
  getPool: () => mockPool
}))

export { mockPool }
