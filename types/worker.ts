/**
 * 工作人员
 */
export interface Worker {
    name: string
    phone: string
    type: 'departure' | 'loading' | 'both' // 发车人员 | 装车人员 | 两者皆可
    createdAt: string
}