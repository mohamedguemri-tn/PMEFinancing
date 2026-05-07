const FinancingToken = artifacts.require("FinancingToken");
const LoanPool = artifacts.require("LoanPool");

contract("FinancingToken", (accounts) => {
  it("should deploy successfully", async () => {
    const token = await FinancingToken.deployed();
    assert(token.address !== 0x0);
  });

  it("should have correct name and symbol", async () => {
    const token = await FinancingToken.deployed();
    const name = await token.name();
    const symbol = await token.symbol();
    assert.equal(name, "SME Financing Token");
    assert.equal(symbol, "SMEF");
  });

  it("should have correct initial supply", async () => {
    const token = await FinancingToken.deployed();
    const totalSupply = await token.totalSupply();
    const expectedSupply = web3.utils.toWei("1000000", "ether");
    assert.equal(totalSupply.toString(), expectedSupply.toString());
  });
});

contract("LoanPool", (accounts) => {
  it("should deploy successfully", async () => {
    const loanPool = await LoanPool.deployed();
    assert(loanPool.address !== 0x0);
  });

  it("should track total loaned amount", async () => {
    const loanPool = await LoanPool.deployed();
    const totalLoaned = await loanPool.totalLoaned();
    assert.equal(totalLoaned.toNumber(), 0);
  });
});
