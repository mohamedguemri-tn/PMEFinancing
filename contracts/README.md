# SME Financing Platform - Smart Contracts

Solidity smart contracts for blockchain-based SME financing platform using Truffle and Ethereum-compatible networks.

## Features

- **FinancingToken**: ERC20 token for platform transactions
- **LoanPool**: Core contract managing SME loans and repayments
- **Truffle Framework**: Development, testing, and deployment
- **OpenZeppelin Contracts**: Battle-tested contract libraries
- **Multi-chain Support**: Ethereum, BSC, and other EVM networks

## Project Structure

```
contracts/
├── contracts/              # Solidity smart contracts
│   ├── FinancingToken.sol
│   └── LoanPool.sol
├── migrations/             # Deployment scripts
├── test/                   # Test files
├── truffle-config.js       # Truffle configuration
└── package.json            # Dependencies
```

## Prerequisites

- Node.js v14+ and npm
- Truffle: `npm install -g truffle`
- Ganache CLI: `npm install -g ganache-cli`

## Installation

```bash
cd contracts
npm install
```

## Compilation

```bash
npm run compile
```

## Testing

Start Ganache in one terminal:
```bash
npm run ganache
```

Run tests in another terminal:
```bash
npm test
```

## Deployment

### Local Development (Ganache)

```bash
npm run migrate
```

### BSC Testnet

```bash
# Set environment variables
export MNEMONIC="your wallet mnemonic"

npm run bsc-testnet
```

### Ethereum Sepolia Testnet

```bash
# Set environment variables
export MNEMONIC="your wallet mnemonic"
export INFURA_KEY="your infura key"

npm run ethereum-sepolia
```

## Smart Contracts

### FinancingToken (ERC20)
- Mintable ERC20 token
- Burnable token support
- Owner-based access control
- Base unit: 18 decimals

### LoanPool
- Create loans for borrowers
- Track loan repayments
- Calculate interest accrual
- Prevent reentrancy attacks
- Events for loan lifecycle

## Verification

After deployment, verify contracts on blockchain explorers:

```bash
truffle run verify FinancingToken --network bsc_testnet
truffle run verify LoanPool --network bsc_testnet
```

## Environment Variables

Create a `.env` file:

```
MNEMONIC=your_wallet_mnemonic_here
INFURA_KEY=your_infura_api_key
ETHERSCAN_API_KEY=your_etherscan_api_key
BSCSCAN_API_KEY=your_bscscan_api_key
```

## Important Security Notes

- Smart contracts are provided as examples
- Conduct full security audit before mainnet deployment
- Use Slither or similar tools for contract analysis
- Implement timelock for critical functions
- Consider formal verification for critical contracts

## Technologies Used

- **Solidity**: v0.8.19
- **Truffle**: v5.11+
- **OpenZeppelin Contracts**: v5.0
- **Ganache**: Local blockchain simulation
- **Ethereum**: EVM-compatible networks
