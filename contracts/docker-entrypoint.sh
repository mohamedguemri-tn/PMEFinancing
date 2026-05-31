#!/bin/sh
set -e

MNEMONIC="candy maple cake sugar pudding cream honey rich smooth alcohol ivory utility"

echo "Starting Ganache..."
ganache \
  --mnemonic "$MNEMONIC" \
  --defaultBalanceEther 1000 \
  --port 8545 \
  --host 0.0.0.0 &

echo "Waiting for Ganache to be ready..."
sleep 5

echo "Running migrations..."
truffle migrate --reset --network development

echo "Extracting contract addresses..."
node -e "
const rm = require('./build/contracts/RoleManager.json');
const at = require('./build/contracts/AssetToken.json');
const lm = require('./build/contracts/LoanManager.json');
const networkId = Object.keys(rm.networks)[0];
console.log(JSON.stringify({
  RoleManagerAddress: rm.networks[networkId].address,
  AssetTokenAddress: at.networks[networkId].address,
  LoanManagerAddress: lm.networks[networkId].address
}));
" > /shared/contract-addresses.json

echo "Contract addresses written to /shared/contract-addresses.json"
cat /shared/contract-addresses.json

echo "Ganache ready. Keeping container alive..."
tail -f /dev/null
