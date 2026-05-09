const { ethers } = require('ethers');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

/**
 * Script to print test wallets from Ganache mnemonic and save them to a JSON file.
 */
async function main() {
  const mnemonic = process.env.GANACHE_MNEMONIC;
  
  if (!mnemonic) {
    console.error('\nERROR: GANACHE_MNEMONIC not found in .env');
    console.log('Please create a .env file at the root with:');
    console.log('GANACHE_MNEMONIC="your mnemonic here..."\n');
    process.exit(1);
  }

  const roles = ['GOVERNOR', 'PME', 'INVESTOR', 'GUARANTOR'];
  const outputData = {};

  console.log('\n====== BLOCKFIN PME — TEST WALLETS ======\n');

  try {
    for (let i = 0; i < 4; i++) {
      const derivationPath = `m/44'/60'/0'/0/${i}`;
      const wallet = ethers.HDNodeWallet.fromPhrase(mnemonic, '', derivationPath);

      console.log(`[${i}] ${roles[i]}`);
      console.log(`    Address : ${wallet.address}`);
      console.log(`    Key     : ${wallet.privateKey}   ← paste in MetaMask\n`);

      const keyName = roles[i].charAt(0).toUpperCase() + roles[i].slice(1).toLowerCase();
      outputData[keyName] = wallet.address;
    }
  } catch (error) {
    console.error('\nERROR: Failed to derive wallets. Check if your mnemonic is valid.');
    console.error(error.message);
    process.exit(1);
  }

  console.log('=========================================');
  console.log('TIP: In MetaMask → Import account → paste the private key');
  console.log('TIP: Copy addresses to appsettings.Development.json TestWallets section\n');

  // Ensure output directory exists
  const outputDir = path.join(__dirname, 'output');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const outputPath = path.join(outputDir, 'test-wallets.json');
  fs.writeFileSync(outputPath, JSON.stringify(outputData, null, 2));
  
  console.log(`Addresses saved to: scripts/output/test-wallets.json\n`);
}

main().catch((error) => {
  console.error('\nAn unexpected error occurred:');
  console.error(error);
  process.exit(1);
});
