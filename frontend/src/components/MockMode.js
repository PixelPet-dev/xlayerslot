import React, { useState } from 'react';

const MockMode = ({ onMockRegistration }) => {
  const [nickname, setNickname] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);

  const handleMockRegister = async () => {
    if (!nickname.trim()) return;
    
    setIsRegistering(true);
    
    // 模拟注册延迟
    setTimeout(() => {
      const mockUserInfo = {
        isRegistered: true,
        nickname: nickname.trim(),
        registrationTime: Date.now(),
        totalBets: '0',
        totalWins: '0',
        gamesPlayed: '0',
        pendingRewards: '0'
      };
      
      onMockRegistration(mockUserInfo);
      setIsRegistering(false);
    }, 2000);
  };

  return (
    <div className="max-w-md mx-auto bg-white bg-opacity-10 backdrop-blur-lg rounded-2xl p-8 border border-white border-opacity-20">
      <div className="text-center mb-6">
        <div className="text-6xl mb-4">🎮</div>
        <h2 className="text-3xl font-bold text-white mb-2">模拟模式</h2>
        <p className="text-gray-300">
          由于余额不足，启用模拟模式测试功能
        </p>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            选择您的昵称
          </label>
          <input
            type="text"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            placeholder="输入昵称"
            maxLength={50}
            className="w-full px-4 py-3 bg-white bg-opacity-10 border border-white border-opacity-20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          />
          <p className="text-xs text-gray-400 mt-1">
            {nickname.length}/50 字符
          </p>
        </div>

        <button
          onClick={handleMockRegister}
          disabled={!nickname.trim() || isRegistering}
          className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 disabled:from-gray-600 disabled:to-gray-700 text-white font-semibold py-3 px-6 rounded-lg transition-all duration-200 disabled:cursor-not-allowed"
        >
          {isRegistering ? (
            <div className="flex items-center justify-center">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
              模拟注册中...
            </div>
          ) : (
            '模拟注册'
          )}
        </button>
      </div>

      <div className="mt-6 p-4 bg-yellow-500 bg-opacity-20 border border-yellow-500 rounded-lg">
        <h3 className="text-yellow-300 font-semibold mb-2">⚠️ 模拟模式说明</h3>
        <ul className="text-yellow-200 text-sm space-y-1">
          <li>• 这是模拟模式，不会产生真实交易</li>
          <li>• 用于测试前端功能和界面</li>
          <li>• 需要 OKB 才能进行真实交易</li>
          <li>• 获取 OKB 后可切换到正常模式</li>
        </ul>
      </div>

      <div className="mt-4 p-4 bg-blue-500 bg-opacity-20 border border-blue-500 rounded-lg">
        <h3 className="text-blue-300 font-semibold mb-2">💡 获取 OKB 方法</h3>
        <ul className="text-blue-200 text-sm space-y-1">
          <li>• 从 OKX 交易所购买并提现</li>
          <li>• 从其他钱包转入（最少 0.01 OKB）</li>
          <li>• 确保使用 X Layer 网络</li>
        </ul>
      </div>
    </div>
  );
};

export default MockMode;
