var DummyErc20 = artifacts.require("./DummyErc20.sol");
var ShitCoinGrabBag = artifacts.require("./ShitCoinGrabBag.sol");

module.exports = function(deployer) {
  deployer.deploy(DummyErc20, 100000000000000000000, "erctwenty", 18, "sht"); // 100 tokens
  deployer.deploy(ShitCoinGrabBag);
};
