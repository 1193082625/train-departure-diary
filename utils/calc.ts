import { MerchantDetail } from "../types/departureRecord"
import { useMerchantStore } from "../store/merchant"
import { useSettingsStore } from "../store/settings"
import { MerchantAmount } from "../types/departureRecord"

// 鸡场拉货成本
export const calculateMerchantCost = ({
  merchantDetails,
  dailyQuote,
  smallWeight,
  truckCartonBoxesBig, // 货车共装大箱
  truckCartonBoxesSmall, // 货车共装小
}: {
  merchantDetails: MerchantDetail[],
  dailyQuote: number,
  smallWeight: number,
  truckCartonBoxesBig: number,
  truckCartonBoxesSmall: number,
}) => {
    const merchantStore = useMerchantStore()
    const settingsStore = useSettingsStore()
    // 本趟合计收货价
    let totalReceivePrice = 0
    // 本趟合计交货价
    let totalDeliveryPrice = 0
    // 鸡场金额明细
    let merchantAmount: MerchantAmount[] = []
    merchantDetails.forEach(detail => {
        const merchant = merchantStore.getMerchantById(detail.merchantId)
        if (merchant && dailyQuote) {
          // 大框
          const bigBoxes = Number(detail.bigBoxes) || 0
          // 小框
          const smallBoxes = Number(detail.smallBoxes) || 0
          // 斤数
          const weight = Number(detail.weight) || 0

          // 鸡场差额
          const merchantMargin = Number(merchant.margin) || 0
      
          // 收货每斤价格
          const price = (dailyQuote - merchantMargin) / Number(settingsStore.receiptBigBoxWeight)
          // 大框收货 = 大框斤数 × 本次共拉大框数量 
          const receiveBigNumber = Number(settingsStore.deliveryBigBoxWeight) * bigBoxes
          const receiveBigMoney = receiveBigNumber * price
          
          // 小框收货 = 小框斤数 × 本次共拉小框数量 
          const receiveSmallNumber = Number(smallWeight) * smallBoxes
          const receiveSmallMoney = receiveSmallNumber * price
          // 斤数收货
          const receiveOfWeight = Number(Number(weight).toFixed(2))
          const receiveOfWeightMoney = receiveOfWeight * price
          // 本趟合计收货价
          const receivePrice = Number((receiveBigMoney + receiveSmallMoney + receiveOfWeightMoney).toFixed(2))
          totalReceivePrice += Number(receivePrice) 
          // 交货价 = (当日报价 - 1) × 本次共拉大框数量 + (当日报价 - 鸡场margin) / 交货大框斤数 × 小框斤数 × 本次共拉小框数量
          // 大框交货
          const deliveryBig = Number((dailyQuote - 1) * bigBoxes)
          // 小框交货
          const deliverySmall = Number((dailyQuote - 1) / Number(settingsStore.deliveryBigBoxWeight) * Number(smallWeight) * smallBoxes)
          // 大箱交货
          const deliveryCartonBoxesBig = Number((dailyQuote + 8) / Number(settingsStore.deliveryBigBoxWeight) * truckCartonBoxesBig *  settingsStore.depotCartonBoxesBig)
          // 小箱交货
          const deliveryCartonBoxesSmall = Number((dailyQuote + 5) / Number(settingsStore.deliveryBigBoxWeight) * truckCartonBoxesSmall *  settingsStore.depotCartonBoxesSmall)
          // 本趟合计交货价
          const deliveryPrice = Number(Number((deliveryBig + deliverySmall + deliveryCartonBoxesBig + deliveryCartonBoxesSmall).toFixed(2)))
          totalDeliveryPrice += deliveryPrice
      
          merchantAmount.push({
              name: merchant.name,
              amount: receivePrice,
              receivePrice: receivePrice,
              deliveryPrice: deliveryPrice
          })
        }
    })
    return {
      totalReceivePrice: Number(totalReceivePrice.toFixed(2)),
      totalDeliveryPrice: Number(totalDeliveryPrice.toFixed(2)),
      merchantAmount: merchantAmount
    }
}