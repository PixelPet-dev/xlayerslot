import { useState, useEffect } from 'react';
import Web3 from 'web3';

// 从 abis.js 导入完整的 ABI
import { LOTTERY_GAME_ABI, ERC20_ABI } from '../contracts/abis.js';

export const useContract = () => {
  const [web3, setWeb3] = useState(null);
  const [lotteryContract, setLotteryContract] = useState(null);
  const [tokenContract, setTokenContract] = useState(null);
  const [account, setAccount] = useState(null);

  useEffect(() => {
    initWeb3();
  }, []);

  const initWeb3 = async () => {
    if (window.ethereum) {
      const web3Instance = new Web3(window.ethereum);
      setWeb3(web3Instance);

      // 获取合约实例
      const lotteryAddress = process.env.REACT_APP_CONTRACT_ADDRESS;
      const tokenAddress = process.env.REACT_APP_TOKEN_ADDRESS;

      if (lotteryAddress && LOTTERY_GAME_ABI) {
        const lottery = new web3Instance.eth.Contract(LOTTERY_GAME_ABI, lotteryAddress);
        setLotteryContract(lottery);
      }

      if (tokenAddress && ERC20_ABI) {
        const token = new web3Instance.eth.Contract(ERC20_ABI, tokenAddress);
        setTokenContract(token);
      }

      // 监听账户变化
      window.ethereum.on('accountsChanged', (accounts) => {
        setAccount(accounts[0] || null);
      });

      // 获取当前账户
      try {
        const accounts = await web3Instance.eth.getAccounts();
        setAccount(accounts[0] || null);
      } catch (error) {
        console.error('获取账户失败:', error);
      }
    }
  };

  const connectWallet = async () => {
    if (!window.ethereum) {
      throw new Error('请安装 MetaMask');
    }

    try {
      await window.ethereum.request({ method: 'eth_requestAccounts' });
      const accounts = await web3.eth.getAccounts();
      setAccount(accounts[0]);
      return accounts[0];
    } catch (error) {
      throw new Error('连接钱包失败: ' + error.message);
    }
  };

  return {
    web3,
    lotteryContract,
    tokenContract,
    account,
    connectWallet,
    isConnected: !!account
  };
};

export { LOTTERY_GAME_ABI, ERC20_ABI };
