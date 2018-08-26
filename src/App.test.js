import React from 'react'
import ReactDOM from 'react-dom'
import App from './App'
import ganache from 'ganache-cli'
import Web3 from 'web3';

window.web3 = new Web3(ganache.provider()); // Set window web3
const erc20Json = require('./../build/contracts/DummyErc20.json');
const shitCoinGrabBagJson = require('./../build/contracts/ShitCoinGrabBag.json');
let erc20Owner;
let shitCoinGrabBagOwner;
let erc20;
let shitCoinGrabBag;

beforeEach(function() {
  web3.eth.getAccounts(async (error, accounts) => {
    erc20Owner = accounts[0];
    shitCoinGrabBagOwner = accounts[1];
    
    const erc20Contract = new web3.eth.Contract(erc20Json['abi']);
    const shitCoinContract = new web3.eth.Contract(shitCoinGrabBagJson['abi']);
    erc20Contract.deploy({
        data: erc20Json['bytecode'],
        arguments: [100,"ShtCoin", 18, "SHT"],
    })
    .send({
        from: erc20Owner,
        gas: 1500000,
        gasPrice: '30000000000000'
    }).then((erc20ContractInstance) => {
      erc20 = erc20ContractInstance;
      shitCoinContract.deploy({
        data: shitCoinGrabBagJson['bytecode']
      })
      .send({
        from: erc20Owner,
        gas: 1500000,
        gasPrice: '30000000000000'
      }).then((shitCoinGrabBagInstance) => {
        shitCoinGrabBag = shitCoinGrabBagInstance;
        // erc20.methods
        //   .transfer(shitCoinGrabBagOwner, 100)
        //   .send({from: erc20Owner}, (error, transactionHash) => {
        //     erc20.methods.balanceOf(shitCoinGrabBagOwner).call({from: shitCoinGrabBagOwner}, function(error, balance){
        //       expect(balance).toEqual("100");
        //       shitCoinGrabBag.methods
        //         .registerToken.call(tokenContract, amount, sender)).send({from: shitCoinGrabBagOwner}, , function(error, balance){
                  
        //         });
        //   });
        // });
      });      
    });
  });
});

describe("without tokens", () => {
  it('shows empty', async () => {
    const div = document.createElement('div')
    ReactDOM.render(<App />, div);
    console.log(document.innerHTML);
    expect(document.getElementById("emptyBag")).toBeTruthy();
  })  
});

// // describe("with tokens", () => {
// //   beforeEach(() => {
// //     erc20.methods
// //       .transfer(shitCoinGrabBagOwner, 100)
// //       .send({from: erc20Owner}, (error, transactionHash) => {
// //         erc20.methods.balanceOf(shitCoinGrabBagOwner).call({from: shitCoinGrabBagOwner}, function(error, balance){
// //           expect(balance).toEqual("100");
// //           shitCoinGrabBag.methods
// //             .registerToken(erc20Contract.address, 1, erc20Contract.address).send({from: shitCoinGrabBagOwner}, function(error, balance){
              
// //             });
// //       });
// //     });
// //   });
// //   it('renders table', () => {

// //   });
// });

