const AssetToken  = artifacts.require("AssetToken");
const LoanManager = artifacts.require("LoanManager");
const RoleManager = artifacts.require("RoleManager");

module.exports = async function (deployer, network, accounts) {
  const governor = accounts[0];

  const assetToken  = await AssetToken.deployed();
  const loanManager = await LoanManager.deployed();
  const roleManager = await RoleManager.deployed();

  // Governor self-grant on all contracts (works on both development and Sepolia)
  const AT_GOVERNOR_ROLE = await assetToken.GOVERNOR();
  const LM_GOVERNOR_ROLE = await loanManager.GOVERNOR();
  const RM_GOVERNOR_ROLE = await roleManager.GOVERNOR();

  await assetToken.grantRole(AT_GOVERNOR_ROLE,  governor, { from: governor });
  await loanManager.grantRole(LM_GOVERNOR_ROLE, governor, { from: governor });
  await roleManager.grantRole(RM_GOVERNOR_ROLE, governor, { from: governor });

  console.log("✔ Governor role granted on all contracts:", governor);

  if (network === 'development') {
    // Demo accounts derived from the candy-maple mnemonic (Ganache only)
    const pme       = accounts[1]; // 0xD44f328a3887ECa9ef921FA490792d95f99c8906
    const investor  = accounts[2]; // 0xCe8AfFdBdbdc02151784037Dba132b6447Abe37A
    const guarantor = accounts[3]; // 0xc4b418aCF701CFd3bFdEfd688323442866222218

    const AT_PME_ROLE      = await assetToken.PME();
    const LM_PME_ROLE      = await loanManager.PME();
    const LM_INVESTOR_ROLE = await loanManager.INVESTOR();
    const RM_PME_ROLE      = await roleManager.PME();
    const RM_INVESTOR_ROLE = await roleManager.INVESTOR();
    const RM_GUARANTOR_ROLE = await roleManager.GUARANTOR();

    await assetToken.grantRole(AT_PME_ROLE,      pme,       { from: governor });
    await loanManager.grantRole(LM_PME_ROLE,     pme,       { from: governor });
    await loanManager.grantRole(LM_INVESTOR_ROLE, investor, { from: governor });
    await roleManager.grantRole(RM_PME_ROLE,      pme,       { from: governor });
    await roleManager.grantRole(RM_INVESTOR_ROLE, investor,  { from: governor });
    await roleManager.grantRole(RM_GUARANTOR_ROLE, guarantor, { from: governor });

    console.log("✔ Demo roles granted for local development:");
    console.log("  PME:      ", pme);
    console.log("  Investor: ", investor);
    console.log("  Guarantor:", guarantor);
  } else {
    console.log("ℹ Sepolia deployment — roles granted via Governor UI after user registration");
  }
};
