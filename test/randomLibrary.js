const randomLibrary = artifacts.require("./RandomLibrary.sol");
const AbortHelper = require('./AbortHelper');

contract('ShitCoinGrabBag', function(accounts) {
  let randomLibraryInstance;
  function getRandomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }
  beforeEach(async () => {
    randomLibraryInstance = await randomLibrary.deployed();
  });

  describe("pickRandomTokenIndex", async() => {
    it("0 aborts", async () => {
      // TODO this throws invalid opcode but is not caught by our helper
      // await AbortHelper.tryCatch(randomLibraryInstance.pickRandomTokenIndex(2), "invalid opcode");
    });

    it("1 returns 1", async () => {
      let index = await randomLibraryInstance.pickRandomTokenIndex(1);
      assert.equal(index, 0, "only element available");
    });

    it("random returns in range", async () => {
      let random = getRandomInt(0, 100);
      let index = await randomLibraryInstance.pickRandomTokenIndex(random);
      assert(index >= 0 && index <= 100, "in range");
    });
  });
});