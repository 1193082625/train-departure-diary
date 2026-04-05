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
	name: string
	amount: number
	receivePrice: number
	deliveryPrice: number
}

export interface DepartureRecord {
	id: string
	date: string // 日期 YYYY-MM-DD
	dailyQuote: number // 当日报价（元/斤）

	// 所属用户
	userId: string

	// 鸡场信息（一个记录可包含多个鸡场）
	merchantDetails: MerchantDetail[]

	// 留货数量
	reservedBigBoxes: number // 留货大框数
	reservedSmallBoxes: number // 留货小框数
	reservedBigBoxesTotal: number // 留货大框合计
	reservedSmallBoxesTotal: number // 留货小框合计
	reservedTotal: number // 留货合计

	// 人员
	departureWorkerId: string // 发车人员ID
	loadingWorkerIds: string[] // 装车人员ID数组

	// 费用
	oilFee: number // 油费（元）
	fuelCost: number // 加油费（元）
	tollFee: number // 过路费（元）
	loadingFee: number // 装车费（元）
	unloadingFee: number // 卸车费（元）
	departureFee: number // 发车费（元）
	entryFee: number // 进门费（元）

	// 货车信息
	truckRows: TruckRow[] // 货车每排信息
	truckBig: number // 车辆大箱
	truckSmall: number // 车辆小箱
	truckWeightTotal: number // 车辆重量合计
	truckCartonBoxesBig: number // 车辆纸箱大箱
	truckCartonBoxesSmall: number // 车辆纸箱小箱

	// 到达
	arrivalBigBoxes: number // 到达大箱
	arrivalSmallBoxes: number // 到达小箱

	// 回框
	returnedBigBoxes: number // 返回大箱
	returnedSmallBoxes: number // 返回小箱

	// 库房
	depotBigBoxes: number // 库存大箱
	depotSmallBoxes: number // 库存小箱
	depotCartonBoxesBig: number // 库存纸箱大箱
	depotCartonBoxesSmall: number // 库存纸箱小箱

	// 斤数
	smallBoxWeight: number // 小箱重量
	totalBigBoxes: number // 大箱合计
	totalSmallBoxes: number // 小箱合计

	// 商户统计
	merchantBigTotal: number // 商户大箱合计
	merchantSmallTotal: number // 商户小箱合计
	merchantWeightTotal: number // 商户重量合计
	allMerchantWeight: number // 商户总重量

	// 金额
	totalReceivePrice: number // 收款金额合计
	totalDeliveryPrice: number // 付金额合计
	merchantAmount: MerchantAmount[] // 商户金额
	getMoney: number // 收款金额
	profit: number // 利润

	// 其他
	note: string

	// 自动计算的金额
	totalAmount?: number // 本次总金额
	createdAt: string
}