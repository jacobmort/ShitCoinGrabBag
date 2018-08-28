const shitCoinGrabBag = artifacts.require('./ExposedShitCoinGrabBag');
const AbortHelper = require('./AbortHelper');

contract('ShitCoinGrabBag', function(accounts) {
  let shitCoinGrabBagInstance;
  const owner    = accounts[0];
  const nonOwner = accounts[1];
  const contractAccount = accounts[2];

  beforeEach(async () => {
    shitCoinGrabBagInstance = await shitCoinGrabBag.new({from: owner});
  });

  describe("pickRandomTokenIndex", async() => {
    it("throws when empty", async () => {
      await AbortHelper.tryCatch(shitCoinGrabBagInstance._pickRandomTokenIndex(), "invalid opcode");
    });
    describe("with 1 element", async () => {
      beforeEach(async () => {
        await shitCoinGrabBagInstance.registerToken("0x0139f72d20b29fa0dca007192c9834496d7770a9", 1, {from: owner});
      });

      it("returns the element", async () => {
        let index = await shitCoinGrabBagInstance._pickRandomTokenIndex();
        assert.equal(index, 0, "only element available");
      });
    });

    describe("with 2 elements", async () => {
      beforeEach(async () => {
        await shitCoinGrabBagInstance.registerToken("0x0139f72d20b29fa0dca007192c9834496d7770a1", 1, {from: owner});
        await shitCoinGrabBagInstance.registerToken("0x0139f72d20b29fa0dca007192c9834496d7770a2", 1, {from: owner});
      });

      it("returns an element", async () => {
        let index = await shitCoinGrabBagInstance._pickRandomTokenIndex();
        assert(index == 0 || index == 1, "only element available");
      });
    });
  });

  describe("deleteTokenContract", async () => {
    it("throws when empty", async () => {
      await AbortHelper.tryCatch(shitCoinGrabBagInstance._deleteTokenContract(0), "revert");
    });

    describe("with 1 element", async () => {
      beforeEach(async () => {
        await shitCoinGrabBagInstance.registerToken("0x0139f72d20b29fa0dca007192c9834496d7770a9", 1, {from: owner});
      });

      it("throws on invalid index", async () => {
        await AbortHelper.tryCatch(shitCoinGrabBagInstance._deleteTokenContract(2), "revert");
      });

      it("works with 0", async () => {
        let keys = await shitCoinGrabBagInstance.getTokenContracts();
        assert.equal(keys.length, 1, "starts with 1");
        shitCoinGrabBagInstance._deleteTokenContract(0);
        keys = await shitCoinGrabBagInstance.getTokenContracts();
        assert.equal(keys.length, 0, "now zero");
      });
    });

    describe("with 2 elements", async () => {
      beforeEach(async () => {
        await shitCoinGrabBagInstance.registerToken("0x0139f72d20b29fa0dca007192c9834496d7770a1", 1, {from: owner});
        await shitCoinGrabBagInstance.registerToken("0x0139f72d20b29fa0dca007192c9834496d7770a2", 1, {from: owner});
      });

      it("removes 1st element", async () => {
        let keys = await shitCoinGrabBagInstance.getTokenContracts();
        assert.equal(keys.length, 2, "starts with 2");
        await shitCoinGrabBagInstance._deleteTokenContract(0);
        
        keys = await shitCoinGrabBagInstance.getTokenContracts();

        assert.equal(keys.length, 1, "one left");
        assert.equal(keys[0], "0x0139f72d20b29fa0dca007192c9834496d7770a2", "correct element still exists");
      });

      it("removes 2nd element", async () => {
        let keys = await shitCoinGrabBagInstance.getTokenContracts();
        assert.equal(keys.length, 2, "starts with 2");
        await shitCoinGrabBagInstance._deleteTokenContract(1);
        
        keys = await shitCoinGrabBagInstance.getTokenContracts();

        assert.equal(keys.length, 1, "one left");
        assert.equal(keys[0], "0x0139f72d20b29fa0dca007192c9834496d7770a1", "correct element still exists");
      });
    });
  });
});
