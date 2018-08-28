const AbortHelper = require('./AbortHelper');
const shitCoinGrabBag = artifacts.require("./ExposedShitCoinGrabBag.sol");
const dummyErc20 = artifacts.require("./DummyErc20.sol");

contract('ShitCoinGrabBag', function(accounts) {
  let shitCoinGrabBagInstance;
  let erc20ContractInstance;
  let anotherErc20ContractInstance;
  const owner    = accounts[0];
  const user = accounts[1];
  const oneErc20TokenOf18Decimal = 1 * ( 10 ** 18);

  beforeEach(async () => {
    shitCoinGrabBagInstance = await shitCoinGrabBag.new({from: owner});
    erc20ContractInstance = await dummyErc20.new(oneErc20TokenOf18Decimal * 100, "shitcoin1", 10, "sht1", { from: owner });
    anotherErc20ContractInstance = await dummyErc20.new(oneErc20TokenOf18Decimal * 100, "shitcoin2", 10, "sht2", { from: owner });
  });

  describe("transferAToken:", () => {
    it("abort when no tokens", async () => {
      await AbortHelper.tryCatch(shitCoinGrabBagInstance._transferAToken(user, {from: owner}), "revert");
    });
 
    describe("one type of erc20", () =>{
      describe("one token available", () =>{
        beforeEach(async () => {
          await erc20ContractInstance.transfer(shitCoinGrabBagInstance.address, oneErc20TokenOf18Decimal, { from: owner });
          await shitCoinGrabBagInstance.registerToken(erc20ContractInstance.address, 1, {from: owner});
        });

        it("abort with an error if called by a non-owner", async () => {
          await AbortHelper.tryCatch(shitCoinGrabBagInstance._transferAToken(user, {from: user}), "revert");
        });

        it("chooses the available one, removes from contract and transfers.  Then aborts on next call when empty", async () => {
          await shitCoinGrabBagInstance._transferAToken(user, {from: owner});
          
          let tokenContractDestination = await shitCoinGrabBagInstance.getContractAddressOfTransferredToken(user);
          let tokenContractAddresses = await shitCoinGrabBagInstance.getTokenContracts();
          let tokenBalanceOurs = await shitCoinGrabBagInstance.getTokenBalance(erc20ContractInstance.address);
          let tokenBalanceTheirs = await erc20ContractInstance.balanceOf(user);
          

          assert.equal(tokenContractDestination, erc20ContractInstance.address, "only 1 address to choose");
          assert.equal(tokenContractAddresses.length, 0, "there was only 1 contract with 1 token = no more");
          assert(tokenBalanceOurs.equals(0), "shit coin has been drained");
          assert(tokenBalanceTheirs.equals(oneErc20TokenOf18Decimal), "token has ended up with them");
          await AbortHelper.tryCatch(shitCoinGrabBagInstance._transferAToken(user, {from: owner}), "revert");
        });
      });
      describe("more than 1 available", () => {
        beforeEach(async () => {
          await erc20ContractInstance.transfer(shitCoinGrabBagInstance.address, 2 * oneErc20TokenOf18Decimal, { from: owner });
          await shitCoinGrabBagInstance.registerToken(erc20ContractInstance.address, 2, {from: owner});
        });
        it("can take twice, removes from contract and transfers then aborts on extra call", async () => {
            await shitCoinGrabBagInstance._transferAToken(user, {from: owner});

            let tokenContractDestination = await shitCoinGrabBagInstance.getContractAddressOfTransferredToken(user);
            let tokenContractAddresses = await shitCoinGrabBagInstance.getTokenContracts();
            let tokenBalanceOurs = await shitCoinGrabBagInstance.getTokenBalance(erc20ContractInstance.address);
            let tokenBalanceTheirs = await erc20ContractInstance.balanceOf(user);
            
            assert.equal(tokenContractDestination, erc20ContractInstance.address, "only 1 address to choose");
            assert.equal(tokenContractAddresses.length, 1, "there is another coin there so we still keep address");
            assert(tokenBalanceOurs.equals(1), "we have 1 more token left");
            assert(tokenBalanceTheirs.equals(oneErc20TokenOf18Decimal), "we have transferred 1 to them");
            
            await shitCoinGrabBagInstance._transferAToken(user, {from: owner});

            tokenContractDestination = await shitCoinGrabBagInstance.getContractAddressOfTransferredToken(user);
            tokenBalanceOurs = await shitCoinGrabBagInstance.getTokenBalance(erc20ContractInstance.address);
            tokenContractAddresses = await shitCoinGrabBagInstance.getTokenContracts();
            tokenBalanceTheirs = await erc20ContractInstance.balanceOf(user);

            assert.equal(tokenContractDestination, erc20ContractInstance.address, "only 1 address to choose");
            assert(tokenBalanceOurs.equals(0), "we've exhausted our tokens");
            assert(tokenBalanceTheirs.equals(2 * oneErc20TokenOf18Decimal), "we've transferred both to them");
            assert.equal(tokenContractAddresses.length, 0, "no balance = no contracts");
            await AbortHelper.tryCatch(shitCoinGrabBagInstance._transferAToken(user, {from: owner}), "revert");
        });
      });
    });
    describe("with more than type of one token:", () => {
      beforeEach(async () => {
        await erc20ContractInstance.transfer(shitCoinGrabBagInstance.address, oneErc20TokenOf18Decimal, { from: owner });
        await shitCoinGrabBagInstance.registerToken(erc20ContractInstance.address, 1, {from: owner});
        await anotherErc20ContractInstance.transfer(shitCoinGrabBagInstance.address, oneErc20TokenOf18Decimal, { from: owner });
        await shitCoinGrabBagInstance.registerToken(anotherErc20ContractInstance.address, 1, {from: owner});
      });
      it("can take twice, removes from contract and transfers then aborts on extra call", async () => {
        await shitCoinGrabBagInstance._transferAToken(user, {from: owner});

        let tokenContractDestination = await shitCoinGrabBagInstance.getContractAddressOfTransferredToken(user);
        let tokenContractAddresses = await shitCoinGrabBagInstance.getTokenContracts();
        let tokenBalanceOurs = await shitCoinGrabBagInstance.getTokenBalance(tokenContractDestination);
        let tokenBalanceTheirs, otherAddress, otherBalanceTheirs;

        if (tokenContractDestination === erc20ContractInstance.address) {
          tokenBalanceTheirs = await erc20ContractInstance.balanceOf(user);
          otherAddress = anotherErc20ContractInstance.address;
          otherBalanceTheirs = await anotherErc20ContractInstance.balanceOf(user);
        } else {
          tokenBalanceTheirs = await anotherErc20ContractInstance.balanceOf(user);
          otherAddress = erc20ContractInstance.address;
          otherBalanceTheirs = await erc20ContractInstance.balanceOf(user);
        }
        let otherBalanceOurs = await shitCoinGrabBagInstance.getTokenBalance(otherAddress);

        assert(tokenContractDestination === erc20ContractInstance.address || tokenContractDestination === anotherErc20ContractInstance.address, "picks from one of these");
        assert.equal(tokenContractAddresses.length, 1, "there is another coin there so we still keep address");
        assert(tokenBalanceOurs.equals(0), "we transferred this one");
        assert(otherBalanceOurs.equals(1), "we still have 1 to transfer");
        assert(otherBalanceTheirs.equals(0), "nothing transferred here yet");
        assert(tokenBalanceTheirs.equals(oneErc20TokenOf18Decimal), "we have transferred 1 to them");

        await shitCoinGrabBagInstance._transferAToken(user, {from: owner});

        tokenContractDestination = await shitCoinGrabBagInstance.getContractAddressOfTransferredToken(user);
        tokenContractAddresses = await shitCoinGrabBagInstance.getTokenContracts();
        tokenBalanceOurs = await shitCoinGrabBagInstance.getTokenBalance(tokenContractDestination);
        if (tokenContractDestination === erc20ContractInstance.address) {
          tokenBalanceTheirs = await erc20ContractInstance.balanceOf(user);
          otherAddress = anotherErc20ContractInstance.address;
          otherBalanceTheirs = await anotherErc20ContractInstance.balanceOf(user);
        } else {
          tokenBalanceTheirs = await anotherErc20ContractInstance.balanceOf(user);
          otherAddress = erc20ContractInstance.address;
          otherBalanceTheirs = await erc20ContractInstance.balanceOf(user);
        }
        otherBalanceOurs = await shitCoinGrabBagInstance.getTokenBalance(otherAddress);

        assert(tokenContractDestination === erc20ContractInstance.address || tokenContractDestination === anotherErc20ContractInstance.address, "picks from one of these");
        assert.equal(tokenContractAddresses.length, 0, "no contracts with balances left");
        assert(tokenBalanceOurs.equals(0), "we transferred both");
        assert(otherBalanceOurs.equals(0), "we transferred both");
        assert(tokenBalanceTheirs.equals(oneErc20TokenOf18Decimal), "we have transferred 1 of these to them");
        assert(otherBalanceTheirs.equals(oneErc20TokenOf18Decimal), "we have transferred 1 of these to them");

        await AbortHelper.tryCatch(shitCoinGrabBagInstance._transferAToken(user, {from: owner}), "revert");
      });
    });
  });
});
