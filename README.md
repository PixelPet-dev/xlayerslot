# BONK Games - X Layer 简化版

## 项目概述

这是 BONK Games 的简化版本，专为 X Layer 主网设计，采用纯智能合约架构。

## 核心特性

- 🎰 **水果机抽奖游戏**
- 💰 **直接代币下注**
- 🏆 **累计奖励系统**
- 🔗 **X Layer 主网集成**
- 📱 **Web3.js 钱包连接**

## 技术栈

- **区块链**: X Layer 主网 (Chain ID: 196)
- **前端**: React + Web3.js
- **智能合约**: Solidity
- **开发框架**: Hardhat

## 游戏规则

1. **下注**: 用户输入代币数量进行下注
2. **抽奖**: 智能合约生成随机结果
3. **奖励**: 中奖后奖励累计到用户账户
4. **领取**: 用户可随时领取累计的奖励

## 项目结构

```
xlayer-simple/
├── contracts/          # 智能合约
│   └── LotteryGame.sol # 主游戏合约
├── frontend/           # 前端应用
├── scripts/            # 部署脚本
└── test/              # 测试文件
```

## 快速开始

### 1. 安装依赖
```bash
npm install
```

### 2. 编译合约
```bash
npm run compile
```

### 3. 部署到 X Layer 主网
```bash
npm run deploy:mainnet
```

### 4. 启动前端
```bash
cd frontend
npm install
npm start
```

## 网络配置

- **网络名称**: X Layer Mainnet
- **Chain ID**: 196
- **RPC URL**: https://rpc.xlayer.tech
- **区块浏览器**: https://www.oklink.com/xlayer
- **Gas 代币**: OKB

## 合约功能

### 核心功能
- ✅ 用户注册
- ✅ 代币下注
- ✅ 随机抽奖
- ✅ 奖励累计
- ✅ 奖励领取
- ✅ 快捷下注选项

### 管理功能
- ✅ 游戏配置
- ✅ 赔率设置
- ✅ 暂停/恢复
- ✅ 紧急提取

## 安全特性

- 🔒 可重入攻击保护
- 🔒 权限控制
- 🔒 暂停机制
- 🔒 随机数安全

## 核心特性详解

### 🔄 代币切换功能
- 管理员可随时更换游戏使用的代币合约
- 支持任何标准 ERC20 代币
- 无需重新部署合约

### 🎯 简化的游戏流程
1. 连接钱包 → 注册用户 → 选择下注金额 → 开始抽奖
2. 中奖奖励自动累计到用户账户
3. 用户可随时领取累计奖励

### 💰 灵活的下注系统
- 支持自定义下注金额
- 提供快捷下注选项（可配置）
- 实时验证钱包余额和授权

### 🔒 安全保障
- 智能合约经过全面测试
- 防重入攻击保护
- 暂停机制和紧急提取功能

## 开发计划

- [x] 智能合约开发
- [x] 前端界面开发
- [x] 测试用例编写
- [ ] 本地测试
- [ ] 主网部署
- [ ] 用户测试

## 部署指南

### 1. 环境准备
```bash
# 安装依赖
npm install

# 复制环境变量
cp .env.example .env
# 编辑 .env 文件，填入您的私钥和配置
```

### 2. 编译和测试
```bash
# 编译合约
npm run compile

# 运行测试
npm run test
```

### 3. 部署到 X Layer 主网
```bash
# 部署合约
npm run deploy:mainnet

# 验证合约（可选）
npm run verify:mainnet
```

### 4. 启动前端
```bash
cd frontend
npm install
npm start
```

## 管理员操作

部署完成后，管理员需要进行以下配置：

### 设置代币合约
```javascript
// 更换游戏使用的代币
await lotteryGame.updateTokenContract("0x代币合约地址");
```

### 配置游戏参数
```javascript
// 更新游戏配置
await lotteryGame.updateGameConfig(
  minBet,           // 最小下注金额
  maxBet,           // 最大下注金额
  houseFeePercentage, // 平台费率 (基数10000)
  isActive          // 是否激活游戏
);

// 更新快捷下注选项
await lotteryGame.updateQuickBetOptions([
  ethers.parseEther("1"),
  ethers.parseEther("5"),
  ethers.parseEther("10")
]);
```

### 管理奖励池
```javascript
// 向合约存入代币作为奖励池
await tokenContract.approve(lotteryGameAddress, amount);
await lotteryGame.depositTokens(amount);

// 紧急提取（如需要）
await lotteryGame.emergencyWithdraw(amount);
```
