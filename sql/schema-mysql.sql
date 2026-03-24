-- =============================================
-- train-departure-diary 数据库 Schema
-- 从 uniCloud 迁移到自建 MySQL
-- =============================================

-- 创建数据库 (如果不存在)
CREATE DATABASE IF NOT EXISTS `train_departure_diary`
  DEFAULT CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE `train_departure_diary`;

-- =============================================
-- 1. 用户表 (users)
-- =============================================
CREATE TABLE IF NOT EXISTS `users` (
  `id` VARCHAR(50) PRIMARY KEY COMMENT '用户ID (UUID)',
  `phone` VARCHAR(20) NOT NULL UNIQUE COMMENT '手机号',
  `nickname` VARCHAR(50) DEFAULT '' COMMENT '昵称',
  `password` VARCHAR(100) DEFAULT NULL COMMENT '密码',
  `role` VARCHAR(20) DEFAULT 'middleman' COMMENT '角色 (admin/middleman/loader/farm)',
  `inviteCode` VARCHAR(20) DEFAULT NULL COMMENT '用户的邀请码',
  `invitedBy` VARCHAR(50) DEFAULT NULL COMMENT '使用的邀请码',
  `parentId` VARCHAR(50) DEFAULT NULL COMMENT '上级用户ID (中间商ID)',
  `workerId` VARCHAR(50) DEFAULT NULL COMMENT '关联的员工ID',
  `workerType` VARCHAR(20) DEFAULT NULL COMMENT '员工类型 (departure/loading/both)',
  `createdAt` VARCHAR(30) DEFAULT NULL COMMENT '创建时间',
  INDEX `idx_phone` (`phone`),
  INDEX `idx_role` (`role`),
  INDEX `idx_parentId` (`parentId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户表';

-- =============================================
-- 2. 鸡场/商户表 (merchants)
-- =============================================
CREATE TABLE IF NOT EXISTS `merchants` (
  `id` VARCHAR(50) PRIMARY KEY COMMENT 'ID',
  `name` VARCHAR(100) NOT NULL COMMENT '名称',
  `margin` DECIMAL(10,2) DEFAULT 0 COMMENT '利润/Margin',
  `contact` VARCHAR(50) DEFAULT '' COMMENT '联系人',
  `phone` VARCHAR(20) DEFAULT '' COMMENT '电话',
  `address` VARCHAR(200) DEFAULT '' COMMENT '地址',
  `note` TEXT DEFAULT NULL COMMENT '备注',
  `userId` VARCHAR(50) NOT NULL COMMENT '所属用户ID (中间商ID)',
  `createdAt` VARCHAR(30) DEFAULT NULL COMMENT '创建时间',
  INDEX `idx_userId` (`userId`),
  INDEX `idx_name` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='鸡场/商户表';

-- =============================================
-- 3. 员工表 (workers)
-- =============================================
CREATE TABLE IF NOT EXISTS `workers` (
  `id` VARCHAR(50) PRIMARY KEY COMMENT 'ID',
  `name` VARCHAR(50) NOT NULL COMMENT '姓名',
  `type` VARCHAR(20) DEFAULT 'both' COMMENT '类型 (departure/loading/both)',
  `phone` VARCHAR(20) DEFAULT '' COMMENT '电话',
  `note` TEXT DEFAULT NULL COMMENT '备注',
  `userId` VARCHAR(50) NOT NULL COMMENT '所属用户ID (中间商ID)',
  `createdAt` VARCHAR(30) DEFAULT NULL COMMENT '创建时间',
  INDEX `idx_userId` (`userId`),
  INDEX `idx_type` (`type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='员工表';

-- =============================================
-- 4. 发车记录表 (departures)
-- =============================================
CREATE TABLE IF NOT EXISTS `departures` (
  `id` VARCHAR(50) PRIMARY KEY COMMENT 'ID',
  `date` VARCHAR(20) NOT NULL COMMENT '日期',
  `dailyQuote` DECIMAL(10,2) DEFAULT 0 COMMENT '日报价',

  -- 商户明细 (JSON 数组格式)
  `merchantDetails` TEXT DEFAULT NULL COMMENT '商户明细 (JSON)',
  `reservedBigBoxes` INT DEFAULT 0 COMMENT '预留大箱',
  `reservedSmallBoxes` INT DEFAULT 0 COMMENT '预留小箱',
  `reservedBigBoxesTotal` INT DEFAULT 0 COMMENT '预留大箱合计',
  `reservedSmallBoxesTotal` INT DEFAULT 0 COMMENT '预留小箱合计',
  `reservedTotal` DECIMAL(10,2) DEFAULT 0 COMMENT '预留合计',

  `departureWorkerId` VARCHAR(50) DEFAULT NULL COMMENT '发车人员ID',

  -- 装车人员ID列表 (JSON 数组格式)
  `loadingWorkerIds` TEXT DEFAULT NULL COMMENT '装车人员ID列表 (JSON)',

  -- 费用相关
  `fuelCost` DECIMAL(10,2) DEFAULT 0 COMMENT '油费',
  `entryFee` DECIMAL(10,2) DEFAULT 0 COMMENT '入场费',
  `tollFee` DECIMAL(10,2) DEFAULT 0 COMMENT '过路费',
  `loadingFee` DECIMAL(10,2) DEFAULT 0 COMMENT '装车费',
  `unloadingFee` DECIMAL(10,2) DEFAULT 0 COMMENT '卸车费',
  `departureFee` DECIMAL(10,2) DEFAULT 0 COMMENT '发车费',
  `oilFee` DECIMAL(10,2) DEFAULT 0 COMMENT '油费2',

  -- 车行 (JSON 数组格式)
  `truckRows` TEXT DEFAULT NULL COMMENT '车行 (JSON)',

  -- 车辆信息
  `truckBig` INT DEFAULT 0 COMMENT '车辆大箱',
  `truckSmall` INT DEFAULT 0 COMMENT '车辆小箱',
  `truckCartonBoxesBig` INT DEFAULT 0 COMMENT '车辆纸箱大箱',
  `truckCartonBoxesSmall` INT DEFAULT 0 COMMENT '车辆纸箱小箱',
  `truckWeightTotal` DECIMAL(10,2) DEFAULT 0 COMMENT '车辆重量合计',

  -- 到达/返回信息
  `arrivalBigBoxes` INT DEFAULT 0 COMMENT '到达大箱',
  `arrivalSmallBoxes` INT DEFAULT 0 COMMENT '到达小箱',
  `returnedBigBoxes` INT DEFAULT 0 COMMENT '返回大箱',
  `returnedSmallBoxes` INT DEFAULT 0 COMMENT '返回小箱',

  -- 库存信息
  `depotBigBoxes` INT DEFAULT 0 COMMENT '库存大箱',
  `depotSmallBoxes` INT DEFAULT 0 COMMENT '库存小箱',
  `depotCartonBoxesBig` INT DEFAULT 0 COMMENT '库存纸箱大箱',
  `depotCartonBoxesSmall` INT DEFAULT 0 COMMENT '库存纸箱小箱',

  `smallBoxWeight` DECIMAL(10,2) DEFAULT 0 COMMENT '小箱重量',
  `totalBigBoxes` INT DEFAULT 0 COMMENT '大箱合计',
  `totalSmallBoxes` INT DEFAULT 0 COMMENT '小箱合计',
  `merchantBigTotal` INT DEFAULT 0 COMMENT '商户大箱合计',
  `merchantSmallTotal` INT DEFAULT 0 COMMENT '商户小箱合计',
  `merchantWeightTotal` DECIMAL(10,2) DEFAULT 0 COMMENT '商户重量合计',
  `allMerchantWeight` DECIMAL(10,2) DEFAULT 0 COMMENT '商户总重量',
  `totalReceivePrice` DECIMAL(10,2) DEFAULT 0 COMMENT '收款金额合计',
  `totalDeliveryPrice` DECIMAL(10,2) DEFAULT 0 COMMENT '付金额合计',
  `profit` DECIMAL(10,2) DEFAULT 0 COMMENT '利润',

  -- 商户金额明细 (JSON 数组格式)
  `merchantAmount` TEXT DEFAULT NULL COMMENT '商户金额明细 (JSON)',

  `getMoney` DECIMAL(10,2) DEFAULT 0 COMMENT '收款金额',
  `userId` VARCHAR(50) DEFAULT NULL COMMENT '用户ID',
  `note` TEXT DEFAULT NULL COMMENT '备注',
  `createdAt` VARCHAR(30) DEFAULT NULL COMMENT '创建时间',

  INDEX `idx_date` (`date`),
  INDEX `idx_userId` (`userId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='发车记录表';

-- =============================================
-- 5. 邀请码表 (invitation_codes)
-- =============================================
CREATE TABLE IF NOT EXISTS `invitation_codes` (
  `id` VARCHAR(50) PRIMARY KEY COMMENT 'ID',
  `code` VARCHAR(10) NOT NULL COMMENT '邀请码 (6位数字)',
  `type` VARCHAR(20) NOT NULL COMMENT '类型 (middleman/loader/farm)',
  `creatorId` VARCHAR(50) DEFAULT NULL COMMENT '创建者ID',
  `usedBy` VARCHAR(50) DEFAULT NULL COMMENT '使用者ID',
  `usedAt` VARCHAR(30) DEFAULT NULL COMMENT '使用时间',
  `workerId` VARCHAR(50) DEFAULT NULL COMMENT '关联的员工ID',
  `workerPhone` VARCHAR(20) DEFAULT NULL COMMENT '员工手机号',
  `workerName` VARCHAR(50) DEFAULT NULL COMMENT '员工姓名',
  `workerType` VARCHAR(20) DEFAULT NULL COMMENT '员工类型',
  `createdAt` VARCHAR(30) DEFAULT NULL COMMENT '创建时间',
  UNIQUE INDEX `idx_code` (`code`),
  INDEX `idx_creatorId` (`creatorId`),
  INDEX `idx_usedBy` (`usedBy`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='邀请码表';

-- =============================================
-- 6. 交易记录表 (transactions)
-- =============================================
CREATE TABLE IF NOT EXISTS `transactions` (
  `id` VARCHAR(50) PRIMARY KEY COMMENT 'ID',
  `date` VARCHAR(20) NOT NULL COMMENT '日期',
  `targetId` VARCHAR(50) DEFAULT NULL COMMENT '目标ID (商户ID或员工ID)',
  `targetType` VARCHAR(20) DEFAULT NULL COMMENT '目标类型 (merchant/worker)',
  `amount` DECIMAL(10,2) DEFAULT 0 COMMENT '金额',
  `type` VARCHAR(20) DEFAULT NULL COMMENT '类型 (receivable/payable/settlement)',
  `userId` VARCHAR(50) DEFAULT NULL COMMENT '用户ID',
  `note` TEXT DEFAULT NULL COMMENT '备注',
  `createdAt` VARCHAR(30) DEFAULT NULL COMMENT '创建时间',
  INDEX `idx_date` (`date`),
  INDEX `idx_userId` (`userId`),
  INDEX `idx_targetId` (`targetId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='交易记录表';

-- =============================================
-- 7. 系统设置表 (settings)
-- =============================================
CREATE TABLE IF NOT EXISTS `settings` (
  `id` VARCHAR(50) PRIMARY KEY COMMENT 'ID',
  `userId` VARCHAR(50) NOT NULL COMMENT '所属用户ID (中间商ID)',
  `receiptBigBoxWeight` DECIMAL(10,2) DEFAULT 45 COMMENT '收货大框斤数',
  `deliveryBigBoxWeight` DECIMAL(10,2) DEFAULT 44 COMMENT '发货大框斤数',
  `smallBoxWeight` DECIMAL(10,2) DEFAULT 29.5 COMMENT '小箱重量',
  `loadingFee` DECIMAL(10,2) DEFAULT 0 COMMENT '装车费',
  `depotCartonBoxesBig` DECIMAL(10,2) DEFAULT 43 COMMENT '大箱斤数',
  `depotCartonBoxesSmall` DECIMAL(10,2) DEFAULT 30 COMMENT '小箱斤数',
  `unloadingFee` DECIMAL(10,2) DEFAULT 0 COMMENT '卸车费',
  `departureFee` DECIMAL(10,2) DEFAULT 0 COMMENT '发车费',
  `tollFee` DECIMAL(10,2) DEFAULT 0 COMMENT '过路费',
  `entryFee` DECIMAL(10,2) DEFAULT 0 COMMENT '入场费',
  `oilFee` DECIMAL(10,2) DEFAULT 0 COMMENT '油费',
  UNIQUE INDEX `idx_userId` (`userId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='系统设置表';

-- =============================================
-- 8. 日报价表 (daily_quotes)
-- =============================================
CREATE TABLE IF NOT EXISTS `daily_quotes` (
  `id` VARCHAR(50) PRIMARY KEY COMMENT 'ID',
  `date` VARCHAR(20) NOT NULL COMMENT '日期 (YYYY-MM-DD)',
  `quote` DECIMAL(10,2) DEFAULT 0 COMMENT '日报价',
  `userId` VARCHAR(50) NOT NULL COMMENT '所属用户ID (中间商ID)',
  `createdAt` VARCHAR(30) DEFAULT NULL COMMENT '创建时间',
  UNIQUE INDEX `idx_date_userId` (`date`, `userId`),
  INDEX `idx_userId` (`userId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='日报价表';

-- =============================================
-- 完成
-- =============================================
