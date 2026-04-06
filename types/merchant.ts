/**
 * 鸡场
 */
export interface Merchant {
	id: string
	name: string
	contact?: string
	phone: string
	address?: string
	note?: string
	margin: number
	userId: string
	createdAt: string
}