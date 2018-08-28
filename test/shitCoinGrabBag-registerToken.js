const AbortHelper = require('./AbortHelper');
const shitCoinGrabBag = artifacts.require("./ShitCoinGrabBag.sol");

contract('ShitCoinGrabBag', function(accounts) {
  let shitCoinGrabBagInstance;
  const owner    = accounts[0];
  const nonOwner = accounts[1];
  const contractAccount = accounts[2];

  before(async () => {
    shitCoinGrabBagInstance = await shitCoinGrabBag.new({from: owner});
  });

  it('sets owner address', async () => {
    assert.equal(await shitCoinGrabBagInstance.owner(), accounts[0]);
  });

  describe("registerToken:", () => {
    describe("called by owner:", () => {
      it("starts as 0 balance and no keys", async () => {
        let balance = await shitCoinGrabBagInstance.getTokenBalance(accounts[2]);
        let keys = await shitCoinGrabBagInstance.getTokenContracts();
        assert(balance.equals(0));
        assert.equal(keys.length, 0);
      });
      it("adds to balance but not keys for same contractAccount", async () => {
        await shitCoinGrabBagInstance.registerToken(contractAccount, 1, {from: owner});
        let balance = await shitCoinGrabBagInstance.getTokenBalance(contractAccount);
        let keys = await shitCoinGrabBagInstance.getTokenContracts();
        assert(balance.equals(1));
        assert.equal(keys.length, 1);
        assert.equal(keys[0], contractAccount);
        await shitCoinGrabBagInstance.registerToken(contractAccount, 2, {from: owner});
        balance = await shitCoinGrabBagInstance.getTokenBalance(contractAccount);
        keys = await shitCoinGrabBagInstance.getTokenContracts();
        assert(balance.equals(3));
        assert.equal(keys.length, 1);
        assert.equal(keys[0], contractAccount);
      });
      it("adds to balance and keys for different contractAccount", async () => {
        await shitCoinGrabBagInstance.registerToken(accounts[3], 2, {from: owner});
        let keys = await shitCoinGrabBagInstance.getTokenContracts();
        let balance = await shitCoinGrabBagInstance.getTokenBalance(accounts[3]);
        let otherBalance = await shitCoinGrabBagInstance.getTokenBalance(contractAccount);
        assert(balance.equals(2));
        assert(otherBalance.equals(3));
        assert.equal(keys.length, 2);
        assert.equal(keys[0], contractAccount);
        assert.equal(keys[1], accounts[3]);
      });

      it("aborts if halt set", async () => {
        await shitCoinGrabBagInstance.toggleContract({from: owner});
        expect(shitCoinGrabBagInstance.halt === true, "toggle to halted");
        await AbortHelper.tryCatch(shitCoinGrabBagInstance.registerToken(contractAccount, 1, {from: owner}), "revert");
      });
    });

    it("abort if call causes overflow", async () => {
      await AbortHelper.tryCatch(shitCoinGrabBagInstance.registerToken(contractAccount, Math.pow(2,256), {from: owner}), "revert");
    });

    it("abort with an error if negative number", async () => {
      await AbortHelper.tryCatch(shitCoinGrabBagInstance.registerToken(contractAccount, -1, {from: nonOwner}), "revert");
    });

    it("abort with an error if called by a non-owner", async () => {
      await AbortHelper.tryCatch(shitCoinGrabBagInstance.registerToken(contractAccount, 1, {from: nonOwner}), "revert");
    });

    it("abort with an error if called by a non-owner", async () => {
      await AbortHelper.tryCatch(shitCoinGrabBagInstance.registerToken(contractAccount, 1, {from: nonOwner}), "revert");
    });

    it("abort with an error if called with empty address", async () => {
      await AbortHelper.tryCatch(shitCoinGrabBagInstance.registerToken("0x0", 1,  {from: owner}), "revert");
    });
  });
});
