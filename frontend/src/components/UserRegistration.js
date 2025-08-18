import React, { useState } from 'react';
import Web3Config from '../config/web3';

const UserRegistration = ({ account, onRegistrationSuccess }) => {
  const [nickname, setNickname] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const [error, setError] = useState(null);

  const handleRegister = async (e) => {
    e.preventDefault();
    
    if (!nickname.trim()) {
      setError('请输入昵称');
      return;
    }

    if (nickname.length > 50) {
      setError('昵称长度不能超过50个字符');
      return;
    }

    setIsRegistering(true);
    setError(null);

    try {
      const web3 = Web3Config.getWeb3();
      const contract = new web3.eth.Contract(
        Web3Config.CONTRACT_CONFIG.abi,
        Web3Config.CONTRACT_CONFIG.address
      );

      // 估算 Gas
      const gasEstimate = await contract.methods
        .registerUser(nickname.trim())
        .estimateGas({ from: account });

      // 获取当前 Gas 价格
      const gasPrice = await web3.eth.getGasPrice();

      // 发送交易 (使用传统 Gas 模式，不使用 EIP-1559)
      const receipt = await contract.methods
        .registerUser(nickname.trim())
        .send({
          from: account,
          gas: Math.floor(Number(gasEstimate) * 1.2), // 转换为数字后增加20%的Gas缓冲
          gasPrice: gasPrice, // 使用传统 Gas 价格
        });

      console.log('注册成功:', receipt);

      // 获取更新后的用户信息
      const userInfo = await contract.methods.users(account).call();
      
      onRegistrationSuccess(userInfo);
    } catch (error) {
      console.error('注册失败:', error);
      setError(error.message || '注册失败，请重试');
    } finally {
      setIsRegistering(false);
    }
  };

  return (
    <div className="max-w-md mx-auto">
      <div className="bg-white bg-opacity-10 backdrop-blur-lg rounded-2xl p-8 border border-white border-opacity-20">
        <div className="text-center mb-6">
          <div className="text-6xl mb-4">👋</div>
          <h2 className="text-3xl font-bold text-white mb-2">
            欢迎来到 BONK Lottery
          </h2>
          <p className="text-gray-300">
            请先注册用户账户以开始游戏
          </p>
        </div>

        <form onSubmit={handleRegister} className="space-y-6">
          <div>
            <label htmlFor="nickname" className="block text-sm font-medium text-gray-200 mb-2">
              选择您的昵称
            </label>
            <input
              type="text"
              id="nickname"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              placeholder="输入昵称 (最多50个字符)"
              maxLength={50}
              className="w-full px-4 py-3 bg-white bg-opacity-10 border border-white border-opacity-20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              disabled={isRegistering}
              required
            />
            <p className="text-xs text-gray-400 mt-1">
              {nickname.length}/50 字符
            </p>
          </div>

          {error && (
            <div className="bg-red-500 bg-opacity-20 border border-red-500 rounded-lg p-3">
              <p className="text-red-200 text-sm">{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={isRegistering || !nickname.trim()}
            className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 disabled:from-gray-600 disabled:to-gray-600 disabled:cursor-not-allowed text-white font-semibold py-4 px-6 rounded-xl transition-all duration-300 transform hover:scale-105 disabled:hover:scale-100 shadow-lg"
          >
            {isRegistering ? (
              <div className="flex items-center justify-center space-x-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                <span>注册中...</span>
              </div>
            ) : (
              '注册账户'
            )}
          </button>
        </form>

        <div className="mt-8 space-y-4">
          <div className="bg-blue-500 bg-opacity-20 rounded-lg p-4">
            <h3 className="font-semibold text-blue-200 mb-2">注册说明</h3>
            <ul className="text-sm text-blue-100 space-y-1">
              <li>• 注册需要支付少量 Gas 费用</li>
              <li>• 昵称一旦设置可以后续修改</li>
              <li>• 注册后即可开始抽奖游戏</li>
              <li>• 所有游戏记录保存在区块链上</li>
            </ul>
          </div>

          <div className="bg-green-500 bg-opacity-20 rounded-lg p-4">
            <h3 className="font-semibold text-green-200 mb-2">费用信息</h3>
            <div className="text-sm text-green-100 space-y-1">
              <div className="flex justify-between">
                <span>预估 Gas 费用:</span>
                <span>~0.001 OKB</span>
              </div>
              <div className="flex justify-between">
                <span>注册费用:</span>
                <span className="text-green-300 font-semibold">免费</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserRegistration;
