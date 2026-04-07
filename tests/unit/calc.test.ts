import { describe, it, expect, vi, beforeEach } from 'vitest'
import { calculateMerchantItem, calculateMerchantCost } from '@/utils/calc'


vi.mock('@/store/settings', () => ({
  useSettingsStore: () => ({
    receiptBigBoxWeight: 45,
    deliveryBigBoxWeight: 44,
    smallBoxWeight: 29.5,
    depotCartonBoxesBig: 43,
    depotCartonBoxesSmall: 30
  })
}))

describe('calc.ts 计算逻辑测试', () => {
  describe('calculateMerchantItem', () => {
    it('正常计算鸡场单次收货价', () => {
      const result = calculateMerchantItem({
        formData: {
          dailyQuote: 120,
          smallBoxWeight: 29.5
        },
        merchantDetail: {
          merchantId: 'merchant-1',
          merchantName: '鸡场A',
          bigBoxes: 10,
          smallBoxes: 5,
          weight: 100,
          margin: 1
        }
      })

      // price = (120 - 1) / 45 = 2.6444...
      // receiveBigNumber = 44 * 10 = 440
      // receiveBigMoney = 440 * 2.6444... = 1163.55...
      // receiveSmallNumber = 29.5 * 5 = 147.5
      // receiveSmallMoney = 147.5 * 2.6444... = 390.06...
      // receiveOfWeight = 100
      // receiveOfWeightMoney = 100 * 2.6444... = 264.44...
      // receivePrice = 1163.55 + 390.06 + 264.44 = 1818.05
      expect(result).toBeCloseTo(1818.05, 1)
    })

    it('处理零值情况', () => {
      const result = calculateMerchantItem({
        formData: {
          dailyQuote: 120,
          smallBoxWeight: 29.5
        },
        merchantDetail: {
          merchantId: 'merchant-1',
          merchantName: '鸡场A',
          bigBoxes: 0,
          smallBoxes: 0,
          weight: 0,
          margin: 1
        }
      })

      expect(result).toBe(0)
    })

    it('处理 undefined 值', () => {
      const result = calculateMerchantItem({
        formData: {
          dailyQuote: 120,
          smallBoxWeight: 29.5
        },
        merchantDetail: {
          merchantId: 'merchant-1',
          merchantName: '鸡场A',
          bigBoxes: undefined as any,
          smallBoxes: undefined as any,
          weight: undefined as any,
          margin: 1
        }
      })

      expect(result).toBe(0)
    })

    it('处理负 margin (鸡场返利)', () => {
      const result = calculateMerchantItem({
        formData: {
          dailyQuote: 120,
          smallBoxWeight: 29.5
        },
        merchantDetail: {
          merchantId: 'merchant-1',
          merchantName: '鸡场A',
          bigBoxes: 10,
          smallBoxes: 0,
          weight: 0,
          margin: -1 // 返利情况
        }
      })

      // price = (120 - (-1)) / 45 = 121 / 45 = 2.6888...
      // receiveBigNumber = 44 * 10 = 440
      // receiveBigMoney = 440 * 2.6888... = 1183.11...
      expect(result).toBeCloseTo(1183.11, 1)
    })
  })

  describe('calculateMerchantCost', () => {
    it('计算单商户成本和交货价', () => {
      const result = calculateMerchantCost({
        merchantDetails: [
          {
            merchantId: 'merchant-1',
            merchantName: '鸡场A',
            bigBoxes: 10,
            smallBoxes: 5,
            weight: 100
          }
        ],
        dailyQuote: 120,
        smallWeight: 29.5,
        truckCartonBoxesBig: 2,
        truckCartonBoxesSmall: 3
      })

      expect(result.totalReceivePrice).toBeCloseTo(1818.05, 1)

      // 交货价计算验证
      // deliveryBig = (dailyQuote - 1) * bigBoxes
      // deliverySmall = (dailyQuote - 1) / deliveryBigBoxWeight * smallWeight * smallBoxes
      // deliveryCartonBoxes = (dailyQuote +/- offset) / deliveryBigBoxWeight * truckCartonBoxes * depotCartonBoxes
      expect(result.totalDeliveryPrice).toBeGreaterThan(0)
      expect(result.totalDeliveryPrice).toBeGreaterThan(result.totalReceivePrice)
      expect(result.merchantAmount).toHaveLength(1)
      expect(result.merchantAmount[0].name).toBe('鸡场A')
    })

    it('计算多商户成本和交货价', () => {
      const result = calculateMerchantCost({
        merchantDetails: [
          {
            merchantId: 'merchant-1',
            merchantName: '鸡场A',
            bigBoxes: 10,
            smallBoxes: 5,
            weight: 100
          },
          {
            merchantId: 'merchant-2',
            merchantName: '鸡场B',
            bigBoxes: 8,
            smallBoxes: 3,
            weight: 50
          }
        ],
        dailyQuote: 120,
        smallWeight: 29.5,
        truckCartonBoxesBig: 2,
        truckCartonBoxesSmall: 3
      })

      // 应该有两个商户的金额明细
      expect(result.merchantAmount).toHaveLength(2)

      // 总收货价应该是两个商户之和
      expect(result.totalReceivePrice).toBeGreaterThan(0)
      expect(result.totalDeliveryPrice).toBeGreaterThan(0)
    })

    it('空商户列表返回零值', () => {
      const result = calculateMerchantCost({
        merchantDetails: [],
        dailyQuote: 120,
        smallWeight: 29.5,
        truckCartonBoxesBig: 0,
        truckCartonBoxesSmall: 0
      })

      expect(result.totalReceivePrice).toBe(0)
      expect(result.totalDeliveryPrice).toBe(0)
      expect(result.merchantAmount).toHaveLength(0)
    })

    it('日报价为零时返回零值', () => {
      const result = calculateMerchantCost({
        merchantDetails: [
          {
            merchantId: 'merchant-1',
            merchantName: '鸡场A',
            bigBoxes: 10,
            smallBoxes: 5,
            weight: 100
          }
        ],
        dailyQuote: 0,
        smallWeight: 29.5,
        truckCartonBoxesBig: 2,
        truckCartonBoxesSmall: 3
      })

      expect(result.totalReceivePrice).toBe(0)
      expect(result.totalDeliveryPrice).toBe(0)
    })
  })
})
