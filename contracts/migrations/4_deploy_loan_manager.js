const RoleManager = artifacts.require("RoleManager");
const AssetToken = artifacts.require("AssetToken");
const LoanManager = artifacts.require("LoanManager");

module.exports = async function (deployer) {
  const roleManager = await RoleManager.deployed();
  const assetToken = await AssetToken.deployed();

  await deployer.deploy(LoanManager, roleManager.address, assetToken.address);
};
