const AbortHelper = require('./AbortHelper');
const shitCoinGrabBag = artifacts.require("./ShitCoinGrabBag.sol");
const dummyErc20 = artifacts.require("./DummyErc20.sol");

contract('ShitCoinGrabBag', function(accounts) {
  let shitCoinGrabBagInstance;
  let erc20ContractInstance;
  let anotherErc20ContractInstance;
  const owner    = accounts[0];
  const user = accounts[1];

  beforeEach(async function() {
    shitCoinGrabBagInstance = await shitCoinGrabBag.new({from: owner});
    erc20ContractInstance = await dummyErc20.new(100, "shitcoin1", 10, "erc", { from: owner });
    anotherErc20ContractInstance = await dummyErc20.new(100, "shitcoin2", 10, "erc", { from: owner });
  });

  describe("transferAToken:", function() {
    it("abort when no tokens", async function() {
      await AbortHelper.tryCatch(shitCoinGrabBagInstance.transferAToken(user, {from: owner}), "revert");
    });

    it("abort with an error if called by a non-owner", async function() {
      await AbortHelper.tryCatch(shitCoinGrabBagInstance.transferAToken(user, {from: user}), "revert");
    });

    describe("one type of erc20", function(){
      describe("one token available", function(){
        beforeEach(async function() {
          await erc20ContractInstance.transfer(shitCoinGrabBagInstance.address, 1, { from: owner });
          await shitCoinGrabBagInstance.registerToken(erc20ContractInstance.address, 1, "0x0", {from: owner});
        });
        it("chooses the available one, removes from contract and transfers.  Then aborts on next call when empty", async function() {
          await shitCoinGrabBagInstance.transferAToken(user, {from: owner});
          
          let tokenContractDestination = await shitCoinGrabBagInstance.getContractAddressOfTransferredToken(user);
          let tokenContractAddresses = await shitCoinGrabBagInstance.getTokenContracts();
          let tokenBalanceOurs = await shitCoinGrabBagInstance.getTokenBalance(erc20ContractInstance.address);
          let tokenBalanceTheirs = await erc20ContractInstance.balanceOf(user);
          
          assert.equal(tokenContractDestination, erc20ContractInstance.address);
          // assert.equal(tokenContractAddresses.length, 0);
          assert(tokenBalanceOurs.equals(0));
          assert(tokenBalanceTheirs.equals(1));
          await AbortHelper.tryCatch(shitCoinGrabBagInstance.transferAToken(user, {from: owner}), "revert");
        });
      });
      describe("more than 1 available", function() {
        beforeEach(async function() {
          await erc20ContractInstance.transfer(shitCoinGrabBagInstance.address, 2, { from: owner });
          await shitCoinGrabBagInstance.registerToken(erc20ContractInstance.address, 2, "0x0", {from: owner});
        });
        it("can take twice, removes from contract and transfers then aborts on extra call", async function() {
            await shitCoinGrabBagInstance.transferAToken(user, {from: owner});

            let tokenContractDestination = await shitCoinGrabBagInstance.getContractAddressOfTransferredToken(user);
            let tokenContractAddresses = await shitCoinGrabBagInstance.getTokenContracts();
            let tokenBalanceOurs = await shitCoinGrabBagInstance.getTokenBalance(erc20ContractInstance.address);
            let tokenBalanceTheirs = await erc20ContractInstance.balanceOf(user);
            
            assert.equal(tokenContractDestination, erc20ContractInstance.address);
            // assert.equal(tokenContractAddresses.length, 1);
            assert(tokenBalanceOurs.equals(1));
            assert(tokenBalanceTheirs.equals(1));
            
            await shitCoinGrabBagInstance.transferAToken(user, {from: owner});

            tokenContractDestination = await shitCoinGrabBagInstance.getContractAddressOfTransferredToken(user);
            tokenBalanceOurs = await shitCoinGrabBagInstance.getTokenBalance(erc20ContractInstance.address);
            tokenBalanceTheirs = await erc20ContractInstance.balanceOf(user);

            assert(tokenBalanceOurs.equals(0));
            assert(tokenBalanceTheirs.equals(2));

            await AbortHelper.tryCatch(shitCoinGrabBagInstance.transferAToken(user, {from: owner}), "revert");
        });
      });
    });

    describe("with more than one token to choose:", function() {
      beforeEach(async function() {
        await erc20ContractInstance.transfer(shitCoinGrabBagInstance.address, 1, { from: owner });
        await shitCoinGrabBagInstance.registerToken(erc20ContractInstance.address, 1, "0x0", {from: owner});
        await anotherErc20ContractInstance.transfer(shitCoinGrabBagInstance.address, 1, { from: owner });
        await shitCoinGrabBagInstance.registerToken(anotherErc20ContractInstance.address, 1, "0x0", {from: owner});
      });
      it("chooses one and removes from contract", async function() {
        await shitCoinGrabBagInstance.transferAToken(user, {from: owner});

        let tokenContractDestination = await shitCoinGrabBagInstance.getContractAddressOfTransferredToken(user);
        let tokenContractAddresses = await shitCoinGrabBagInstance.getTokenContracts();
        let tokenBalanceOurs = await shitCoinGrabBagInstance.getTokenBalance(tokenContractDestination);
        
        let tokenBalanceTheirs;
        if (tokenContractDestination === erc20ContractInstance.address) {
          tokenBalanceTheirs = await erc20ContractInstance.balanceOf(user);
        } else {
          tokenBalanceTheirs = await anotherErc20ContractInstance.balanceOf(user);
        }
        assert(tokenBalanceOurs.equals(0));
        assert(tokenBalanceTheirs.equals(1));
      });
    });
  });
});
