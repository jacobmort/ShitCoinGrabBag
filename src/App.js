import React, { Component } from 'react'
import getWeb3 from './utils/getWeb3'
import BigNumber from 'bignumber.js';

import ShitCoinGrabBag from '../build/contracts/ShitCoinGrabBag.json'
import erc20Abi from 'human-standard-token-abi';

import './css/oswald.css'
import './css/open-sans.css'
import './css/pure-min.css'
import './App.css'

class App extends Component {
  constructor(props) {
    super(props)

    this.state = {
      erc20Contracts: {},
      web3: null
    }
  }

  componentWillMount() {
    // Get network provider and web3 instance.
    // See utils/getWeb3 for more info.

    getWeb3
    .then(results => {
      this.setState({
        web3: results.web3
      })

      // Instantiate contract once web3 provided.
      this.instantiateContract()
    })
    .catch((e) => {
      console.log(`Error finding web3:${e}`);
    })
  }

  instantiateContract() {
    const contract = require('truffle-contract');
    const shitCoinGrabBag = contract(ShitCoinGrabBag);
    shitCoinGrabBag.setProvider(this.state.web3.currentProvider);
    // Get accounts.

    shitCoinGrabBag.deployed().then((instance) => {
      this.setState({shitCoinGrabBagInstance: instance});
      this.getAvailableTokens()
      .then((erc20Contracts) => {
        this.setState({erc20Contracts: erc20Contracts});
        return this.initTokenContracts(Object.keys(erc20Contracts));
      })
      .then((erc20Contracts) => {
        this.setState({erc20Contracts: erc20Contracts});
        return this.callContractMethod(Object.keys(erc20Contracts), 'name');
      })
      .then((names) => {
        this.populateState(names, 'name');
        return this.callContractMethod(Object.keys(this.state.erc20Contracts), 'balanceOf', '0x0');
      }).then((balances) => {
        this.populateState(balances, 'balanceOf');
        return this.callContractMethod(Object.keys(this.state.erc20Contracts), 'decimals');
      }).then((decimals) => {
        this.populateState(decimals, 'decimals');
        const erc20Contracts = this.state.erc20Contracts;
        Object.keys(erc20Contracts).forEach((addresses) => {
          const divisor = new BigNumber(10).pow(erc20Contracts[addresses].decimals);
          erc20Contracts[addresses].balance = erc20Contracts[addresses].balanceOf.div(divisor)
        })
        this.setState({erc20Contracts: erc20Contracts});
      }).catch((err) => {
        console.log(err);
      });;
    });

    // this.state.web3.eth.getAccounts((error, accounts) => {
    //   simpleStorage.deployed().then((instance) => {
    //     simpleStorageInstance = instance
        
    //     // Stores a given value, 5 by default.
    //     return simpleStorageInstance.set(5, {from: accounts[0]})
    //   }).then((result) => {
    //     // Get the value from the contract to prove it worked.
    //     return simpleStorageInstance.get.call(accounts[0])
    //   }).then((result) => {
    //     // Update state with the result.
    //     return this.setState({ storageValue: result.c[0] })
    //   })
    // })
  }

  registerToken() {
  //   this.state.shitCoinGrabBagInstance.registerToken.call(
  //     "0xd26114cd6EE289AccF82350c8d8487fedB8A0C07", 
  //     1, 
  //     "0xd26114cd6EE289AccF82350c8d8487fedB8A0C07", 
  //     {from: this.state.shitCoinGrabBagInstance.address })
  //   .then(() => {
  //     this.getAvailableTokens();
  //   }).catch((e) => {
  //     console.log(e);
  //   });
  }

  getAvailableTokens() {
    return new Promise((resolve, reject) => {
      this.state.shitCoinGrabBagInstance.getTokenContracts.call().then((err,results) => {
        if (err) {
          reject(err);
        } else {
          resolve(results);
        }
      });
    });
    //   let results = {};
    //   results['0xd26114cd6EE289AccF82350c8d8487fedB8A0C07'] = {balance: new BigNumber(0)};
    //   results['0xb3104b4b9da82025e8b9f8fb28b3553ce2f67069'] = {balance: new BigNumber(0)};
    //   results['0xd850942ef8811f2a866692a623011bde52a462c1'] = {balance: new BigNumber(0)};
    //   results['0x05f4a42e251f2d52b8ed15e9fedaacfcef1fad27'] = {balance: new BigNumber(0)};
    //   resolve(results);
    // });
  }

  initTokenContracts(tokenContractAddresses) {
    return new Promise((resolve, reject) => {
      const erc20Contracts = this.state.erc20Contracts;
      tokenContractAddresses.forEach((tokenContract) => {
        const token = this.state.web3.eth.contract(erc20Abi).at(tokenContract);
        erc20Contracts[tokenContract].contract = token;
      }, this);
      resolve(erc20Contracts);
    });
  }

  populateState(results, methodName) {
    const erc20Contracts = this.state.erc20Contracts;
    results.forEach((result) => {
      erc20Contracts[result.address][methodName] = result[methodName];
    }, this);
    this.setState({erc20Contracts: erc20Contracts});
}

  callContractMethod(tokenContractAddresses, method, address) {
    const promises = [];
    const erc20Contracts = this.state.erc20Contracts;
    tokenContractAddresses.forEach((tokenContract) => {
      promises.push(new Promise((resolve, reject) => {
        const callArgs = {}
        if (address) {
          // callArgs.from = address;
        }
        erc20Contracts[tokenContract].contract[method].call((err, result) => {
          if (err) {
            reject(err);
          } else {
            const returnObj = { address: tokenContract };
            returnObj[method] = result;
            resolve(returnObj);
          }
        });
      }));
    }, this);
    return Promise.all(promises);
  }

  render() {
    return (
      <div className="App">
        <div className="pure-u-1-1 title">
          <h1>Shit Coin Grab Bag</h1>
        </div>
        <main className="container">
          <div className="pure-g">
            <div className="pure-u-1-3">
              <img src="images/PooBag.png"/>
              <button onClick={this.registerToken.bind(this)}>Deposit</button>
            </div>
            <div className="pure-u-2-3">
              <h3>Erc20 Bag Contents</h3>
              <table className="pure-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Amount</th>
                    <th>Address</th>
                  </tr>
                </thead>
                <tbody>
                {Object.keys(this.state.erc20Contracts).map((address, i) => {
                  return( 
                  <tr key={i} className={i % 2 !== 0 ? 'pure-table-odd' : ''}>
                    <td>
                      <img src={`https://raw.githubusercontent.com/trustwallet/tokens/master/images/${address}.png`} />
                      { this.state.erc20Contracts[address].name }
                    </td>
                    <td>{ this.state.erc20Contracts[address].balance.toNumber() }</td>
                    <td><a href={`https://etherscan.io/address/${address}`}>{address}</a></td>
                  </tr>)
                })}
                </tbody>
              </table>
            </div>
          </div>
        </main>
      </div>
    );
  }
}

export default App
