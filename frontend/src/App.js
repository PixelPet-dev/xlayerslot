import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import Web3Config from './config/web3';
import WalletConnection from './components/WalletConnection';
import UserRegistration from './components/UserRegistration';
import LotteryGame from './components/LotteryGame';
import UserDashboard from './components/UserDashboard';
import LanguageSwitcher from './components/LanguageSwitcher';
import './i18n';
import './App.css';

function App() {
  const { t } = useTranslation();
  const [account, setAccount] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isRegistered, setIsRegistered] = useState(false);
  const [userInfo, setUserInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isMockMode, setIsMockMode] = useState(false);
  const [userBalance, setUserBalance] = useState('0');

  // 检查钱包连接状态
  useEffect(() => {
    checkConnection();
    setupEventListeners();
    
    return () => {
      Web3Config.removeAllListeners();
    };
  }, []);

  // 检查连接状态
  const checkConnection = async () => {
    try {
      const currentAccount = await Web3Config.getCurrentAccount();
      if (currentAccount) {
        setAccount(currentAccount);
        setIsConnected(true);
        await autoRegisterUser(currentAccount);
      }
    } catch (error) {
      console.error('Check connection failed:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  // Auto register user with wallet address as nickname
  const autoRegisterUser = async (userAccount) => {
    try {
      const web3 = Web3Config.getWeb3();
      const contract = new web3.eth.Contract(
        Web3Config.CONTRACT_CONFIG.abi,
        Web3Config.CONTRACT_CONFIG.address
      );

      const userInfo = await contract.methods.users(userAccount).call();

      if (userInfo.isRegistered) {
        setUserInfo(userInfo);
        setIsRegistered(true);
      } else {
        // Auto register with shortened wallet address
        const shortAddress = `${userAccount.slice(0, 6)}...${userAccount.slice(-4)}`;

        try {
          const gasPrice = await web3.eth.getGasPrice();
          const gasEstimate = await contract.methods
            .registerUser(shortAddress)
            .estimateGas({ from: userAccount });

          await contract.methods
            .registerUser(shortAddress)
            .send({
              from: userAccount,
              gas: Math.floor(Number(gasEstimate) * 1.2),
              gasPrice: gasPrice,
            });

          // Fetch updated user info
          const newUserInfo = await contract.methods.users(userAccount).call();
          setUserInfo(newUserInfo);
          setIsRegistered(true);
        } catch (regError) {
          console.error('Auto registration failed:', regError);
          setIsRegistered(false);
          setUserInfo(null);
        }
      }
    } catch (error) {
      console.error('User check failed:', error);
    }
  };

  // 设置事件监听
  const setupEventListeners = () => {
    Web3Config.onAccountsChanged((accounts) => {
      if (accounts.length === 0) {
        setAccount(null);
        setIsConnected(false);
        setIsRegistered(false);
        setUserInfo(null);
      } else {
        setAccount(accounts[0]);
        autoRegisterUser(accounts[0]);
      }
    });

    Web3Config.onChainChanged(() => {
      window.location.reload();
    });
  };

  // 连接钱包
  const handleConnect = async () => {
    try {
      setLoading(true);
      setError(null);
      const connectedAccount = await Web3Config.connectWallet();
      setAccount(connectedAccount);
      setIsConnected(true);
      await autoRegisterUser(connectedAccount);
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  // 断开连接
  const handleDisconnect = async () => {
    try {
      // 调用Web3Config的断开连接方法
      await Web3Config.disconnectWallet();

      // 清除应用状态
      setAccount(null);
      setIsConnected(false);
      setIsRegistered(false);
      setUserInfo(null);
      setError(null);
    } catch (error) {
      console.error('断开连接失败:', error);
      // 即使断开连接失败，也清除应用状态
      setAccount(null);
      setIsConnected(false);
      setIsRegistered(false);
      setUserInfo(null);
    }
  };

  // 刷新用户信息
  const refreshUserInfo = async () => {
    if (account) {
      await autoRegisterUser(account);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-white mx-auto mb-4"></div>
          <p className="text-white text-xl">{t('common.loading')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen slot-machine-bg">
      {/* Header */}
      <header className="retro-card border-b-4 border-yellow-400">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="slot-symbol text-6xl">🎰</div>
              <div>
                <h1 className="text-3xl font-bold text-yellow-400 neon-text">XLucky Slot</h1>
                <p className="text-sm text-green-400 pixel-text">X Layer Casino</p>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              <LanguageSwitcher />
            </div>
            
            {isConnected && (
              <div className="flex items-center space-x-4">
                <div className="retro-card px-4 py-3">
                  <p className="text-xs text-yellow-400 pixel-text">WALLET</p>
                  <p className="text-sm text-white pixel-text">
                    {account.slice(0, 6)}...{account.slice(-4)}
                  </p>
                </div>
                {isRegistered && userInfo && userInfo.nickname && userInfo.nickname !== account && (
                  <div className="retro-card bg-green-600 bg-opacity-30 px-4 py-3">
                    <p className="text-xs text-green-300 pixel-text">PLAYER</p>
                    <p className="text-sm text-green-100 pixel-text">
                      {userInfo.nickname}
                    </p>
                  </div>
                )}
                {/* 断开连接按钮 */}
                <button
                  onClick={handleDisconnect}
                  className="retro-card bg-red-600 bg-opacity-30 hover:bg-opacity-50 border-red-400 px-3 py-2 text-xs transition-all duration-300 transform hover:scale-105"
                  title={t('wallet.disconnect')}
                >
                  <span className="text-red-300 pixel-text">🔌 {t('common.disconnect')}</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {error && (
          <div className="mb-6 retro-card bg-red-600 bg-opacity-30 border-red-400 p-4">
            <p className="text-red-100 pixel-text">{error}</p>
            <button
              onClick={() => setError(null)}
              className="mt-2 retro-button bg-red-500 text-xs"
            >
              CLOSE
            </button>
          </div>
        )}

        {!isConnected ? (
          <WalletConnection onConnect={handleConnect} />
        ) : (
          <div className="space-y-8">
            {/* 用户仪表板 */}
            <UserDashboard 
              account={account}
              userInfo={userInfo}
              onRefresh={refreshUserInfo}
            />
            
            {/* 抽奖游戏 */}
            <LotteryGame 
              account={account}
              onGameComplete={refreshUserInfo}
            />
          </div>
        )}
      </main>

      {/* 页脚 */}
      <footer className="bg-black bg-opacity-20 backdrop-blur-lg border-t border-white border-opacity-20 mt-16">
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">
            <h3 className="text-xl font-bold text-white mb-4">Xlayer Slot Game</h3>
            <p className="text-gray-300 mb-4">
              {t('footer.description')}
            </p>
            <div className="flex justify-center space-x-6 text-sm text-gray-400">
              <a 
                href="https://www.oklink.com/xlayer" 
                target="_blank" 
                rel="noopener noreferrer"
                className="hover:text-white transition-colors"
              >
                {t('footer.blockExplorer')}
              </a>
              <a
                href={`https://www.oklink.com/xlayer/address/${Web3Config.CONTRACT_CONFIG.address}`}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-white transition-colors"
              >
                {t('footer.contractAddress')}
              </a>
              <span>Chain ID: 196</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;
