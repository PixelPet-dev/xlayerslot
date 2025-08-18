import React from 'react';

const WalletConnection = ({ onConnect }) => {
  return (
    <div className="max-w-md mx-auto text-center">
      <div className="slot-frame p-8">
        <div className="slot-symbol text-8xl mb-6">🎰</div>

        <h2 className="text-4xl font-bold text-yellow-400 neon-text mb-4 pixel-text">
         XLuckyCoin
        </h2>

        <p className="text-green-400 pixel-text text-sm mb-8">
          CONNECT YOUR WALLET TO START PLAYING
        </p>

        <button
          onClick={onConnect}
          className="w-full retro-button bg-gradient-to-r from-yellow-500 to-orange-500 text-lg py-4 mb-8"
        >
          CONNECT WALLET
        </button>

        <div className="space-y-4">
          <div className="retro-card bg-blue-600 bg-opacity-20 p-4">
            <h3 className="font-semibold text-blue-200 mb-3 pixel-text text-xs">NETWORK INFO</h3>
            <div className="pixel-text text-xs text-blue-100 space-y-2">
              <div className="flex justify-between">
                <span>NETWORK:</span>
                <span>X LAYER</span>
              </div>
              <div className="flex justify-between">
                <span>CHAIN ID:</span>
                <span>196</span>
              </div>
              <div className="flex justify-between">
                <span>GAS TOKEN:</span>
                <span>OKB</span>
              </div>
            </div>
          </div>

          <div className="retro-card bg-green-600 bg-opacity-20 p-4">
            <h3 className="font-semibold text-green-200 mb-3 pixel-text text-xs">SUPPORTED WALLETS</h3>
            <div className="pixel-text text-xs text-green-100 space-y-1">
              <div>• METAMASK</div>
              <div>• OKX WALLET</div>
              <div>• TRUST WALLET</div>
              <div>• OTHER WEB3 WALLETS</div>
            </div>
          </div>

          <div className="retro-card bg-yellow-600 bg-opacity-20 p-4">
            <h3 className="font-semibold text-yellow-200 mb-3 pixel-text text-xs">🎮 GAME RULES</h3>
            <div className="pixel-text text-xs text-yellow-100 space-y-1">
              <div>• USE TOKENS TO PLAY SLOTS</div>
              <div>• WIN REWARDS FOR MATCHES</div>
              <div>• CLAIM REWARDS ANYTIME</div>
              <div>• FAIR & TRANSPARENT SMART CONTRACT</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WalletConnection;
