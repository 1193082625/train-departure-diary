/**
 * 账目
 */
export interface Transaction {  
	id: string  
	type: 'payment_to_merchant' | 'payment_to_worker' // 向鸡场结账 | 向员工结账
	targetId: string // 鸡场ID或员工ID  
	targetName: string // 鸡场名或员工名  
	amount: number // 金额  
	date: string // 日期  
	note: string  
	createdAt: string  
}