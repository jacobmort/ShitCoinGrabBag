var SimpleStorage = artifacts.require("./SimpleStorage.sol");
var DummyErc20 = artifacts.require("./DummyErc20.sol");
var ShitCoinGrabBag = artifacts.require("./ShitCoinGrabBag.sol");

module.exports = function(deployer) {
  deployer.deploy(SimpleStorage);
  // deployer.deploy(DummyErc20);
  deployer.deploy(ShitCoinGrabBag);
};
