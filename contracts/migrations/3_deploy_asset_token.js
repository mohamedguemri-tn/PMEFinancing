const RoleManager = artifacts.require("RoleManager");
const AssetToken = artifacts.require("AssetToken");

module.exports = async function (deployer) {
  const roleManager = await RoleManager.deployed();
  await deployer.deploy(AssetToken, roleManager.address);
};
