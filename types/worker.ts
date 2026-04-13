/**
 * 工作人员
 */
export interface Worker {
    name: string
    phone: string
    type: 'departure' | 'loading' | 'both' // 发车人员 | 装车人员 | 两者皆可
    createdAt: string
}

export interface WorkerStats{
    workerId: string,
    departureFeeSum: number,
    loadingFeeSum: number,
    totalEarned: number,
    settledAmount: number, // 已结金额
    unpaidAmount: number,
    workDays: number,
    departureCount: number,
    loadingCount: number
}