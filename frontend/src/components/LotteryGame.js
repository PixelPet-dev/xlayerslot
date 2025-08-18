import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import Web3Config from '../config/web3';
import LotteryResultModal from './LotteryResultModal';

const LotteryGame = ({ account, onGameComplete }) => {
  const { t } = useTranslation();
  const [gameConfig, setGameConfig] = useState(null);
  const [quickBetOptions, setQuickBetOptions] = useState([]);
  const [payoutRates, setPayoutRates] = useState([]);
  const [currentToken, setCurrentToken] = useState(null);
  const [tokenInfo, setTokenInfo] = useState(null);
  const [userBalance, setUserBalance] = useState('0');
  const [userAllowance, setUserAllowance] = useState('0');
  
  const [betAmount, setBetAmount] = useState('');
  const [isPlaying, setIsPlaying] = useState(false);
  const [isApproving, setIsApproving] = useState(false);
  const [gameResult, setGameResult] = useState(null);
  const [error, setError] = useState(null);
  const [simulationResult, setSimulationResult] = useState(null);
  const [gameHistory, setGameHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [showResultModal, setShowResultModal] = useState(false);

  useEffect(() => {
    loadGameData();
    loadGameHistory();
    const interval = setInterval(loadUserBalance, 10000); // 每10秒更新余额
    return () => clearInterval(interval);
  }, [account]);

  // 加载游戏数据
  const loadGameData = async () => {
    try {
      const web3 = Web3Config.getWeb3();
      const contract = new web3.eth.Contract(
        Web3Config.CONTRACT_CONFIG.abi,
        Web3Config.CONTRACT_CONFIG.address
      );

      // 获取游戏配置
      const config = await contract.methods.gameConfig().call();
      setGameConfig(config);

      // 获取快捷下注选项
      const options = await contract.methods.getQuickBetOptions().call();
      setQuickBetOptions(options);

      // 获取赔率
      const rates = await contract.methods.getAllPayoutRates().call();
      setPayoutRates(rates);

      // 获取当前代币合约
      let tokenAddress;
      try {
        tokenAddress = await contract.methods.currentToken().call();
      } catch (error) {
        tokenAddress = process.env.REACT_APP_TOKEN_ADDRESS || '0x181236a3422aB68d70728fF9F35a834E7c6b5551';
      }
      setCurrentToken(tokenAddress);

      // 获取代币信息
      if (tokenAddress && tokenAddress !== '0x0000000000000000000000000000000000000000') {
        await loadTokenInfo(tokenAddress);
        await loadUserBalance(tokenAddress);
      }

      // 生成模拟结果
      const simulation = await contract.methods.simulateLottery(Date.now()).call();
      setSimulationResult(simulation);
    } catch (error) {
      console.error('Load game data failed:', error);
      setError(t('game.loadGameDataFailed'));
    }
  };

  // 加载代币信息
  const loadTokenInfo = async (tokenAddress) => {
    try {
      const web3 = Web3Config.getWeb3();
      const tokenContract = new web3.eth.Contract(Web3Config.ERC20_ABI, tokenAddress);

      const [name, symbol, decimals] = await Promise.all([
        tokenContract.methods.name().call(),
        tokenContract.methods.symbol().call(),
        tokenContract.methods.decimals().call()
      ]);

      setTokenInfo({ name, symbol, decimals, address: tokenAddress });
    } catch (error) {
      console.error('Load token info failed:', error);
    }
  };

  // 加载用户余额和授权
  const loadUserBalance = async (tokenAddress = currentToken) => {
    if (!tokenAddress || tokenAddress === '0x0000000000000000000000000000000000000000') return;

    try {
      const web3 = Web3Config.getWeb3();
      const tokenContract = new web3.eth.Contract(Web3Config.ERC20_ABI, tokenAddress);

      const [balance, allowance] = await Promise.all([
        tokenContract.methods.balanceOf(account).call(),
        tokenContract.methods.allowance(account, Web3Config.CONTRACT_CONFIG.address).call()
      ]);

      setUserBalance(balance);
      setUserAllowance(allowance);
    } catch (error) {
      console.error('加载用户余额失败:', error);
    }
  };

  // 加载游戏记录
  const loadGameHistory = async () => {
    if (!account) return;

    setHistoryLoading(true);
    try {
      const web3 = Web3Config.getWeb3();
      const contract = new web3.eth.Contract(
        Web3Config.CONTRACT_CONFIG.abi,
        Web3Config.CONTRACT_CONFIG.address
      );

      // 获取用户游戏记录
      const userGameHistory = await contract.methods.getUserGameHistory(account).call();

      // 获取详细的游戏记录
      const detailedHistory = await Promise.all(
        userGameHistory.slice(-10).map(async (gameId) => { // 只取最近10条
          const record = await contract.methods.gameRecords(gameId).call();
          return {
            ...record,
            gameId: gameId
          };
        })
      );

      setGameHistory(detailedHistory.reverse()); // 最新的在前面
    } catch (error) {
      console.error('加载游戏记录失败:', error);
    } finally {
      setHistoryLoading(false);
    }
  };

  // 授权代币
  const handleApprove = async () => {
    if (!currentToken || !betAmount) {
      setError('请等待游戏数据加载完成或输入下注金额');
      return;
    }

    setIsApproving(true);
    setError(null);

    try {
      const web3 = Web3Config.getWeb3();
      const tokenContract = new web3.eth.Contract(Web3Config.ERC20_ABI, currentToken);
      const amount = Web3Config.parseTokenAmount(betAmount);

      const gasEstimate = await tokenContract.methods
        .approve(Web3Config.CONTRACT_CONFIG.address, amount)
        .estimateGas({ from: account });

      // 获取当前 Gas 价格
      const gasPrice = await web3.eth.getGasPrice();

      await tokenContract.methods
        .approve(Web3Config.CONTRACT_CONFIG.address, amount)
        .send({
          from: account,
          gas: Math.floor(Number(gasEstimate) * 1.2),
          gasPrice: gasPrice,
        });

      await loadUserBalance();
    } catch (error) {
      console.error('授权失败:', error);
      setError('授权失败: ' + error.message);
    } finally {
      setIsApproving(false);
    }
  };

  // 开始抽奖
  const handlePlay = async () => {
    if (!betAmount || !gameConfig) return;

    const amount = Web3Config.parseTokenAmount(betAmount);
    
    // 验证下注金额
    if (BigInt(amount) < BigInt(gameConfig.minBet)) {
      setError(`下注金额不能少于 ${Web3Config.formatTokenAmountInteger(gameConfig.minBet)} ${tokenInfo?.symbol || 'tokens'}`);
      return;
    }

    if (BigInt(amount) > BigInt(gameConfig.maxBet)) {
      setError(`下注金额不能超过 ${Web3Config.formatTokenAmountInteger(gameConfig.maxBet)} ${tokenInfo?.symbol || 'tokens'}`);
      return;
    }

    // 验证余额
    if (BigInt(amount) > BigInt(userBalance)) {
      setError('余额不足');
      return;
    }

    // 验证授权
    if (BigInt(amount) > BigInt(userAllowance)) {
      setError('请先授权代币');
      return;
    }

    setIsPlaying(true);
    setError(null);
    setGameResult(null);

    try {
      const web3 = Web3Config.getWeb3();
      const contract = new web3.eth.Contract(
        Web3Config.CONTRACT_CONFIG.abi,
        Web3Config.CONTRACT_CONFIG.address
      );

      const gasEstimate = await contract.methods
        .playLottery(amount)
        .estimateGas({ from: account });

      // 获取当前 Gas 价格
      const gasPrice = await web3.eth.getGasPrice();

      const receipt = await contract.methods
        .playLottery(amount)
        .send({
          from: account,
          gas: Math.floor(Number(gasEstimate) * 1.2),
          gasPrice: gasPrice,
        });

      // 解析游戏结果事件
      const gameEvent = receipt.events.GamePlayed;
      if (gameEvent) {
        const { symbols, betAmount: betAmt, winAmount } = gameEvent.returnValues;
        const result = {
          symbols: symbols.map(s => parseInt(s)),
          betAmount: betAmt,
          winAmount: winAmount,
          isWin: BigInt(winAmount) > BigInt(0)
        };
        setGameResult(result);
        setShowResultModal(true); // 显示结果弹窗
      }

      await loadUserBalance();
      await loadGameHistory(); // 刷新游戏记录
      onGameComplete();
    } catch (error) {
      console.error('抽奖失败:', error);
      setError('抽奖失败: ' + error.message);
    } finally {
      setIsPlaying(false);
    }
  };

  // 快捷下注
  const handleQuickBet = (amount) => {
    setBetAmount(Web3Config.formatTokenAmountInteger(amount));
  };

  if (!gameConfig || !tokenInfo) {
    return (
      <div className="bg-white bg-opacity-10 backdrop-blur-lg rounded-2xl p-8 border border-white border-opacity-20">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-4"></div>
          <p className="text-white">{t('game.loadingGameData')}</p>
        </div>
      </div>
    );
  }

  if (!currentToken || currentToken === '0x0000000000000000000000000000000000000000') {
    return (
      <div className="bg-white bg-opacity-10 backdrop-blur-lg rounded-2xl p-8 border border-white border-opacity-20">
        <div className="text-center">
          <div className="text-6xl mb-4">⚠️</div>
          <h3 className="text-xl font-bold text-white mb-2">{t('game.gameNotAvailable')}</h3>
          <p className="text-gray-300">{t('game.gameNotAvailableDesc')}</p>
        </div>
      </div>
    );
  }

  const needsApproval = betAmount && BigInt(Web3Config.parseTokenAmount(betAmount)) > BigInt(userAllowance);

  return (
    <div className="space-y-6">
      {/* 游戏主界面 */}
      <div className="bg-white bg-opacity-10 backdrop-blur-lg rounded-2xl p-8 border border-white border-opacity-20">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-white mb-2">{t('game.title')}</h2>
          <p className="text-gray-300">
            {t('game.subtitle', { symbol: tokenInfo.symbol })}
          </p>
        </div>

        {/* 模拟结果展示 */}
        {simulationResult && (
          <div className="mb-8">
            <h3 className="text-lg font-semibold text-white mb-4 text-center">预览效果</h3>
            <div className="flex justify-center space-x-4 mb-4">
              {simulationResult.map((symbol, index) => (
                <div key={index} className="bg-white bg-opacity-20 rounded-lg p-4 text-center">
                  <div className="text-4xl mb-2">
                    {Web3Config.SYMBOL_EMOJIS[Web3Config.SYMBOL_NAMES[parseInt(symbol)]]}
                  </div>
                  <div className="text-sm text-gray-300">
                    {Web3Config.SYMBOL_NAMES[parseInt(symbol)]}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 用户余额 */}
        <div className="bg-blue-500 bg-opacity-20 rounded-lg p-4 mb-6">
          <div className="flex justify-between items-center">
            <span className="text-blue-200">钱包余额:</span>
            <span className="text-blue-100 font-semibold">
              {Web3Config.formatTokenAmountInteger(userBalance)} {tokenInfo.symbol}
            </span>
          </div>
        </div>

        {/* 下注区域 */}
        <div className="space-y-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-200 mb-2">
              下注金额 ({tokenInfo.symbol})
            </label>
            <input
              type="number"
              value={betAmount}
              onChange={(e) => setBetAmount(e.target.value)}
              placeholder={`最小: ${Web3Config.formatTokenAmountInteger(gameConfig.minBet)}, 最大: ${Web3Config.formatTokenAmountInteger(gameConfig.maxBet)}`}
              className="w-full px-4 py-3 bg-white bg-opacity-10 border border-white border-opacity-20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
              disabled={isPlaying || isApproving}
            />
          </div>

          {/* 快捷下注选项 */}
          <div>
            <p className="text-sm text-gray-200 mb-2">快捷下注:</p>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
              {quickBetOptions.map((option, index) => (
                <button
                  key={index}
                  onClick={() => handleQuickBet(option)}
                  className="bg-white bg-opacity-10 hover:bg-opacity-20 text-white py-2 px-3 rounded-lg text-sm transition-colors"
                  disabled={isPlaying || isApproving}
                >
                  {Web3Config.formatTokenAmountInteger(option)}
                </button>
              ))}
            </div>
          </div>
        </div>

        {error && (
          <div className="bg-red-500 bg-opacity-20 border border-red-500 rounded-lg p-3 mb-6">
            <p className="text-red-200 text-sm">{error}</p>
          </div>
        )}

        {/* 操作按钮 */}
        <div className="space-y-3">
          {needsApproval && (
            <button
              onClick={handleApprove}
              disabled={isApproving || !betAmount}
              className="w-full bg-yellow-600 hover:bg-yellow-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-semibold py-4 px-6 rounded-xl transition-colors"
            >
              {isApproving ? '授权中...' : `授权 ${betAmount} ${tokenInfo.symbol}`}
            </button>
          )}

          <button
            onClick={handlePlay}
            disabled={isPlaying || !betAmount || needsApproval || !gameConfig.isActive}
            className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 disabled:from-gray-600 disabled:to-gray-600 disabled:cursor-not-allowed text-white font-semibold py-4 px-6 rounded-xl transition-all duration-300 transform hover:scale-105 disabled:hover:scale-100 shadow-lg"
          >
            {isPlaying ? (
              <div className="flex items-center justify-center space-x-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                <span>抽奖中...</span>
              </div>
            ) : (
              `开始抽奖 (${betAmount || '0'} ${tokenInfo.symbol})`
            )}
          </button>
        </div>


      </div>

      {/* 赔率表 */}
      <div className="bg-white bg-opacity-10 backdrop-blur-lg rounded-2xl p-6 border border-white border-opacity-20">
        <h3 className="text-xl font-bold text-white mb-4 text-center">赔率表</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {payoutRates.map((rate, index) => (
            <div key={index} className="bg-white bg-opacity-10 rounded-lg p-3 text-center">
              <div className="text-2xl mb-1">
                {Web3Config.SYMBOL_EMOJIS[Web3Config.SYMBOL_NAMES[index]]}
              </div>
              <div className="text-sm text-gray-300 mb-1">
                {Web3Config.SYMBOL_NAMES[index]}
              </div>
              <div className="text-white font-semibold">
                {(parseInt(rate) / 100).toFixed(1)}x
              </div>
            </div>
          ))}
        </div>
        <p className="text-xs text-gray-400 text-center mt-4">
          * 三个相同符号获得完整赔率，两个相同符号获得1/4赔率
        </p>
      </div>

      {/* 游戏记录 - 移动到赔率表下方 */}
      <div className="bg-white bg-opacity-10 backdrop-blur-lg rounded-2xl p-6 border border-white border-opacity-20 mt-6">
        <h3 className="text-xl font-bold text-white mb-4 text-center">🕒 游戏记录</h3>

        {historyLoading ? (
          <div className="text-center py-8">
            <div className="text-4xl mb-2 animate-spin">⏳</div>
            <p className="text-gray-300">加载游戏记录中...</p>
          </div>
        ) : gameHistory.length === 0 ? (
          <div className="text-center py-8">
            <div className="text-6xl mb-4">🎲</div>
            <p className="text-gray-300">暂无游戏记录</p>
            <p className="text-xs text-gray-400 mt-2">开始你的第一次游戏吧！</p>
          </div>
        ) : (
          <div className="space-y-3 max-h-64 overflow-y-auto">
            {gameHistory.map((record, index) => {
              const isWin = BigInt(record.winAmount) > BigInt(0);
              const getSymbolDisplay = (symbols) => {
                if (!symbols || !Array.isArray(symbols)) return '❓ ❓ ❓';
                return symbols.slice(0, 3).map((s) => {
                  const symbolIndex = parseInt(s);
                  return Web3Config.SYMBOL_EMOJIS[Web3Config.SYMBOL_NAMES[symbolIndex]] || '❓';
                }).join(' ');
              };

              return (
                <div
                  key={record.gameId || index}
                  className={`bg-white bg-opacity-5 rounded-lg p-4 border-l-4 ${
                    isWin ? 'border-green-400' : 'border-red-400'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="text-2xl">
                        {getSymbolDisplay(record.symbols)}
                      </div>
                      <div>
                        <div className="text-white font-semibold text-sm">
                          下注: {Web3Config.formatTokenAmountInteger(record.betAmount)} {tokenInfo?.symbol || 'tokens'}
                        </div>
                        <div className="text-xs text-gray-400">
                          {new Date(Number(record.timestamp) * 1000).toLocaleString()}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      {isWin ? (
                        <div className="text-green-300 font-bold">
                          +{Web3Config.formatTokenAmountInteger(record.winAmount)} {tokenInfo?.symbol || 'tokens'}
                        </div>
                      ) : (
                        <div className="text-red-300">
                          <span>未中奖</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 抽奖结果弹窗 */}
      <LotteryResultModal
        isOpen={showResultModal}
        onClose={() => setShowResultModal(false)}
        gameResult={gameResult}
        tokenInfo={tokenInfo}
      />
    </div>
  );
};

export default LotteryGame;
