const AbortHelper = require('./AbortHelper');
const shitCoinGrabBag = artifacts.require("./ShitCoinGrabBag.sol");

contract('ShitCoinGrabBag', function(accounts) {
  let shitCoinGrabBagInstance;
  const owner    = accounts[0];
  const nonOwner = accounts[1];
  const contractAccount = accounts[2];

  before(async function() {
    shitCoinGrabBagInstance = await shitCoinGrabBag.deployed();
  });

  describe("chooseAToken:", function() {
    it("abort when no tokens", async function() {
      await AbortHelper.tryCatch(shitCoinGrabBagInstance.chooseAToken({from: owner}), "revert");
    });

    it("abort with an error if called by a non-owner", async function() {
      await AbortHelper.tryCatch(shitCoinGrabBagInstance.chooseAToken({from: nonOwner}), "revert");
    });
  });
});
