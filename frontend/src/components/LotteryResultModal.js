import React, { useEffect, useState } from 'react';
import Web3Config from '../config/web3';

const LotteryResultModal = ({ isOpen, onClose, gameResult, tokenInfo }) => {
  const [showFireworks, setShowFireworks] = useState(false);

  useEffect(() => {
    if (isOpen && gameResult) {
      // 如果中奖，启动烟花效果
      if (gameResult.isWin) {
        setShowFireworks(true);
        // 烟花效果持续时间
        const fireworkTimer = setTimeout(() => {
          setShowFireworks(false);
        }, 4000);

        // 自动关闭弹窗
        const closeTimer = setTimeout(() => {
          onClose();
        }, 6000);

        return () => {
          clearTimeout(fireworkTimer);
          clearTimeout(closeTimer);
        };
      } else {
        // 未中奖，较快关闭
        const timer = setTimeout(() => {
          onClose();
        }, 3000);
        return () => clearTimeout(timer);
      }
    }
  }, [isOpen, onClose, gameResult]);

  if (!isOpen || !gameResult) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50">
      {/* 烟花效果容器 */}
      {gameResult.isWin && showFireworks && (
        <div className="fixed inset-0 pointer-events-none overflow-hidden">
          {/* 多个烟花爆炸点 */}
          {[...Array(8)].map((_, i) => (
            <div
              key={i}
              className="absolute animate-firework"
              style={{
                left: `${20 + (i * 10)}%`,
                top: `${30 + (i % 3) * 20}%`,
                animationDelay: `${i * 0.3}s`,
                animationDuration: '2s'
              }}
            >
              {/* 烟花粒子 */}
              {[...Array(12)].map((_, j) => (
                <div
                  key={j}
                  className="absolute w-2 h-2 rounded-full animate-firework-particle"
                  style={{
                    backgroundColor: ['#ff6b35', '#f7931e', '#ffd700', '#ff1744', '#e91e63', '#9c27b0'][j % 6],
                    animationDelay: `${i * 0.3 + j * 0.1}s`,
                    transform: `rotate(${j * 30}deg)`,
                  }}
                />
              ))}
            </div>
          ))}

          {/* 金币雨效果 */}
          {gameResult.isWin && (
            <div className="absolute inset-0">
              {[...Array(20)].map((_, i) => (
                <div
                  key={i}
                  className="absolute text-2xl animate-coin-fall"
                  style={{
                    left: `${Math.random() * 100}%`,
                    animationDelay: `${Math.random() * 2}s`,
                    animationDuration: `${2 + Math.random() * 2}s`
                  }}
                >
                  🪙
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 rounded-lg p-8 max-w-md w-full mx-4 text-center relative overflow-hidden border-2 border-purple-500 shadow-2xl">
        {/* 发光边框效果 */}
        {gameResult.isWin && (
          <div className="absolute inset-0 rounded-lg bg-gradient-to-r from-purple-500 via-yellow-500 to-purple-500 opacity-20 animate-pulse"></div>
        )}

        <div className="relative z-10">
          {/* 关闭按钮 */}
          <button
            onClick={onClose}
            className="absolute top-2 right-2 text-gray-400 hover:text-white text-2xl font-bold"
          >
            ×
          </button>

          {gameResult.isWin ? (
            <>
              <div className="text-6xl mb-4 animate-bounce">
                🎉
              </div>
              <h2 className="text-4xl font-bold mb-4 text-yellow-400 animate-pulse">
                恭喜中奖！
              </h2>
            </>
          ) : (
            <>
              <div className="text-6xl mb-4">😔</div>
              <h2 className="text-3xl font-bold text-gray-400 mb-4">
                很遗憾，未中奖
              </h2>
            </>
          )}

          {/* 符号显示 */}
          <div className="flex justify-center items-center space-x-4 mb-6">
            {gameResult.symbols.map((symbol, index) => (
              <div key={index} className="relative">
                <div className="w-20 h-20 bg-white bg-opacity-20 rounded-lg flex items-center justify-center border-2 border-purple-400">
                  <div className="text-4xl">
                    {Web3Config.SYMBOL_EMOJIS[Web3Config.SYMBOL_NAMES[symbol]]}
                  </div>
                </div>
                {gameResult.isWin && (
                  <div className="absolute -top-2 -right-2 w-6 h-6 bg-yellow-400 rounded-full flex items-center justify-center">
                    <span className="text-xs font-bold text-black">✓</span>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* 结果信息 */}
          <div className="space-y-3 mb-6">
            <div className="flex justify-between items-center">
              <span className="text-gray-300">下注金额:</span>
              <span className="text-white font-bold">
                {Web3Config.formatTokenAmountInteger(gameResult.betAmount)} {tokenInfo?.symbol || 'tokens'}
              </span>
            </div>
            
            {gameResult.isWin ? (
              <>
                <div className="flex justify-between items-center">
                  <span className="text-gray-300">中奖金额:</span>
                  <span className="text-green-400 font-bold text-xl">
                    {Web3Config.formatTokenAmountInteger(gameResult.winAmount)} {tokenInfo?.symbol || 'tokens'}
                  </span>
                </div>
                
                <div className="flex justify-between items-center border-t border-gray-600 pt-3">
                  <span className="text-gray-300">净收益:</span>
                  <span className="text-green-400 font-bold text-xl">
                    +{Web3Config.formatTokenAmountInteger(
                      BigInt(gameResult.winAmount) - BigInt(gameResult.betAmount)
                    )} {tokenInfo?.symbol || 'tokens'}
                  </span>
                </div>
              </>
            ) : (
              <div className="flex justify-between items-center border-t border-gray-600 pt-3">
                <span className="text-gray-300">损失:</span>
                <span className="text-red-400 font-bold text-xl">
                  -{Web3Config.formatTokenAmountInteger(gameResult.betAmount)} {tokenInfo?.symbol || 'tokens'}
                </span>
              </div>
            )}
          </div>

          {/* 动作按钮 */}
          <div className="flex space-x-4">
            <button
              onClick={onClose}
              className="flex-1 bg-gray-600 hover:bg-gray-700 text-white px-6 py-3 rounded-lg transition-colors font-bold"
            >
              继续游戏
            </button>
            
            {gameResult.isWin && (
              <button
                onClick={() => {
                  // 可以添加分享功能
                  onClose();
                }}
                className="flex-1 bg-gradient-to-r from-purple-600 to-yellow-500 text-white px-6 py-3 rounded-lg transition-all duration-300 transform hover:scale-105 font-bold"
              >
                分享好运! 🎉
              </button>
            )}
          </div>

          {/* 鼓励文字 */}
          <div className="mt-4 text-sm text-gray-400">
            {gameResult.isWin ? 
              '🍀 恭喜你的好运气！继续保持！' : 
              '💪 不要灰心，下一次就是你的幸运时刻！'
            }
          </div>
        </div>
      </div>
    </div>
  );
};

export default LotteryResultModal;
