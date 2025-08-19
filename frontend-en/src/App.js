import React, { useState, useEffect, useRef } from 'react';
import Web3 from 'web3';
import AudioManager, { useAudioManager, setAudioManagerInstance } from './components/AudioManager';

// XLayer Network Configuration - 使用单一官方RPC
const XLAYER_CONFIG = {
  chainId: '0xC4', // 196 in hex
  chainName: 'X Layer Mainnet',
  nativeCurrency: {
    name: 'OKB',
    symbol: 'OKB',
    decimals: 18,
  },
  rpcUrls: ['https://rpc.xlayer.tech'], // 使用官方RPC，避免多节点选择
  blockExplorerUrls: ['https://www.oklink.com/xlayer'],
};

// Contract Configuration
const CONTRACT_CONFIG = {
  address: '0xF6637254Cceb1484Db01B57f90DdB0B6094e4407',
  tokenAddress: '0x798095d5BF06edeF0aEB82c10DCDa5a92f58834E',
  abi: [
    {
      "inputs": [{"internalType": "uint256", "name": "betAmount", "type": "uint256"}],
      "name": "playLottery",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [{"internalType": "string", "name": "nickname", "type": "string"}],
      "name": "registerUser",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "claimRewards",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [{"internalType": "address", "name": "", "type": "address"}],
      "name": "users",
      "outputs": [
        {"internalType": "bool", "name": "isRegistered", "type": "bool"},
        {"internalType": "string", "name": "nickname", "type": "string"},
        {"internalType": "uint256", "name": "registrationTime", "type": "uint256"},
        {"internalType": "uint256", "name": "totalBets", "type": "uint256"},
        {"internalType": "uint256", "name": "totalWins", "type": "uint256"},
        {"internalType": "uint256", "name": "gamesPlayed", "type": "uint256"},
        {"internalType": "uint256", "name": "pendingRewards", "type": "uint256"}
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "currentToken",
      "outputs": [{"internalType": "contract IERC20", "name": "", "type": "address"}],
      "stateMutability": "view",
      "type": "function"
    }
  ],
  tokenAbi: [
    {
      "inputs": [{"internalType": "address", "name": "account", "type": "address"}],
      "name": "balanceOf",
      "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [{"internalType": "address", "name": "spender", "type": "address"}, {"internalType": "uint256", "name": "amount", "type": "uint256"}],
      "name": "approve",
      "outputs": [{"internalType": "bool", "name": "", "type": "bool"}],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [{"internalType": "address", "name": "owner", "type": "address"}, {"internalType": "address", "name": "spender", "type": "address"}],
      "name": "allowance",
      "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
      "stateMutability": "view",
      "type": "function"
    }
  ]
};

// Slot symbols with emojis (mapped to contract symbols)
const SYMBOLS = ['🍒', '🍋', '🍊', '🍇', '🔔', '💰', '🎯', '💎'];

// Payout table (from contract)
// 平衡赔率配置 (已更新到合约)
const PAYOUTS = {
  '🍒': 1.5,   // Cherry - 最常见，小奖
  '🍋': 2.0,   // Lemon - 常见
  '🍊': 3.0,   // Orange - 中等
  '🍇': 5.0,   // Plum - 中等偏高
  '🔔': 8.0,   // Bell - 较高
  '💰': 12.0,  // Bar - 高
  '🎯': 20.0,  // Seven - 稀有
  '💎': 50.0   // Jackpot - 超稀有大奖
};

// Bet amounts in tokens (1 token = 10^18 wei)
// Updated to match contract configuration: 30K, 50K, 100K, 300K, 500K, 800K, 1M
const BET_AMOUNTS = [30000, 50000, 100000, 300000, 500000, 800000, 1000000];

function App() {
  const [web3, setWeb3] = useState(null);
  const [account, setAccount] = useState('');
  const [tokenBalance, setTokenBalance] = useState('0');
  const [betAmount, setBetAmount] = useState(30000);
  const [slots, setSlots] = useState(['🍒', '🍒', '🍒']);
  const [isSpinning, setIsSpinning] = useState(false);
  const [gameHistory, setGameHistory] = useState([]);
  const [showPayouts, setShowPayouts] = useState(false);
  const [contract, setContract] = useState(null);
  const [tokenContract, setTokenContract] = useState(null);
  const [userInfo, setUserInfo] = useState(null);
  const [isRegistered, setIsRegistered] = useState(false);
  const [nickname, setNickname] = useState('');
  const [pendingRewards, setPendingRewards] = useState('0');
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionError, setConnectionError] = useState('');
  const [showRegister, setShowRegister] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const [gameResult, setGameResult] = useState(null);
  const [contractBalance, setContractBalance] = useState('0'); // 合约奖池余额

  // 音频相关状态
  const [isBgmPlaying, setIsBgmPlaying] = useState(true); // 默认开启BGM
  const audioManagerRef = useRef(null);
  const { playSpinSound, playWinSound, playLoseSound } = useAudioManager();

  // 初始化音频管理器实例
  useEffect(() => {
    if (audioManagerRef.current) {
      setAudioManagerInstance(audioManagerRef.current);
    }
  }, []);

  // Disconnect wallet
  const disconnectWallet = async () => {
    try {
      // Clear all state
      setAccount('');
      setWeb3(null);
      setContract(null);
      setTokenContract(null);
      setUserInfo(null);
      setIsRegistered(false);
      setTokenBalance('0');
      setPendingRewards('0');
      setConnectionError('');
      setIsConnecting(false);

      console.log('Wallet disconnected successfully');
    } catch (error) {
      console.error('Error during disconnect:', error);
    }
  };

  // Setup event listeners for MetaMask
  useEffect(() => {
    const initWallet = async () => {
      if (!window.ethereum) return;

      try {
        const web3Instance = new Web3(window.ethereum);
        const accounts = await web3Instance.eth.getAccounts();

        if (accounts.length === 0) {
          return; // No accounts connected
        }

        // Check if we're on XLayer network
        const chainId = await web3Instance.eth.getChainId();
        const chainIdNumber = Number(chainId);
        console.log('Checking network, chainId:', chainIdNumber, 'type:', typeof chainId);
        if (chainIdNumber !== 196) {
          console.log('Wrong network, current chainId:', chainIdNumber);
          return;
        }

        setWeb3(web3Instance);
        setAccount(accounts[0]);

        // Initialize contracts
        const gameContract = new web3Instance.eth.Contract(CONTRACT_CONFIG.abi, CONTRACT_CONFIG.address);
        const token = new web3Instance.eth.Contract(CONTRACT_CONFIG.tokenAbi, CONTRACT_CONFIG.tokenAddress);

        setContract(gameContract);
        setTokenContract(token);

        // Load user data and contract balance
        await loadUserData(accounts[0], gameContract, token);
        await loadContractBalance(gameContract, token);

      } catch (error) {
        console.error('Failed to initialize wallet:', error);
      }
    };

    if (window.ethereum) {
      // Listen for account changes
      const handleAccountsChanged = (accounts) => {
        console.log('Accounts changed:', accounts);
        if (accounts.length === 0) {
          // User disconnected
          setAccount('');
          setWeb3(null);
          setContract(null);
          setTokenContract(null);
          setUserInfo(null);
          setIsRegistered(false);
          setTokenBalance('0');
          setPendingRewards('0');
        } else {
          // Account changed, reinitialize
          initWallet();
        }
      };

      // Listen for network changes
      const handleChainChanged = (chainId) => {
        console.log('Chain changed to:', chainId);
        // Reload the page to reset state properly
        window.location.reload();
      };

      window.ethereum.on('accountsChanged', handleAccountsChanged);
      window.ethereum.on('chainChanged', handleChainChanged);

      // Try to initialize on load if already connected
      initWallet();

      // Cleanup
      return () => {
        if (window.ethereum.removeListener) {
          window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
          window.ethereum.removeListener('chainChanged', handleChainChanged);
        }
      };
    }
  }, []);

  // Add XLayer network to MetaMask with automatic RPC selection
  const addXLayerNetwork = async () => {
    try {
      // First try to switch to existing network
      try {
        await window.ethereum.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: XLAYER_CONFIG.chainId }],
        });
        console.log('Switched to existing XLayer network');
        return;
      } catch (switchError) {
        // If network doesn't exist, add it
        console.log('Network not found, adding new network...');
      }

      // Add the network
      await window.ethereum.request({
        method: 'wallet_addEthereumChain',
        params: [XLAYER_CONFIG],
      });
      console.log('XLayer network added successfully');
    } catch (error) {
      console.error('Failed to add XLayer network:', error);
      throw error;
    }
  };

  // Initialize wallet connection
  const initializeWallet = async () => {
    if (!window.ethereum) {
      alert('Please install MetaMask to play this game!');
      return;
    }

    try {
      const web3Instance = new Web3(window.ethereum);
      const accounts = await web3Instance.eth.getAccounts();

      if (accounts.length === 0) {
        return; // No accounts connected
      }

      // Check if we're on XLayer network
      const chainId = await web3Instance.eth.getChainId();
      if (chainId !== 196) {
        console.log('Wrong network, current chainId:', chainId);
        return;
      }

      setWeb3(web3Instance);
      setAccount(accounts[0]);

      // Initialize contracts
      const gameContract = new web3Instance.eth.Contract(CONTRACT_CONFIG.abi, CONTRACT_CONFIG.address);
      const token = new web3Instance.eth.Contract(CONTRACT_CONFIG.tokenAbi, CONTRACT_CONFIG.tokenAddress);

      setContract(gameContract);
      setTokenContract(token);

      // Load user data and contract balance
      await loadUserData(accounts[0], gameContract, token);
      await loadContractBalance(gameContract, token);

    } catch (error) {
      console.error('Failed to initialize wallet:', error);
    }
  };

  // Connect wallet and setup contracts
  const connectWallet = async () => {
    if (!window.ethereum) {
      alert('Please install MetaMask to play this game!');
      return;
    }

    setIsConnecting(true);
    setConnectionError('');

    try {
      console.log('Requesting account access...');

      // Clear any existing state first
      setAccount('');
      setWeb3(null);
      setContract(null);
      setTokenContract(null);

      // Request account access
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      console.log('Accounts received:', accounts);

      if (accounts.length === 0) {
        throw new Error('No accounts found');
      }

      const web3Instance = new Web3(window.ethereum);
      const chainId = await web3Instance.eth.getChainId();
      const chainIdNumber = Number(chainId);
      console.log('Current chain ID:', chainIdNumber);

      // Check if we're on XLayer network
      if (chainIdNumber !== 196) {
        console.log('Wrong network, adding XLayer...');
        try {
          await addXLayerNetwork();
          console.log('XLayer network added, waiting for switch...');

          // Show user-friendly message about RPC selection
          setConnectionError('If you see "Choose RPC" dialog, please select: https://rpc.xlayer.tech');

          // After adding network, wait a bit and try to initialize
          setTimeout(async () => {
            try {
              setConnectionError(''); // Clear the message
              await connectWallet(); // Retry connection
            } catch (error) {
              console.error('Retry connection failed:', error);
              setConnectionError('Connection failed. Please try again or manually switch to XLayer network.');
            }
          }, 3000); // Give more time for user to select RPC
        } catch (error) {
          console.error('Failed to add XLayer network:', error);
          setConnectionError('Please manually switch to XLayer network. If you see RPC options, choose: https://rpc.xlayer.tech');
        }
        setIsConnecting(false);
        return;
      }

      // If already on correct network, initialize immediately
      console.log('On correct network, initializing...');

      setWeb3(web3Instance);
      setAccount(accounts[0]);

      // Initialize contracts
      const gameContract = new web3Instance.eth.Contract(CONTRACT_CONFIG.abi, CONTRACT_CONFIG.address);
      const token = new web3Instance.eth.Contract(CONTRACT_CONFIG.tokenAbi, CONTRACT_CONFIG.tokenAddress);

      setContract(gameContract);
      setTokenContract(token);

      // Load user data and contract balance
      await loadUserData(accounts[0], gameContract, token);
      await loadContractBalance(gameContract, token);

      console.log('Wallet connected successfully');

    } catch (error) {
      console.error('Failed to connect wallet:', error);
      if (error.code === 4001) {
        setConnectionError('Connection rejected by user');
      } else {
        setConnectionError('Failed to connect wallet. Please try again.');
      }
    } finally {
      setIsConnecting(false);
    }
  };

  // Load user data from blockchain
  const loadUserData = async (userAddress, gameContract, token) => {
    try {
      console.log('Loading user data for:', userAddress);

      // Get token balance
      const tokenBal = await token.methods.balanceOf(userAddress).call();
      const balance = Web3.utils.fromWei(tokenBal, 'ether');
      setTokenBalance(balance);
      console.log('Token balance:', balance);

      // Get user info from contract
      const user = await gameContract.methods.users(userAddress).call();
      setUserInfo(user);
      setIsRegistered(user.isRegistered);
      const rewards = Web3.utils.fromWei(user.pendingRewards, 'ether');
      setPendingRewards(rewards);

      console.log('User registered:', user.isRegistered);
      console.log('Pending rewards:', rewards);

    } catch (error) {
      console.error('Failed to load user data:', error);
      // Set default values on error
      setTokenBalance('0');
      setIsRegistered(false);
      setPendingRewards('0');
    }
  };

  // Load contract balance (奖池余额)
  const loadContractBalance = async (gameContract, token) => {
    try {
      // 获取合约地址
      const contractAddress = gameContract.options.address;
      console.log('Getting contract balance for:', contractAddress);

      // 获取合约的代币余额
      const balance = await token.methods.balanceOf(contractAddress).call();
      const balanceInEther = Web3.utils.fromWei(balance, 'ether');
      setContractBalance(balanceInEther);
      console.log('Contract balance (奖池):', balanceInEther, 'XLC');
    } catch (error) {
      console.error('Error loading contract balance:', error);
      setContractBalance('0');
    }
  };

  // Register user
  const registerUser = async () => {
    if (!nickname.trim()) {
      alert('Please enter a nickname');
      return;
    }

    try {
      const gasPrice = await web3.eth.getGasPrice();
      await contract.methods.registerUser(nickname).send({
        from: account,
        gasPrice: gasPrice
      });
      setIsRegistered(true);
      setShowRegister(false);
      await loadUserData(account, contract, tokenContract);
      await loadContractBalance(contract, tokenContract);
      alert('Registration successful!');
    } catch (error) {
      console.error('Registration failed:', error);
      alert('Registration failed. Please try again.');
    }
  };

  // Approve tokens for contract
  const approveTokens = async (amount) => {
    try {
      const amountWei = Web3.utils.toWei(amount.toString(), 'ether');

      // Get gas price for XLayer network (doesn't support EIP-1559)
      const gasPrice = await web3.eth.getGasPrice();

      await tokenContract.methods.approve(CONTRACT_CONFIG.address, amountWei).send({
        from: account,
        gasPrice: gasPrice
      });
      return true;
    } catch (error) {
      console.error('Token approval failed:', error);
      return false;
    }
  };

  // Check token allowance
  const checkAllowance = async (amount) => {
    try {
      const amountWei = Web3.utils.toWei(amount.toString(), 'ether');
      const allowance = await tokenContract.methods.allowance(account, CONTRACT_CONFIG.address).call();
      // Convert to numbers for comparison (safe for reasonable token amounts)
      return parseFloat(Web3.utils.fromWei(allowance, 'ether')) >= amount;
    } catch (error) {
      console.error('Failed to check allowance:', error);
      return false;
    }
  };

  // Spin the slots (real blockchain transaction)
  const spin = async () => {
    if (isSpinning) return;
    if (!isRegistered) {
      setShowRegister(true);
      return;
    }

    const betAmountFloat = parseFloat(betAmount);
    if (parseFloat(tokenBalance) < betAmountFloat) {
      alert('Insufficient token balance!');
      return;
    }

    setIsSpinning(true);

    // 播放转轮音效
    playSpinSound();

    try {
      // Check and approve tokens if needed
      const hasAllowance = await checkAllowance(betAmountFloat);
      if (!hasAllowance) {
        const approved = await approveTokens(betAmountFloat * 10); // Approve 10x for multiple games
        if (!approved) {
          setIsSpinning(false);
          return;
        }
      }

      // Start spinning animation
      const spinInterval = setInterval(() => {
        setSlots([
          SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)],
          SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)],
          SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)]
        ]);
      }, 100);

      // Play lottery on blockchain
      const betAmountWei = Web3.utils.toWei(betAmountFloat.toString(), 'ether');
      const gasPrice = await web3.eth.getGasPrice();

      console.log('Sending lottery transaction...');
      const tx = await contract.methods.playLottery(betAmountWei).send({
        from: account,
        gasPrice: gasPrice
      });

      console.log('Transaction completed:', tx);
      clearInterval(spinInterval);

      // Get transaction receipt to access events with retry mechanism
      let receipt = null;
      let retryCount = 0;
      const maxRetries = 10;

      while (!receipt && retryCount < maxRetries) {
        try {
          console.log(`Attempting to get receipt, try ${retryCount + 1}/${maxRetries}`);
          receipt = await web3.eth.getTransactionReceipt(tx.transactionHash);
          if (receipt) {
            console.log('Transaction receipt obtained:', receipt);
            break;
          }
        } catch (receiptError) {
          console.log(`Receipt attempt ${retryCount + 1} failed:`, receiptError.message);
        }

        // Wait 2 seconds before retry
        await new Promise(resolve => setTimeout(resolve, 2000));
        retryCount++;
      }

      if (!receipt) {
        console.log('Could not get transaction receipt after retries, using transaction hash only');
      }

      // Parse game result from transaction events
      let gameResult = null;

      // Method 1: Try to get events from receipt
      if (receipt && receipt.logs && receipt.logs.length > 0) {
        try {
          console.log('Parsing events from receipt logs...');

          // Decode the GamePlayed event
          const gamePlayedEventSignature = web3.utils.keccak256('GamePlayed(address,uint256,uint8[3],uint256,uint256,address)');
          const gamePlayedLog = receipt.logs.find(log => log.topics && log.topics[0] === gamePlayedEventSignature);

          if (gamePlayedLog) {
            console.log('Found GamePlayed event in logs');

            try {
              // Decode the event data
              const decoded = web3.eth.abi.decodeLog([
                { type: 'address', name: 'player', indexed: true },
                { type: 'uint256', name: 'gameId', indexed: true },
                { type: 'uint8[3]', name: 'symbols' },
                { type: 'uint256', name: 'betAmount' },
                { type: 'uint256', name: 'winAmount' },
                { type: 'address', name: 'tokenContract' }
              ], gamePlayedLog.data, gamePlayedLog.topics.slice(1));

              console.log('Decoded event data:', decoded);

              const symbols = decoded.symbols.map(symbolIndex => SYMBOLS[parseInt(symbolIndex)]);
              const winAmount = Web3.utils.fromWei(decoded.winAmount, 'ether');

              setSlots(symbols);

              gameResult = {
                id: Date.now(),
                bet: betAmountFloat,
                result: symbols,
                win: parseFloat(winAmount),
                timestamp: new Date().toLocaleTimeString(),
                txHash: tx.transactionHash,
                isWin: parseFloat(winAmount) > 0
              };

              console.log('Game result from receipt:', gameResult);

            } catch (decodeError) {
              console.error('Error decoding event data:', decodeError);
            }
          } else {
            console.log('GamePlayed event not found in receipt logs');
          }
        } catch (receiptParseError) {
          console.error('Error parsing receipt logs:', receiptParseError);
        }
      }

      // Method 2: Fallback - query recent events
      if (!gameResult) {
        console.log('Fallback: querying recent events...');
        try {
          const currentBlock = await web3.eth.getBlockNumber();
          const events = await contract.getPastEvents('GamePlayed', {
            filter: { player: account },
            fromBlock: Number(currentBlock) - 5,
            toBlock: 'latest'
          });

          console.log('Recent events found:', events.length);

          if (events.length > 0) {
            const latestEvent = events[events.length - 1];
            const symbols = latestEvent.returnValues.symbols.map(symbolIndex => SYMBOLS[parseInt(symbolIndex)]);
            const winAmount = Web3.utils.fromWei(latestEvent.returnValues.winAmount, 'ether');

            setSlots(symbols);

            gameResult = {
              id: Date.now(),
              bet: betAmountFloat,
              result: symbols,
              win: parseFloat(winAmount),
              timestamp: new Date().toLocaleTimeString(),
              txHash: tx.transactionHash,
              isWin: parseFloat(winAmount) > 0
            };

            console.log('Game result from events:', gameResult);
          }
        } catch (eventError) {
          console.error('Error querying events:', eventError);
        }
      }

      // Show result or create fallback
      if (gameResult) {
        // Add to history and show result
        setGameHistory(prev => [gameResult, ...prev.slice(0, 9)]);
        setGameResult(gameResult);
        setShowResult(true);

        // 播放对应的音效
        console.log('🎮 游戏结果:', { isWin: gameResult.isWin, win: gameResult.win, bet: gameResult.bet });
        if (gameResult.isWin) {
          // 中奖音效 (暂停BGM，播放win.mp3)
          console.log('🎉 调用中奖音效');
          playWinSound();
        } else {
          // 未中奖音效 (暂停BGM，播放lose.mp3)
          console.log('😔 调用未中奖音效');
          playLoseSound();
        }
      } else {
        // Fallback: show a generic result
        console.log('No event data found, showing generic result');
        const randomSymbols = [
          SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)],
          SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)],
          SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)]
        ];
        setSlots(randomSymbols);

        // Create a fallback result
        const fallbackResult = {
          id: Date.now(),
          bet: betAmountFloat,
          result: randomSymbols,
          win: 0,
          timestamp: new Date().toLocaleTimeString(),
          txHash: tx.transactionHash,
          isWin: false
        };

        setGameHistory(prev => [fallbackResult, ...prev.slice(0, 9)]);
        setGameResult(fallbackResult);
        setShowResult(true);
      }

      // Reload user data and contract balance
      await loadUserData(account, contract, tokenContract);
      await loadContractBalance(contract, tokenContract);

    } catch (error) {
      console.error('Game failed:', error);
      alert('Game failed. Please try again.');
    } finally {
      setIsSpinning(false);
    }
  };

  // Claim rewards
  const claimRewards = async () => {
    if (parseFloat(pendingRewards) <= 0) {
      alert('No rewards to claim');
      return;
    }

    try {
      const gasPrice = await web3.eth.getGasPrice();
      await contract.methods.claimRewards().send({
        from: account,
        gasPrice: gasPrice
      });
      await loadUserData(account, contract, tokenContract);
      await loadContractBalance(contract, tokenContract);
      alert('Rewards claimed successfully!');
    } catch (error) {
      console.error('Failed to claim rewards:', error);
      alert('Failed to claim rewards. Please try again.');
    }
  };

  return (
    <div className="min-h-screen bg-okx-black text-okx-white">
      {/* 音频管理器 */}
      <AudioManager
        ref={audioManagerRef}
        isPlaying={isBgmPlaying}
        onToggle={() => setIsBgmPlaying(!isBgmPlaying)}
      />

      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-6xl font-bold mb-2 text-okx-white flex items-center justify-center gap-4">
            <img
              src="/xlayerslot/audio/logo.png"
              alt="XLayer Slot Logo"
              className="w-16 h-16 object-contain"
            />
            XLayer Slot
          </h1>
          <p className="text-xl text-okx-muted">Blockchain Casino Game</p>
          {account && (
            <div className="mt-4 flex flex-col items-center space-y-2">
              <div className="bg-green-500/20 border border-green-500/50 rounded-full px-4 py-2 flex items-center space-x-2">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-sm text-green-400 font-medium">Connected to XLayer</span>
              </div>
              <div className="flex items-center space-x-3 bg-okx-dark/50 rounded-lg px-4 py-2 border border-okx-border">
                <div className="flex items-center space-x-2">
                  <span className="text-xs text-okx-muted">Wallet:</span>
                  <span className="text-sm text-okx-text font-mono">{account.slice(0, 6)}...{account.slice(-4)}</span>
                </div>
                <button
                  onClick={disconnectWallet}
                  className="text-xs bg-red-500/20 hover:bg-red-500/30 text-red-400 px-2 py-1 rounded border border-red-500/30 transition-colors"
                >
                  Disconnect
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Main Game Area */}
        <div className="max-w-md mx-auto">
          {/* Wallet Connection */}
          {!account ? (
            <div className="bg-okx-dark rounded-2xl p-6 mb-6 border border-okx-border">
              <div className="text-center mb-4">
                <h3 className="text-lg font-semibold mb-2 text-okx-white">Connect to XLayer Network</h3>
                <p className="text-sm text-okx-muted">Connect your MetaMask wallet to start playing</p>

                {/* RPC Selection Tip */}
                <div className="mt-4 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                  <p className="text-xs text-yellow-400 mb-2">💡 <strong>Tip:</strong> If you see "Choose RPC" dialog:</p>
                  <p className="text-xs text-yellow-300">Select <strong>https://rpc.xlayer.tech</strong> for best performance</p>
                </div>
              </div>

              {connectionError && (
                <div className="mb-4 p-3 bg-red-900/20 border border-red-500/30 rounded-lg">
                  <p className="text-sm text-red-400">{connectionError}</p>
                </div>
              )}

              <button
                onClick={connectWallet}
                disabled={isConnecting}
                className={`w-full font-bold py-4 px-6 rounded-xl transition-all duration-300 transform ${
                  isConnecting
                    ? 'bg-okx-light-gray text-okx-muted cursor-not-allowed'
                    : 'bg-okx-white hover:bg-okx-text text-okx-black hover:scale-105'
                }`}
              >
                {isConnecting ? '🔄 Connecting...' : '🔗 Connect Wallet'}
              </button>
            </div>
          ) : !isRegistered ? (
            <div className="bg-okx-dark rounded-2xl p-6 mb-6 border border-okx-border">
              <div className="text-center mb-4">
                <h3 className="text-lg font-semibold mb-2 text-okx-white">Register to Play</h3>
                <p className="text-sm text-okx-muted">Create your player profile to start playing</p>
              </div>
              <div className="mb-4">
                <input
                  type="text"
                  placeholder="Enter your nickname"
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  className="w-full px-4 py-3 bg-okx-gray border border-okx-border rounded-lg text-okx-white placeholder-okx-muted focus:outline-none focus:border-okx-white"
                  maxLength={50}
                />
              </div>
              <button
                onClick={registerUser}
                disabled={!nickname.trim()}
                className={`w-full py-3 px-6 rounded-xl font-bold transition-all duration-300 ${
                  nickname.trim()
                    ? 'bg-okx-white hover:bg-okx-text text-okx-black'
                    : 'bg-okx-light-gray text-okx-muted cursor-not-allowed'
                }`}
              >
                🎮 Register & Play
              </button>
            </div>
          ) : (
            <>
              {/* Slot Machine */}
              <div className="bg-okx-dark rounded-2xl p-6 mb-6 border border-okx-border">
                <div className="bg-okx-gray rounded-xl p-4 mb-4 border border-okx-border">
                  <div className="flex justify-center space-x-4">
                    {slots.map((symbol, index) => (
                      <div
                        key={index}
                        className={`w-20 h-20 bg-okx-black rounded-lg flex items-center justify-center text-4xl border-2 border-okx-border ${
                          isSpinning ? 'slot-spinning' : ''
                        }`}
                      >
                        {symbol}
                      </div>
                    ))}
                  </div>
                  <div className="text-center mt-4">
                    <div className="text-sm text-okx-muted">Reel 1 &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; Reel 2 &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; Reel 3</div>
                  </div>
                </div>

                {/* Balance Display */}
                <div className="space-y-2 mb-4">
                  <div className="flex justify-between items-center">
                    <span className="text-okx-text">Token Balance:</span>
                    <span className="text-xl font-bold text-okx-white">{parseFloat(tokenBalance).toFixed(2)} XLC</span>
                  </div>
                  {parseFloat(pendingRewards) > 0 && (
                    <div className="flex justify-between items-center">
                      <span className="text-okx-text">Pending Rewards:</span>
                      <div className="flex items-center space-x-2">
                        <span className="text-lg font-bold text-okx-white">{parseFloat(pendingRewards).toFixed(2)} XLC</span>
                        <button
                          onClick={claimRewards}
                          className="text-xs bg-okx-white hover:bg-okx-text text-okx-black px-2 py-1 rounded transition-colors"
                        >
                          Claim
                        </button>
                      </div>
                    </div>
                  )}
                  <div className="text-sm text-white pt-2 border-t border-okx-border">
                    <div className="flex items-center justify-center gap-2">
                      <span>🏆</span>
                      <span>Prize Pool: {contractBalance} XLC</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Betting Controls */}
              <div className="bg-okx-dark rounded-2xl p-6 mb-6 border border-okx-border">
                <h3 className="text-lg font-semibold mb-4 text-okx-white">Bet Amount (XLC)</h3>
                <div className="mb-4">
                  <div className="flex justify-between text-sm text-okx-muted mb-2">
                    <span>Min: {BET_AMOUNTS[0]} XLC</span>
                    <span>Max: {BET_AMOUNTS[BET_AMOUNTS.length - 1]} XLC</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 mb-4">
                  {BET_AMOUNTS.map(amount => (
                    <button
                      key={amount}
                      onClick={() => setBetAmount(amount)}
                      className={`py-2 px-4 rounded-lg font-semibold transition-all duration-200 text-sm ${
                        betAmount === amount
                          ? 'bg-okx-white text-okx-black'
                          : 'bg-okx-gray text-okx-white hover:bg-okx-light-gray border border-okx-border'
                      }`}
                    >
                      {amount >= 1000000 ? `${(amount / 1000000).toFixed(1)}M` :
                       amount >= 1000 ? `${(amount / 1000)}K` : amount}
                    </button>
                  ))}
                </div>

                <button
                  onClick={spin}
                  disabled={isSpinning || parseFloat(tokenBalance) < betAmount}
                  className={`w-full py-4 px-6 rounded-xl font-bold text-xl transition-all duration-300 transform ${
                    isSpinning || parseFloat(tokenBalance) < betAmount
                      ? 'bg-okx-light-gray text-okx-muted cursor-not-allowed'
                      : 'bg-okx-white hover:bg-okx-text text-okx-black hover:scale-105'
                  }`}
                >
                  {isSpinning ? 'Spinning...' :
                   `Spin (${betAmount >= 1000000 ? `${(betAmount / 1000000).toFixed(1)}M` :
                            betAmount >= 1000 ? `${(betAmount / 1000)}K` : betAmount} XLC)`}
                </button>
              </div>

              {/* Payout Table */}
              <div className="bg-okx-dark rounded-2xl p-6 mb-6 border border-okx-border">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold text-okx-white">Payout Table</h3>
                  <button
                    onClick={() => setShowPayouts(!showPayouts)}
                    className="text-okx-white hover:text-okx-text transition-colors"
                  >
                    {showPayouts ? '▼' : '▶'}
                  </button>
                </div>

                {showPayouts && (
                  <div className="space-y-2">
                    <div className="grid grid-cols-2 gap-4">
                      {Object.entries(PAYOUTS).map(([symbol, multiplier]) => (
                        <div key={symbol} className="bg-okx-gray rounded-lg p-3 flex items-center justify-between border border-okx-border">
                          <div className="flex items-center space-x-2">
                            <span className="text-2xl">{symbol}</span>
                          </div>
                          <span className="text-okx-white font-semibold">{multiplier}x</span>
                        </div>
                      ))}
                    </div>
                    <p className="text-xs text-okx-muted mt-4">
                      * Match 3 identical symbols to win. Payout = bet × multiplier
                    </p>
                  </div>
                )}
              </div>

              {/* Game History */}
              <div className="bg-okx-dark rounded-2xl p-6 border border-okx-border">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold flex items-center text-okx-white">
                    🎲 Game History
                  </h3>
                  <button
                    onClick={() => setGameHistory([])}
                    className="text-sm bg-okx-gray hover:bg-okx-light-gray text-okx-white px-3 py-1 rounded-lg transition-colors border border-okx-border"
                  >
                    Clear
                  </button>
                </div>

                {gameHistory.length === 0 ? (
                  <div className="text-center py-8">
                    <div className="text-6xl mb-4">🎲</div>
                    <p className="text-okx-text">No game history</p>
                    <p className="text-sm text-okx-muted">Start playing to see your results!</p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {gameHistory.map((game) => (
                      <div key={game.id} className="bg-okx-gray rounded-lg p-3 border border-okx-border">
                        <div className="flex justify-between items-center">
                          <div className="flex items-center space-x-2">
                            <div className="flex space-x-1">
                              {game.result.map((symbol, index) => (
                                <span key={index} className="text-lg">{symbol}</span>
                              ))}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-sm text-okx-muted">Bet: {game.bet} XLC</div>
                            {game.win > 0 ? (
                              <div className="text-okx-white font-semibold">+{game.win} XLC</div>
                            ) : (
                              <div className="text-okx-muted">-{game.bet} XLC</div>
                            )}
                          </div>
                        </div>
                        <div className="flex justify-between items-center text-xs text-okx-muted mt-1">
                          <span>{game.timestamp}</span>
                          {game.txHash && (
                            <a
                              href={`https://www.oklink.com/xlayer/tx/${game.txHash}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-okx-white hover:text-okx-text"
                            >
                              View TX
                            </a>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Registration Modal */}
      {showRegister && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-okx-dark p-8 rounded-2xl border border-okx-border max-w-md w-full mx-4">
            <h2 className="text-2xl font-bold text-okx-white mb-6 text-center">Register to Play</h2>
            <input
              type="text"
              placeholder="Enter your nickname"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              className="w-full p-4 rounded-lg bg-okx-gray text-okx-white border border-okx-border mb-6"
            />
            <div className="flex gap-4">
              <button
                onClick={() => setShowRegister(false)}
                className="flex-1 py-3 px-6 rounded-lg bg-okx-gray text-okx-white hover:bg-okx-light-gray transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={registerUser}
                className="flex-1 py-3 px-6 rounded-lg bg-okx-white text-okx-black hover:bg-okx-text transition-colors"
              >
                Register
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Game Result Modal */}
      {showResult && gameResult && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50">
          <div className="relative bg-black border-2 border-yellow-400 p-8 rounded-3xl max-w-md w-full mx-4 shadow-2xl">
            {/* Close button */}
            <button
              onClick={() => setShowResult(false)}
              className="absolute top-4 right-4 text-white hover:text-gray-300 text-2xl font-bold"
            >
              ×
            </button>

            {/* Celebration icon and title */}
            <div className="text-center mb-6">
              <div className="text-6xl mb-4">
                {gameResult.isWin ? '🎉' : '🎰'}
              </div>
              <h2 className="text-2xl font-bold text-yellow-300 mb-2">
                {gameResult.isWin ? 'Congratulations!' : 'Game Result'}
              </h2>
            </div>

            {/* Slot results */}
            <div className="flex justify-center gap-4 mb-6">
              {gameResult.result.map((symbol, index) => (
                <div key={index} className="relative">
                  <div className="w-16 h-16 bg-white bg-opacity-20 rounded-lg flex items-center justify-center text-3xl border-2 border-yellow-400">
                    {symbol}
                  </div>
                  {gameResult.isWin && (
                    <div className="absolute -top-2 -right-2 w-6 h-6 bg-yellow-400 rounded-full flex items-center justify-center">
                      <span className="text-black text-sm font-bold">✓</span>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Game details */}
            <div className="space-y-3 mb-6">
              <div className="flex justify-between items-center">
                <span className="text-white text-sm font-medium">Bet Amount:</span>
                <span className="text-white font-bold text-lg">
                  {gameResult.bet >= 1000000 ? `${(gameResult.bet / 1000000).toFixed(1)}M` :
                   gameResult.bet >= 1000 ? `${(gameResult.bet / 1000)}K` : gameResult.bet} XLC
                </span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-white text-sm font-medium">Win Amount:</span>
                <span className={`font-bold text-lg ${gameResult.isWin ? 'text-green-400' : 'text-white'}`}>
                  {gameResult.win > 0 ?
                    `${gameResult.win >= 1000000 ? `${(gameResult.win / 1000000).toFixed(1)}M` :
                      gameResult.win >= 1000 ? `${(gameResult.win / 1000)}K` : gameResult.win} XLC` :
                    '0 XLC'}
                </span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-white text-sm font-medium">Net Profit:</span>
                <span className={`font-bold text-lg ${gameResult.win > gameResult.bet ? 'text-green-400' : 'text-red-400'}`}>
                  {(gameResult.win - gameResult.bet) >= 0 ? '+' : ''}{(gameResult.win - gameResult.bet).toFixed(0)} XLC
                </span>
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex gap-3">
              <button
                onClick={() => setShowResult(false)}
                className="flex-1 py-3 px-6 rounded-xl bg-gray-600 hover:bg-gray-700 text-white font-semibold transition-colors"
              >
                Continue Game
              </button>
              <button
                onClick={() => {
                  setShowResult(false);
                  // Could add share functionality here
                }}
                className="flex-1 py-3 px-6 rounded-xl bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white font-semibold transition-colors flex items-center justify-center gap-2"
              >
                Share Result 🚀
              </button>
            </div>

            {/* Lucky message */}
            <div className="text-center mt-4">
              <p className="text-green-400 text-sm flex items-center justify-center gap-2">
                🍀 {gameResult.isWin ? 'Lucky you! Keep playing!' : 'Better luck next time!'}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
