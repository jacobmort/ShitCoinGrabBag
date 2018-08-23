var shitCoinGrabBag = artifacts.require("./ShitCoinGrabBag.sol");

contract('ShitCoinGrabBag', function(accounts) {
  let shitCoinGrabBagInstance;
  const owner    = accounts[0];
  const nonOwner = accounts[1];

  async function tryCatch(promise, errType) {
    try {
        await promise;
        throw null;
    }
    catch (error){
        assert(error.message.startsWith(PREFIX + errType), "Expected an error starting with '" + PREFIX + errType + "' but got '" + error.message + "' instead");
    }
  }

  let errTypes = {
    revert            : "revert",
    outOfGas          : "out of gas",
    invalidJump       : "invalid JUMP",
    invalidOpcode     : "invalid opcode",
    stackOverflow     : "stack overflow",
    stackUnderflow    : "stack underflow",
    staticStateChange : "static state change"
  };

let PREFIX = "VM Exception while processing transaction: ";

  describe("registerToken:", function() {
    before(async function() {
      shitCoinGrabBagInstance = await shitCoinGrabBag.deployed();
    });

    it('sets owner address', async function() {
      assert.equal(await shitCoinGrabBagInstance.owner(), accounts[0]);
    });

    it("successful if called by an owner and sets balance", async function() {
      let balance = await shitCoinGrabBagInstance.getTokenBalance(accounts[2]);
      assert(balance.equals(0));
      await shitCoinGrabBagInstance.registerToken(accounts[2], 1, {from: owner});
      balance = await shitCoinGrabBagInstance.getTokenBalance(accounts[2]);
      assert(balance.equals(1));
    });

    it("abort if call causes overflow", async function() {
      await tryCatch(shitCoinGrabBagInstance.registerToken(accounts[2], Math.pow(2,256), {from: owner}), errTypes.revert);
    });

    it("abort with an error if negative number", async function() {
      await tryCatch(shitCoinGrabBagInstance.registerToken(accounts[2], -1, {from: nonOwner}), errTypes.revert);
    });

    it("abort with an error if called by a non-owner", async function() {
      await tryCatch(shitCoinGrabBagInstance.registerToken(accounts[2], 1, {from: nonOwner}), errTypes.revert);
    });

    it("abort with an error if called by a non-owner", async function() {
      await tryCatch(shitCoinGrabBagInstance.registerToken(accounts[2], 1, {from: nonOwner}), errTypes.revert);
    });

    it("abort with an error if called with empty address", async function() {
      await tryCatch(shitCoinGrabBagInstance.registerToken("0x0", 1, {from: owner}), errTypes.revert);
    });
  });
});
