var DummyErc20 = artifacts.require("./DummyErc20.sol");
var ShitCoinGrabBag = artifacts.require("./ShitCoinGrabBag.sol");

module.exports = function(deployer) {
  if (process.env.NODE_ENV = 'development') {
    // Lets setup some dummy ERC 20s to play with
    deployer.deploy(DummyErc20, 100000000000000000000, "sht coin", 18, "sht"); // 100 tokens
    deployer.deploy(DummyErc20, 100000000000000000000, "poo coin", 18, "poo"); // 100 tokens
  }
  deployer.deploy(ShitCoinGrabBag);
};
