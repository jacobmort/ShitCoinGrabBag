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
      web3: null,
      erc20SendAddress: '0x0139f72d20b29fa0dca007192c9834496d7770a8',
      erc20SendAmount: 1,
      shitCoinOwner: '0xfb577a7a1aba359ee87186c4081eafff73befcf349a031f6132cfe3405aefb9f' // TODO can't have this on frontend- move to a backend service
    }
  }

  componentWillMount() {
    // Get network provider and web3 instance.
    // See utils/getWeb3 for more info.

    getWeb3
    .then(results => {
      this.setState({
        web3: results.web3,
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
    this.state.web3.eth.getAccounts()
    .then((accounts) => {
      this.setState({account: accounts[0]});
      return shitCoinGrabBag.deployed();
    })
    .then((instance) => {
      this.setState({shitCoinGrabBagInstance: instance});
      return this.refreshAvailableTokens();
    });
  }

  refreshAvailableTokens() {
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
      return this.callContractMethod(Object.keys(this.state.erc20Contracts), 'balanceOf', this.state.shitCoinGrabBagInstance.address);
    }).then((balances) => {
      balances.forEach((balance) => {
        balance.balanceOf = new BigNumber(balance.balanceOf); // Convert from string
      });
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
    });
  }

  registerToken() {
    const token = new this.state.web3.eth.Contract(erc20Abi, this.state.erc20SendAddress);
    const self = this; // TODO why arrow func not maintain 'this'?
    token.methods.decimals().call()
    .then((decimals) => {
      return Promise.resolve(self.state.erc20SendAmount * ( 10 ** decimals));
    })
    .then((amountToSend) => {
      return token.methods.transfer(this.state.shitCoinGrabBagInstance.address, amountToSend).send({ from: this.state.account})
    }).then((result) => {
      // return self.state.shitCoinGrabBagInstance.registerToken(
      //   self.state.erc20SendAddress,
      //   self.state.erc20SendAmount,
      //   self.state.account).send({from: self.state.account });
        return self.state.shitCoinGrabBagInstance.registerToken(
        self.state.erc20SendAddress,
        self.state.erc20SendAmount, // Leave out decimals
        self.state.account, {from: self.state.account })
    }).then(() => {
      self.refreshAvailableTokens();
    });
    
  }

  handleAddressChange(evt) {
    this.setState({ erc20SendAddress: evt.target.value });
  }

  handleAmountChange(evt) {
    this.setState({ erc20SendAmount: evt.target.value });
  }

  getAvailableTokens() {
    return new Promise((resolve, reject) => {
      this.state.shitCoinGrabBagInstance.getTokenContracts.call().then((results) => {
        const resultsObj = {};
        results.forEach((contractAddress) => {
          resultsObj[contractAddress] = {balance: new BigNumber(0)};
        })
        resolve(resultsObj);
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
        const token = new this.state.web3.eth.Contract(erc20Abi, tokenContract);
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

  callContractMethod(tokenContractAddresses, method, callArgs) {
    const promises = [];
    const erc20Contracts = this.state.erc20Contracts;
    tokenContractAddresses.forEach((tokenContract) => {
      promises.push(new Promise((resolve, reject) => {
        const callback = (err, result) => {
          if (err) {
            reject(err);
          } else {
            const returnObj = { address: tokenContract };
            returnObj[method] = result;
            resolve(returnObj);
          }
        }
        if (callArgs) {
          erc20Contracts[tokenContract].contract.methods[method](callArgs).call(callback);
        } else {
          erc20Contracts[tokenContract].contract.methods[method]().call(callback);
        }
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
            </div>
            <div className="pure-u-2-3">
              <h3>Erc20 Bag Contents</h3>
              {Object.keys(this.state.erc20Contracts).length == 0 && <div id="emptyBag" >Bag is empty!</div> }
              <table className="pure-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Amount</th>
                    <th>Address</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td><button onClick={this.registerToken.bind(this)}>Deposit</button></td>                    
                    <td>
                      <input type="text" placeholder="Amount of coins" value={this.state.erc20SendAmount} onChange={this.handleAmountChange.bind(this)}/>
                    </td>
                    <td>
                      <input type="text" placeholder="Erc20 Address" value={this.state.erc20SendAddress} onChange={this.handleAddressChange.bind(this)}/>
                    </td>
                  </tr>
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
