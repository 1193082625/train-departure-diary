/**
 * 工作人员
 */
export interface Worker {
    id: string
    name: string
    phone: string
    type: 'departure' | 'loading' | 'both' // 发车人员 | 装车人员 | 两者皆可
    note?: string
    userId: string
    createdAt: string
}