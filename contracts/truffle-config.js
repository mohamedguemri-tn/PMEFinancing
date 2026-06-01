require('dotenv').config();
const HDWalletProvider = require('@truffle/hdwallet-provider');

module.exports = {
  networks: {
    development: {
      host: "0.0.0.0",  // 0.0.0.0 so Ganache binds all interfaces inside Docker
      port: 8545,
      network_id: "*",
      gas: 6721975,
      gasPrice: 20000000000
    },
    sepolia: {
      provider: () => new HDWalletProvider(
        process.env.GOVERNOR_PRIVATE_KEY.replace(/^0x/, ''),
        process.env.SEPOLIA_RPC_URL
      ),
      network_id: 11155111,
      gas: 5500000,
      gasPrice: 3000000000,
      confirmations: 0,
      timeoutBlocks: 200,
      skipDryRun: true
    }
  },
  compilers: {
    solc: {
      version: "0.8.24",
      settings: {
        optimizer: {
          enabled: true,
          runs: 200
        }
      }
    }
  }
};
