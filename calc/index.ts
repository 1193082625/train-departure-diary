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
            // 鸡场差额
            const merchantMargin = merchant.margin || 0
        
            // 收货价 = (当日报价 - 鸡场margin) / 45 × (大框斤数 × 本次共拉大框数量 + 小框斤数 × 本次共拉小框数量 + 斤数）
            // 收货每斤价格
            const price = (dailyQuote - merchantMargin) / settingsStore.receiptBigBoxWeight
            // 大框收货
            const receiveBigNumber = settingsStore.deliveryBigBoxWeight * detail.bigBoxes
            // 小框收货
            const receiveSmallNumber = smallWeight * detail.smallBoxes
            // 斤数收货
            const receiveOfWeight = detail.weight
            // 本趟合计收货价
            const receivePrice = ((receiveBigNumber + receiveSmallNumber + receiveOfWeight)*price).toFixed(2)
            totalReceivePrice += Number(receivePrice)

            // 交货价 = (当日报价 - 1) × 本次共拉大框数量 + (当日报价 - 鸡场margin) / 交货大框斤数 × 小框斤数 × 本次共拉小框数量
            // 大框交货
            const deliveryBig = (dailyQuote - 1) * detail.bigBoxes
            // 小框交货
            const deliverySmall = (dailyQuote - 1) / settingsStore.deliveryBigBoxWeight * smallWeight * detail.smallBoxes
            // 大箱交货
            const deliveryCartonBoxesBig = (dailyQuote + 8) / settingsStore.deliveryBigBoxWeight * truckCartonBoxesBig *  settingsStore.depotCartonBoxesBig
            // 小箱交货
            const deliveryCartonBoxesSmall = (dailyQuote + 5) / settingsStore.deliveryBigBoxWeight * truckCartonBoxesSmall *  settingsStore.depotCartonBoxesSmall
            // 本趟合计交货价
            const deliveryPrice = Number((deliveryBig + deliverySmall + deliveryCartonBoxesBig + deliveryCartonBoxesSmall).toFixed(2))
            totalDeliveryPrice += deliveryPrice
        
            merchantAmount.push({
                name: merchant.name,
                amount: Number(receivePrice),
                receivePrice: Number(receivePrice),
                deliveryPrice: Number(deliveryPrice.toFixed(2))
            })
        }
    })
    return { totalReceivePrice, totalDeliveryPrice, merchantAmount }
}