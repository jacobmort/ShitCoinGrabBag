import React from 'react'
import ReactDOM from 'react-dom'
import App from './App'
import ganache from 'ganache-cli'
import Web3 from 'web3';

const web3 = new Web3(ganache.provider());
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
    
    const erc20Instance = new web3.eth.Contract(erc20Json['abi']);
    erc20Instance.deploy({
        data: erc20Json['bytecode'],
        arguments: [100,"ShtCoin",18,"SHT"],
    })
    .send({
        from: erc20Owner,
        gas: 1500000,
        gasPrice: '30000000000000'
    }).then(function(newContractInstance){
      console.log(newContractInstance.options.address) // instance with the new contract address
      newContractInstance.methods
      .transfer(shitCoinGrabBagOwner, 100)
      .send({from: erc20Owner}, function(error, transactionHash) {
        console.log(error);
        newContractInstance.methods.balanceOf(shitCoinGrabBagOwner).call({from: shitCoinGrabBagOwner}, function(error, transactionHash){
          console.log(transactionHash);
        });
      });
    });
  });
});

it('renders without crashing', async () => {
  const div = document.createElement('div')
  ReactDOM.render(<App />, div)
})
