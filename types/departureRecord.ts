/**
 * 发车记录
 */

export interface MerchantDetail {  
	merchantId: string  
	merchantName: string  
	bigBoxes: number // 大框数  
	smallBoxes: number // 小框数  
	weight: number // 斤数
}
	   
export interface TruckRow {  
	rowNumber: number // 排号 1,2,3...  
	bigBoxes: number // 本排大框数  
	smallBoxes: number // 本排小框数  
	cartonBoxes: number // 本排纸箱数  
}

export interface MerchantAmount {
	merchantId: string
	name: string
	amount: number
	receivePrice: number
	deliveryPrice: number
}

export interface DepartureRecord {
	id: string  
	date: string // 日期 YYYY-MM-DD
	dailyQuote: number // 当日报价（元/斤）
   
	// 鸡场信息（一个记录可包含多个鸡场）
	merchantDetails: MerchantDetail[]
   
	// 留货数量  
	reservedBigBoxes: number // 留货大框数
	reservedSmallBoxes: number // 留货小框数
   
	// 人员  
	departureWorkerId: string // 发车人员ID
	loadingWorkerIds: string[] // 装车人员ID数组
   
	// 费用  
	fuelCost: number // 加油费（元）  
	entryFee: number // 进门费（元）
   
	// 货车信息  
	truckRows: TruckRow[] // 货车每排信息
   
	// 到达  
	arrivalBigBoxes: number // 到货大框数
	arrivalSmallBoxes: number // 到货小框数
	returnedBigBoxes: number // 回框大框数
	returnedSmallBoxes: number // 回框小框数
   
	// 其他  
	note: string
   
	// 自动计算的金额  
	totalAmount?: number // 本次总金额  
	createdAt: string  
}