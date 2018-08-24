const AbortHelper = require('./AbortHelper');
const shitCoinGrabBag = artifacts.require("./ShitCoinGrabBag.sol");
const dummyErc20 = artifacts.require("./DummyErc20.sol");

contract('ShitCoinGrabBag', function(accounts) {
  let shitCoinGrabBagInstance;
  let erc20ContractInstance;
  const owner    = accounts[0];
  const userOfShitCoinGrabBag = accounts[1];

  before(async function() {
    shitCoinGrabBagInstance = await shitCoinGrabBag.deployed();
    erc20ContractInstance = await dummyErc20.new(100, "erctwenty", 10, "erc", { from: owner });
  });

  describe("transferAToken:", function() {
    it("abort when no tokens", async function() {
      await AbortHelper.tryCatch(shitCoinGrabBagInstance.transferAToken(userOfShitCoinGrabBag, {from: owner}), "revert");
    });

    it("abort with an error if called by a non-owner", async function() {
      await AbortHelper.tryCatch(shitCoinGrabBagInstance.transferAToken(userOfShitCoinGrabBag, {from: userOfShitCoinGrabBag}), "revert");
    });

    describe("one type of erc20", function(){
      describe("one token available", function(){
        it("chooses the available one, removes from contract and transfers.  Then aborts on next call when empty", async function() {
          let balance = await erc20ContractInstance.balanceOf(owner);
          await erc20ContractInstance.transfer(shitCoinGrabBagInstance.address, 1, { from: owner });
          await shitCoinGrabBagInstance.registerToken(erc20ContractInstance.address, 1, "0x0", {from: owner});
          await shitCoinGrabBagInstance.transferAToken(userOfShitCoinGrabBag, {from: owner});
          let tokenContractDestination = await shitCoinGrabBagInstance.getContractAddressOfTransferredToken(userOfShitCoinGrabBag);
          let tokenContractAddresses = await shitCoinGrabBagInstance.getTokenContracts();
          let tokenBalanceOurs = await shitCoinGrabBagInstance.getTokenBalance(erc20ContractInstance.address);
          let tokenBalanceTheirs = await erc20ContractInstance.balanceOf(userOfShitCoinGrabBag);
          assert.equal(tokenContractDestination, erc20ContractInstance.address);
          // assert.equal(tokenContractAddresses.length, 0);
          assert(tokenBalanceOurs.equals(0));
          assert(tokenBalanceTheirs.equals(1));
          await AbortHelper.tryCatch(shitCoinGrabBagInstance.transferAToken(userOfShitCoinGrabBag, {from: owner}), "revert");
        });
      });
      // describe("more than 1 available", function() {
      //   it("chooses the available one and removes from contract then aborts on next call", async function() {
      //     await shitCoinGrabBagInstance.registerToken(erc20Contract, 2, "0x0", {from: owner});
      //       await shitCoinGrabBagInstance.transferAToken(userOfShitCoinGrabBag, {from: owner});
      //       let tokenBalance = await shitCoinGrabBagInstance.getTokenBalance(erc20Contract);
      //       assert(tokenBalance.equals(1));
      //       await shitCoinGrabBagInstance.transferAToken(userOfShitCoinGrabBag, {from: owner});
      //       tokenBalance = await shitCoinGrabBagInstance.getTokenBalance(erc20Contract);
      //       assert(tokenBalance.equals(0));
      //       await AbortHelper.tryCatch(shitCoinGrabBagInstance.transferAToken(userOfShitCoinGrabBag, {from: owner}), "revert");
      //   });
      // });
    });

    // describe("with more than one token to choose:", function() {
    //   it("chooses one and removes from contract", async function() {
    //     await shitCoinGrabBagInstance.registerToken(erc20Contract, 1, "0x0", {from: owner});
    //     await shitCoinGrabBagInstance.registerToken(anothererc20Contract, 1, "0x0", {from: owner});
    //   });
    // });
  });
});
