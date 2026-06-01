const FinancingToken = artifacts.require("FinancingToken");
const LoanPool = artifacts.require("LoanPool");

module.exports = function(deployer) {
  // Deploy FinancingToken first
  deployer.deploy(FinancingToken, "SME Financing Token", "SMEF", web3.utils.toWei("1000000", "ether"))
    .then(() => {
      // Deploy LoanPool with FinancingToken address
      return deployer.deploy(LoanPool, FinancingToken.address);
    });
};
