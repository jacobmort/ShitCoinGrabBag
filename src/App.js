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
      erc20UserSendAddress: '0x0139f72d20b29fa0dca007192c9834496d7770a8', // Default value for erc20 user is depositing from
      erc20UserSendAmount: 1, // Default # of tokens to send
      erc20UserAccountBalance: '',
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
      return this.initTokenContracts(this.state.erc20Contracts);
    })
    .then((erc20Contracts) => { // Initializes these erc20 contracts so we can make calls
      this.setState({erc20Contracts: erc20Contracts});
      return this.callContractMethod(this.state.erc20Contracts, 'name');
    })
    .then((names) => { // Populate name of the tokens
      this.populateErc20Contracts(names, 'name', this.state.erc20Contracts);
      return this.callContractMethod(this.state.erc20Contracts, 'balanceOf', this.state.shitCoinGrabBagInstance.address);
    }).then((balances) => { // Get balances for shit coin contract
      balances.forEach((balance) => {
        balance.balanceOfBag = new BigNumber(balance.balanceOf); // Convert from string
      });
      this.populateErc20Contracts(balances, 'balanceOfBag', this.state.erc20Contracts);
      return this.callContractMethod(this.state.erc20Contracts, 'decimals');
    }).then((decimals) => { // Convert balances into human readable
      this.populateErc20Contracts(decimals, 'decimals', this.state.erc20Contracts);
      const erc20Contracts = this.state.erc20Contracts;
      Object.keys(erc20Contracts).forEach((addresses) => {
        const divisor = new BigNumber(10).pow(erc20Contracts[addresses].decimals);
        erc20Contracts[addresses].balanceOfBag = erc20Contracts[addresses].balanceOfBag.div(divisor)
      })
      this.setState({erc20Contracts: erc20Contracts});
    }).catch((err) => {
      console.log(err);
    });
  }

  getInfoForTokens(addresses, erc20Contracts) {
    addresses.forEach((address) => {
      if (!address in erc20Contracts) {
        erc20Contracts[address] = {};
      }
    });
    new Promise((resolve, reject) => {
      this.initTokenContracts(this.state.erc20Contracts)
      .then((erc20Contracts) => {
        this.setState({erc20Contracts: erc20Contracts});
        return this.callContractMethod(this.state.erc20Contracts, 'name');
      }).then((names) => {
        this.populateErc20Contracts(names, 'name', this.state.erc20Contracts);
        return this.callContractMethod(this.state.erc20Contracts, 'balanceOf', this.state.shitCoinGrabBagInstance.address);
      }).then((balances) => { // Get balances for shit coin contract
        balances.forEach((balance) => {
          balance.balanceOfUser = new BigNumber(balance.balanceOf); // Convert from string
        });
        this.populateErc20Contracts(balances, 'balanceOfUser', this.state.erc20Contracts);
        return this.callContractMethod(this.state.erc20Contracts, 'decimals');
      }).then((decimals) => { // Convert balances into human readable
        this.populateErc20Contracts(decimals, 'decimals', this.state.erc20Contracts);
        const erc20Contracts = this.state.erc20Contracts;
        Object.keys(erc20Contracts).forEach((addresses) => {
          const divisor = new BigNumber(10).pow(erc20Contracts[addresses].decimals);
          erc20Contracts[addresses].balanceOfUser = erc20Contracts[addresses].balanceOfBag.div(divisor)
        })
        this.setState({erc20Contracts: erc20Contracts});
        resolve(this.state.erc20Contracts);
      }).catch((err) => {
        console.log(err);
      });
   });
  }

  registerToken() {
    const token = new this.state.web3.eth.Contract(erc20Abi, this.state.erc20UserSendAddress);
    token.methods.decimals().call()
    .then((decimals) => {
      return Promise.resolve(this.state.erc20UserSendAmount * ( 10 ** decimals));
    })
    .then((amountToSend) => {
      return token.methods.transfer(this.state.shitCoinGrabBagInstance.address, amountToSend).send({ from: this.state.account})
    }).then((result) => {
        return this.state.shitCoinGrabBagInstance.coinDrawing(
        this.state.erc20UserSendAddress,
        this.state.erc20UserSendAmount, // Leave out decimals when we store amount in our contract
        this.state.account,
        {from: this.state.account })
    }).then(() => {
      this.refreshAvailableTokens();
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
            resultsObj[contractAddress] = {balanceOfBag: new BigNumber(0)};
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

  initTokenContracts(erc20Contracts) {
    return new Promise((resolve, reject) => {
      Object.keys(erc20Contracts).forEach((tokenContract) => {
        if (!erc20Contracts[tokenContract].contract) { // Only need to init once
          const token = new this.state.web3.eth.Contract(erc20Abi, tokenContract);
          erc20Contracts[tokenContract].contract = token;
        }
      }, this);
      resolve(erc20Contracts);
    });
  }

  populateErc20Contracts(results, methodName, erc20Contracts) { // Generic update to erc20Contracts
    results.forEach((result) => {
      erc20Contracts[result.address][methodName] = result[methodName];
    }, this);
    this.setState({erc20Contracts: erc20Contracts});  
  }

  callContractMethod(erc20Contracts, method, callArgs) { // Calls method on all contracts
    const promises = [];
    Object.keys(erc20Contracts).forEach((tokenContract) => {
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
    this.setState({ erc20UserSendAddress: evt.target.value });
    getInfoForTokens([this.erc20UserSendAddress]);
  }

  handleAmountChange(evt) {
    this.setState({ erc20UserSendAmount: evt.target.value });
  }

  emptyBag() {
    if (this.state.erc20Contracts.length === 0) {
      <div id="emptyBag" >Bag is empty!</div>
    } else {
      return '';
    }
  }

  currentAccount() {
    if (this.state.account ) {
      return <i>Your Current account: <a href="{`https://etherscan.io/address/${this.state.account}`}">{ this.state.account }</a></i>
    } else {
      
    }
  }

  winnerWinnerChickenDinner() {
    if (this.state.tokenWonByUser) {
      return <div><h3>CONGRATS on your shit coin it has been transferred to your address on</h3>
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
          <div>
          When life gives you erc20 lemons use this to squeeze them into...other lemons.
        </div>
        <div>
          Send whole token amounts, assumes erc20 decimals 18
        </div>
        <div>
          {this.currentAccount()}
        </div>
        </div>
        <main className="container">
          <div className="pure-g">
            <div className="pure-u-1-3">
            {this.winnerWinnerChickenDinner()}
              <img src="images/PooBag.png"/>
            </div>
            <div className="contents pure-u-2-3">
              {this.emptyBag()}
              <form className="pure-form">
                <div className="pure-g">
                    <div className="pure-u-1">
                      <label htmlFor="token-address">Erc20 address on my token</label>
                      <input type="text" name="token-address" className="pure-input-1-1" placeholder="Erc20 Address" value={this.state.erc20UserSendAddress} onChange={this.handleAddressChange.bind(this)}/>
                    </div>
                </div>
                <div className="pure-g">
                  <div className="pure-u-1-3">  
                    <label htmlFor="tokens">Amount of Tokens</label>
                    <input type="text" name="tokens" className="pure-input-1-2" placeholder="Whole tokens" value={this.state.erc20UserSendAmount} onChange={this.handleAmountChange.bind(this)}/>
                  </div>
                  <div className="pure-u-2-3">
                    <label htmlFor="balance">of balance</label>
                    <input type="text" name="balance" className="pure-input-1-2" placeholder="Your balance for address" value={this.state.erc20Contracts[this.state.erc20UserSendAddress].balanceOfUser} readOnly />
                  </div>
                </div>
                <button type="submit" onClick={this.registerToken.bind(this)} className="pure-button pure-button-primary">Exchange My Lemon</button>
              </form>
              <h3>Current Bag Contents</h3>
              <i>one of these can be yours!</i>
              <table className="pure-table">
                <thead>
                  <tr>
                    <th>Name of Token</th>
                    <th># of Tokens</th>
                    <th>Address of Erc20 Contract</th>
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
                    <td>{ this.state.erc20Contracts[address].balanceOfBag.toNumber() }</td>
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
