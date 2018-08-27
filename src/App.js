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
      shitCoinOwner: '0xfb577a7a1aba359ee87186c4081eafff73befcf349a031f6132cfe3405aefb9f', // TODO can't have this on frontend- move to a backend service,
      tokenWonByUser: null,
      watchEvents: []
    }
  }

  componentWillMount() {
    getWeb3
    .then(results => {
      this.setState({
        web3: results.web3,
      })
      this.instantiateContract()
    })
    .catch((e) => {
      console.log(`Error finding web3:${e}`);
    })
  }

  componentWillUnmount() {
    this.state.watchEvents.forEach((event) => event.stopWatching());
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
      return this.watchContractEvents();
    }).then((events) => {
      this.setState({watchEvents: events});
      return this.refreshAvailableTokens();
    });
  }

  watchContractEvents() {
    return new Promise((resolve, reject) => {
      const events = [];
      events.push(this.state.shitCoinGrabBagInstance.ChoseToken());
      events.push(this.state.shitCoinGrabBagInstance.ChoseIndex());
      events.push(this.state.shitCoinGrabBagInstance.TransferToken());
      events.push(this.state.shitCoinGrabBagInstance.ReceivedToken());
      events.forEach((event) => {
        event.watch((err, result) => {
          console.log(result);
        });
      });
      resolve(events);
    });
  }

  refreshAvailableTokens() {
    this.getUserWonToken()
    .then((tokenWonByUser) => {
      this.setState({tokenWonByUser: tokenWonByUser})
      return this.getGrabBagTokensHas()
    })
    .then((erc20Contracts) => { // Tokens registered as transferred to shit coin contract
      this.setState({erc20Contracts: erc20Contracts});
      return this.initTokenContracts(Object.keys(erc20Contracts));
    })
    .then((erc20Contracts) => { // Initializes these erc20 contracts so we can make calls
      this.setState({erc20Contracts: erc20Contracts});
      return this.callContractMethod(Object.keys(erc20Contracts), 'name');
    })
    .then((names) => { // Populate name of the tokens
      this.populateState(names, 'name');
      return this.callContractMethod(Object.keys(this.state.erc20Contracts), 'balanceOf', this.state.shitCoinGrabBagInstance.address);
    }).then((balances) => { // Get balances for shit coin contract
      balances.forEach((balance) => {
        balance.balanceOf = new BigNumber(balance.balanceOf); // Convert from string
      });
      this.populateState(balances, 'balanceOf');
      return this.callContractMethod(Object.keys(this.state.erc20Contracts), 'decimals');
    }).then((decimals) => { // Convert balances into human readable
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
        // return self.state.shitCoinGrabBagInstance.coinDrawing(
        // self.state.erc20SendAddress,
        // self.state.erc20SendAmount, // Leave out decimals when we store amount in our contract
        // self.state.account,
        // {from: self.state.account })
        return self.state.shitCoinGrabBagInstance.registerToken(
          self.state.erc20SendAddress,
          self.state.erc20SendAmount, // Leave out decimals when we store amount in our contract
          {from: self.state.account });
    }).then(() => {
      return self.state.shitCoinGrabBagInstance.transferAToken(
        self.state.account,
        {from: self.state.account });
    }).then(() => {
      self.refreshAvailableTokens();
    });
  }

  getUserWonToken() {
    return new Promise((resolve, reject) => {
      this.state.shitCoinGrabBagInstance.getContractAddressOfTransferredToken.call(this.state.account)
      .then((tokenWonByUser) => {
        if (!web3.toBigNumber(tokenWonByUser).isZero())
        {
          resolve(tokenWonByUser);
        } else {
          resolve(null);
        }
      });
    })
  }

  getGrabBagTokensHas() {
    return new Promise((resolve, reject) => {
      this.state.shitCoinGrabBagInstance.getTokenContracts.call().then((results) => {
        const resultsObj = {};
        results.forEach((contractAddress) => {
          if (this.state.web3.utils.isAddress(contractAddress)) {
            resultsObj[contractAddress] = {balance: new BigNumber(0)};
          }
        })
        resolve(resultsObj);
      });
    });
    //   let results = {}; dummy data for test on main net
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

  populateState(results, methodName) { // Generic update to state
    const erc20Contracts = this.state.erc20Contracts;
    results.forEach((result) => {
      erc20Contracts[result.address][methodName] = result[methodName];
    }, this);
    this.setState({erc20Contracts: erc20Contracts});
  }

  callContractMethod(tokenContractAddresses, method, callArgs) { // Calls method on all contracts
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

  handleAddressChange(evt) {
    this.setState({ erc20SendAddress: evt.target.value });
  }

  handleAmountChange(evt) {
    this.setState({ erc20SendAmount: evt.target.value });
  }

  emptyBag() {
    if (this.state.erc20Contracts.length === 0) {
      <div id="emptyBag" >Bag is empty!</div>
    } else {
      return '';
    }
  }

  winnerWinnerChickenDinner() {
    if (this.state.tokenWonByUser) {
      return <div><h3>CONGRATS on your shit coin:</h3>
        <div>{<a href="`https://etherscan.io/address/${this.state.tokenWonByUser}`">{this.state.tokenWonByUser}</a>}</div></div>
    } else {
      return '';
    }
  }

  render() {
    return (
      <div className="App">
        <div className="pure-u-1-1 title">
          <h1>Shit Coin Grab Bag</h1>
        </div>
        <div>
          
        </div>
        <main className="container">
          <div className="pure-g">
            <div className="pure-u-1-3">
            {this.winnerWinnerChickenDinner()}
              <img src="images/PooBag.png"/>
            </div>
            <div className="pure-u-2-3">
              <h3>Erc20 Bag Contents</h3>
              {this.emptyBag()}
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
