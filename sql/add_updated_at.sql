-- 为所有业务表添加 updatedAt 字段，用于追踪数据修改时间
-- 执行前请先备份数据

-- 用户表
ALTER TABLE users ADD COLUMN updatedAt VARCHAR(30) DEFAULT NULL COMMENT '更新时间' AFTER createdAt;

-- 鸡场表
ALTER TABLE merchants ADD COLUMN updatedAt VARCHAR(30) DEFAULT NULL COMMENT '更新时间' AFTER createdAt;

-- 员工表
ALTER TABLE workers ADD COLUMN updatedAt VARCHAR(30) DEFAULT NULL COMMENT '更新时间' AFTER createdAt;

-- 发车记录表
ALTER TABLE departures ADD COLUMN updatedAt VARCHAR(30) DEFAULT NULL COMMENT '更新时间' AFTER createdAt;

-- 交易记录表
ALTER TABLE transactions ADD COLUMN updatedAt VARCHAR(30) DEFAULT NULL COMMENT '更新时间' AFTER createdAt;

-- 系统设置表
ALTER TABLE settings ADD COLUMN updatedAt VARCHAR(30) DEFAULT NULL COMMENT '更新时间' AFTER createdAt;

-- 日报价表
ALTER TABLE daily_quotes ADD COLUMN updatedAt VARCHAR(30) DEFAULT NULL COMMENT '更新时间' AFTER createdAt;

-- 邀请码表
ALTER TABLE invitation_codes ADD COLUMN updatedAt VARCHAR(30) DEFAULT NULL COMMENT '更新时间' AFTER createdAt;
