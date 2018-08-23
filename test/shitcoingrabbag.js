var shitCoinGrabBag = artifacts.require("./ShitCoinGrabBag.sol");

contract('ShitCoinGrabBag', function(accounts) {
  let shitCoinGrabBagInstance;
  const owner    = accounts[0];
  const nonOwner = accounts[1];
  const contractAccount = accounts[2];

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

  before(async function() {
    shitCoinGrabBagInstance = await shitCoinGrabBag.deployed();
  });

  it('sets owner address', async function() {
    assert.equal(await shitCoinGrabBagInstance.owner(), accounts[0]);
  });

  describe("registerToken:", function() {
    describe("called by owner:", function() {
      it("starts as 0 balance and no keys", async function() {
        let balance = await shitCoinGrabBagInstance.getTokenBalance(accounts[2]);
        let keys = await shitCoinGrabBagInstance.getTokenContracts();
        assert(balance.equals(0));
        assert.equal(keys.length, 0);
      });
      it("adds to balance but not keys for same contractAccount", async function() {
        await shitCoinGrabBagInstance.registerToken(contractAccount, 1, "0x0", {from: owner});
        let balance = await shitCoinGrabBagInstance.getTokenBalance(contractAccount);
        let keys = await shitCoinGrabBagInstance.getTokenContracts();
        assert(balance.equals(1));
        assert.equal(keys.length, 1);
        assert.equal(keys[0], contractAccount);
        await shitCoinGrabBagInstance.registerToken(contractAccount, 2, "0x0", {from: owner});
        balance = await shitCoinGrabBagInstance.getTokenBalance(contractAccount);
        keys = await shitCoinGrabBagInstance.getTokenContracts();
        assert(balance.equals(3));
        assert.equal(keys.length, 1);
        assert.equal(keys[0], contractAccount);
      });
      it("adds to balance and keys for different contractAccount", async function() {
        await shitCoinGrabBagInstance.registerToken(accounts[3], 2, "0x0", {from: owner});
        let keys = await shitCoinGrabBagInstance.getTokenContracts();
        let balance = await shitCoinGrabBagInstance.getTokenBalance(accounts[3]);
        let otherBalance = await shitCoinGrabBagInstance.getTokenBalance(contractAccount);
        assert(balance.equals(2));
        assert(otherBalance.equals(3));
        assert.equal(keys.length, 2);
        assert.equal(keys[0], contractAccount);
        assert.equal(keys[1], accounts[3]);
      });
    });
    

    it("abort if call causes overflow", async function() {
      await tryCatch(shitCoinGrabBagInstance.registerToken(contractAccount, Math.pow(2,256), "0x0", {from: owner}), errTypes.revert);
    });

    it("abort with an error if negative number", async function() {
      await tryCatch(shitCoinGrabBagInstance.registerToken(contractAccount, -1, "0x0", {from: nonOwner}), errTypes.revert);
    });

    it("abort with an error if called by a non-owner", async function() {
      await tryCatch(shitCoinGrabBagInstance.registerToken(contractAccount, 1, "0x0", {from: nonOwner}), errTypes.revert);
    });

    it("abort with an error if called by a non-owner", async function() {
      await tryCatch(shitCoinGrabBagInstance.registerToken(contractAccount, 1, "0x0", {from: nonOwner}), errTypes.revert);
    });

    it("abort with an error if called with empty address", async function() {
      await tryCatch(shitCoinGrabBagInstance.registerToken("0x0", 1, "0x0", {from: owner}), errTypes.revert);
    });
  });
});
