import React, { useState, useEffect } from 'react';
import Web3Config from '../config/web3';

const UserDashboard = ({ account, userInfo, onRefresh }) => {
  const [pendingRewards, setPendingRewards] = useState('0');
  const [isClaiming, setIsClaiming] = useState(false);
  const [error, setError] = useState(null);
  const [currentToken, setCurrentToken] = useState(null);
  const [tokenInfo, setTokenInfo] = useState(null);

  useEffect(() => {
    loadDashboardData();
  }, [account, userInfo]);

  const loadDashboardData = async () => {
    try {
      const web3 = Web3Config.getWeb3();

      const contract = new web3.eth.Contract(
        Web3Config.CONTRACT_CONFIG.abi,
        Web3Config.CONTRACT_CONFIG.address
      );

      // 获取当前代币
      const tokenAddress = await contract.methods.currentToken().call();
      setCurrentToken(tokenAddress);

      // 获取代币信息
      if (tokenAddress && tokenAddress !== '0x0000000000000000000000000000000000000000') {
        const tokenContract = new web3.eth.Contract(Web3Config.ERC20_ABI, tokenAddress);

        const [name, symbol, decimals] = await Promise.all([
          tokenContract.methods.name().call(),
          tokenContract.methods.symbol().call(),
          tokenContract.methods.decimals().call()
        ]);

        setTokenInfo({ name, symbol, decimals, address: tokenAddress });
      }

      // 获取用户信息（包含待领取奖励）
      const userDetails = await contract.methods.users(account).call();
      setPendingRewards(userDetails.pendingRewards);



    } catch (error) {
      console.error('Load dashboard data failed:', error);
      console.error('Error details:', {
        message: error.message,
        stack: error.stack,
        name: error.name
      });
      setError(`Failed to load data: ${error.message}`);
    }
  };

  const handleClaimRewards = async () => {
    if (BigInt(pendingRewards) === BigInt(0)) return;

    setIsClaiming(true);
    setError(null);

    try {
      const web3 = Web3Config.getWeb3();
      const contract = new web3.eth.Contract(
        Web3Config.CONTRACT_CONFIG.abi,
        Web3Config.CONTRACT_CONFIG.address
      );

      const gasEstimate = await contract.methods
        .claimRewards()
        .estimateGas({ from: account });

      // 获取当前 Gas 价格
      const gasPrice = await web3.eth.getGasPrice();

      await contract.methods
        .claimRewards()
        .send({
          from: account,
          gas: Math.floor(Number(gasEstimate) * 1.2),
          gasPrice: gasPrice,
        });

      // 刷新数据
      await loadDashboardData();
      onRefresh();
    } catch (error) {
      console.error('Claim rewards failed:', error);
      setError('Claim rewards failed: ' + error.message);
    } finally {
      setIsClaiming(false);
    }
  };



  // Show loading state if userInfo is null
  if (!userInfo) {
    return (
      <div className="retro-card p-8 text-center">
        <div className="slot-symbol text-6xl mb-4">⏳</div>
        <h2 className="text-2xl text-yellow-400 neon-text pixel-text mb-2">LOADING PLAYER DATA...</h2>
        <p className="text-green-400 pixel-text text-sm">Please wait while we fetch your game stats</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">


      {/* 待领取奖励 */}
      {BigInt(pendingRewards) > BigInt(0) && (
        <div className="bg-gradient-to-r from-green-500 to-blue-500 bg-opacity-20 backdrop-blur-lg rounded-xl p-6 border border-green-400 border-opacity-30">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xl font-bold text-yellow-400 neon-text mb-2 pixel-text">🎁 PENDING REWARDS</h3>
              <p className="text-3xl font-bold text-green-300">
                {Web3Config.formatTokenAmountInteger(pendingRewards)} {tokenInfo?.symbol || 'tokens'}
              </p>
              <p className="text-sm text-gray-300 mt-1">
                CLICK TO CLAIM YOUR WINNINGS
              </p>
            </div>
            <button
              onClick={handleClaimRewards}
              disabled={isClaiming}
              className="bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-semibold py-3 px-6 rounded-xl transition-colors"
            >
              {isClaiming ? (
                <div className="flex items-center space-x-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span className="pixel-text">CLAIMING...</span>
                </div>
              ) : (
                <span className="pixel-text">CLAIM REWARDS</span>
              )}
            </button>
          </div>
        </div>
      )}

      {error && (
        <div className="bg-red-500 bg-opacity-20 border border-red-500 rounded-lg p-4">
          <p className="text-red-200">{error}</p>
        </div>
      )}


    </div>
  );
};

export default UserDashboard;
