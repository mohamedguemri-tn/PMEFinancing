const RoleManager = artifacts.require("RoleManager");

module.exports = async function (deployer) {
  await deployer.deploy(RoleManager);
};
