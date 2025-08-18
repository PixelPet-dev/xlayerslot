import React, { useState } from 'react';
import Web3Config from '../config/web3';

const ContractTest = () => {
  const [testResults, setTestResults] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  const addResult = (test, result, error = null) => {
    setTestResults(prev => [...prev, { test, result, error, timestamp: new Date().toLocaleTimeString() }]);
  };

  const runTests = async () => {
    setIsLoading(true);
    setTestResults([]);

    try {
      // 测试 1: Web3 连接
      addResult('Web3 连接', '开始测试...');
      const web3 = Web3Config.getWeb3();
      const isConnected = web3.currentProvider !== null;
      addResult('Web3 连接', isConnected ? '✅ 成功' : '❌ 失败');

      // 测试 2: 网络连接
      addResult('网络检查', '检查中...');
      try {
        const chainId = await web3.eth.getChainId();
        addResult('网络检查', `✅ 连接到链 ID: ${chainId}`);
      } catch (error) {
        addResult('网络检查', '❌ 失败', error.message);
      }

      // 测试 3: 合约地址
      addResult('合约地址', `📍 ${Web3Config.CONTRACT_CONFIG.address}`);

      // 测试 4: 合约连接
      addResult('合约连接', '测试中...');
      try {
        const contract = new web3.eth.Contract(
          Web3Config.CONTRACT_CONFIG.abi,
          Web3Config.CONTRACT_CONFIG.address
        );
        addResult('合约连接', '✅ 合约实例创建成功');

        // 测试 5: 合约方法调用
        addResult('合约方法测试', '调用 isActive()...');
        try {
          const isActive = await contract.methods.isActive().call();
          addResult('合约方法测试', `✅ isActive: ${isActive}`);
        } catch (error) {
          addResult('合约方法测试', '❌ 调用失败', error.message);
        }

        // 测试 6: 游戏配置
        addResult('游戏配置', '获取中...');
        try {
          const minBet = await contract.methods.minBet().call();
          const maxBet = await contract.methods.maxBet().call();
          addResult('游戏配置', `✅ 最小下注: ${minBet}, 最大下注: ${maxBet}`);
        } catch (error) {
          addResult('游戏配置', '❌ 获取失败', error.message);
        }

        // 测试 7: 事件查询
        addResult('事件查询', '查询最近事件...');
        try {
          const currentBlock = await web3.eth.getBlockNumber();
          const fromBlock = Math.max(0, Number(currentBlock) - 100);
          
          const events = await contract.getPastEvents('GamePlayed', {
            fromBlock: fromBlock,
            toBlock: 'latest'
          });
          
          addResult('事件查询', `✅ 找到 ${events.length} 个 GamePlayed 事件`);
        } catch (error) {
          addResult('事件查询', '❌ 查询失败', error.message);
        }

      } catch (error) {
        addResult('合约连接', '❌ 失败', error.message);
      }

    } catch (error) {
      addResult('总体测试', '❌ 失败', error.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-white bg-opacity-10 backdrop-blur-lg rounded-2xl p-6 border border-white border-opacity-20">
      <h3 className="text-xl font-bold text-white mb-4">🔧 合约连接测试</h3>
      
      <button
        onClick={runTests}
        disabled={isLoading}
        className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white font-bold py-2 px-4 rounded mb-4"
      >
        {isLoading ? '测试中...' : '开始测试'}
      </button>

      <div className="space-y-2 max-h-96 overflow-y-auto">
        {testResults.map((result, index) => (
          <div key={index} className="bg-black bg-opacity-30 rounded p-3">
            <div className="flex justify-between items-start">
              <div>
                <div className="text-white font-medium">{result.test}</div>
                <div className={`text-sm ${result.error ? 'text-red-300' : 'text-green-300'}`}>
                  {result.result}
                </div>
                {result.error && (
                  <div className="text-xs text-red-400 mt-1">
                    错误: {result.error}
                  </div>
                )}
              </div>
              <div className="text-xs text-gray-400">
                {result.timestamp}
              </div>
            </div>
          </div>
        ))}
      </div>

      {testResults.length === 0 && !isLoading && (
        <div className="text-center text-gray-400 py-8">
          点击"开始测试"来检查合约连接状态
        </div>
      )}
    </div>
  );
};

export default ContractTest;
