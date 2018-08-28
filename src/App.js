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
      erc20UserSendAddress: '0x6288a162851e2613d44c277f29cf176061ab3dc3', // Default value for erc20 user is depositing from
      erc20UserSendAmount: 1, // Default # of tokens to send
      erc20UserAccountBalance: '',
      account: '',
      tokenWonByUser: null,
      watchEvents: [],
      addressError: '',
      web3SendInProgressMessage: ''
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
    });
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
      if (accounts.length === 0) {
        throw('no accounts');
      }
      this.setState({account: accounts[0]});
      return shitCoinGrabBag.deployed();
    })
    .then((instance) => {
      this.setState({shitCoinGrabBagInstance: instance});
      return this.watchContractEvents();
    }).then((events) => {
      this.setState({watchEvents: events});
      return this.refreshAvailableTokens();
    }).catch((err) => {
      console.log(err);
      this.setState({web3SendInProgressMessage: 'Site designed to work with MetaMask- please login'});
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
      if (tokenWonByUser) {
        this.getInfoForTokens([tokenWonByUser], this.state.erc20Contracts, this.state.account)
        .then(() => {
          this.setState({tokenWonByUser: tokenWonByUser});
        })
      }
      return this.getGrabBagTokensHas();
    })
    .then((erc20Contracts) => { // Tokens registered as transferred to shit coin contract
      return this.getInfoForTokens(Object.keys(erc20Contracts), erc20Contracts, this.state.shitCoinGrabBagInstance.address);
    })
    .then((erc20Contracts) => {
      if (this.state.web3.utils.isAddress(this.state.erc20UserSendAddress)) {
        return this.getInfoForTokens([this.state.erc20UserSendAddress],  erc20Contracts, this.state.account);
      }
    })
    .catch((err) => {
      console.log(err);
    });
  }

  getInfoForTokens(addresses, erc20Contracts, forAccount) {
    let balanceKey;
    if (forAccount === this.state.shitCoinGrabBagInstance.address) {
      balanceKey = 'balanceOfBag';
    } else {
      balanceKey = 'balanceOfUser';
    }
    addresses.forEach((address) => {
      if (!(address in erc20Contracts)) {
        erc20Contracts[address] = {};
      }
    });
    return new Promise((resolve, reject) => {
      this.initTokenContracts(erc20Contracts)
      .then((populatedContracts) => {
        return this.callContractMethod(populatedContracts, 'name');
      }).then((names) => {
        erc20Contracts = this.populateErc20Contracts(names, 'name', erc20Contracts);
        return this.callContractMethod(erc20Contracts, 'balanceOf', forAccount);
      }).then((balances) => { // Get balances for shit coin contract
        balances.forEach((balance) => {
          balance[balanceKey] = new BigNumber(balance.balanceOf); // Convert from string
        });
        erc20Contracts = this.populateErc20Contracts(balances, balanceKey, erc20Contracts);
        return this.callContractMethod(erc20Contracts, 'decimals');
      }).then((decimals) => { // Convert balances into human readable
        erc20Contracts = this.populateErc20Contracts(decimals, 'decimals', erc20Contracts);
        Object.keys(erc20Contracts).forEach((addresses) => {
          const divisor = new BigNumber(10).pow(erc20Contracts[addresses].decimals);
          erc20Contracts[addresses][balanceKey] = erc20Contracts[addresses][balanceKey].div(divisor)
        });
        this.setState({erc20Contracts: erc20Contracts});
        resolve(erc20Contracts);
      }).catch((address) => {
        delete erc20Contracts[address]; // This address failed call and is likely not an erc20 contract
        console.log(`failed erc20 call ${address}`);
        reject();
      });
   });
  }

  donateOrRunDrawing(e) {
    e.preventDefault();
    const token = new this.state.web3.eth.Contract(erc20Abi, this.state.erc20UserSendAddress);
    token.methods.decimals().call()
    .then((decimals) => {
      return Promise.resolve(this.state.erc20UserSendAmount * ( 10 ** decimals));
    })
    .then((amountToSend) => {
      this.setState({web3SendInProgressMessage: 'Transfer ERC20 ownership to the Bag'});
      return token.methods.transfer(this.state.shitCoinGrabBagInstance.address, amountToSend).send({ from: this.state.account})
    }).then(() => {
      if (this.getContractsBagHasBalance().length === 0) {
        this.setState({web3SendInProgressMessage: 'Let the bag know it about it (in future this will be backend service)'});
        return this.state.shitCoinGrabBagInstance.registerToken(
          this.state.erc20UserSendAddress,
          this.state.erc20UserSendAmount, // Leave out decimals when we store amount in our contract
          {from: this.state.account })
      } else {
        this.setState({web3SendInProgressMessage: 'Pick a winner'});
        return this.state.shitCoinGrabBagInstance.coinDrawing(
        this.state.erc20UserSendAddress,
        this.state.erc20UserSendAmount, // Leave out decimals when we store amount in our contract
        this.state.account,
        {from: this.state.account })
      }
    }).then(() => {
      this.setState({web3SendInProgressMessage: ''});
      this.refreshAvailableTokens();
    }).catch((err) => {
      this.setState({web3SendInProgressMessage: ''});
      console.log(err);
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

  populateErc20Contracts(results, methodName, erc20Contracts) { // Update erc20Contracts with retrieved results
    results.forEach((result) => {
      erc20Contracts[result.address][methodName] = result[methodName];
    }, this);
    return erc20Contracts;
  }

  callContractMethod(erc20Contracts, method, callArgs) { // Calls method on all contracts
    const promises = [];
    Object.keys(erc20Contracts).forEach((tokenContract) => {
      promises.push(new Promise((resolve, reject) => {
        const callback = (err, result) => {
          if (err) {
            reject(tokenContract, err);
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

  getContractsBagHasBalance() {
    let contracts = [];
    Object.keys(this.state.erc20Contracts).forEach((address) => {
      if ('balanceOfBag' in this.state.erc20Contracts[address]) {
        contracts.push(address);
      }
    });
    return contracts;
  }

  handleAddressChange(evt) {
    this.setState({ erc20UserSendAddress: evt.target.value });
    if (this.state.web3.utils.isAddress(evt.target.value)) {
      this.setState({addressError: ''});
      this.getInfoForTokens([evt.target.value], this.state.erc20Contracts, this.state.account)
      .catch(() => this.setState({addressError: 'Is this a valid ERC20 address?'}));
    } else {
      this.setState({addressError: 'Is this a valid ERC20 address?'});
    }
  }

  handleAmountChange(evt) {
    this.setState({ erc20UserSendAmount: evt.target.value });
  }

  erc20ImageError(evt) {
    evt.target.src =  '';
  }

  userBalance() {
    if (this.state.erc20UserSendAddress in this.state.erc20Contracts &&
        'balanceOfUser' in this.state.erc20Contracts[this.state.erc20UserSendAddress]) {
      return this.state.erc20Contracts[this.state.erc20UserSendAddress].balanceOfUser;
    } else {
      return new BigNumber(0);
    }
  }

  userTokenName() {
    if (this.state.erc20UserSendAddress in this.state.erc20Contracts) {
      return this.state.erc20Contracts[this.state.erc20UserSendAddress].name;
    } else {
      return 'tokens';
    }
  }

  emptyBagRow() {
    if (this.getContractsBagHasBalance().length === 0) {
      return <tr>
        <td colSpan="3">BAG IS EMPTY!  Some generous person needs to get this party started by donating</td>
      </tr>
    }
  }

  winnerWinnerChickenDinnerElement() {
    if (this.state.tokenWonByUser && this.state.erc20Contracts[this.state.tokenWonByUser]) {
      return <nav className="navbar pure-menu pure-menu-horizontal">
        <div><h3><i>CONGRATS on ownership of a </i><b className="poo">{this.state.erc20Contracts[this.state.tokenWonByUser].name}</b>!</h3>
        <div><i>your new balance: </i><b>
          {this.state.erc20Contracts[this.state.tokenWonByUser].balanceOfUser && this.state.erc20Contracts[this.state.tokenWonByUser].balanceOfUser.toNumber()}
          </b> <i>at</i>   {<a href="`https://etherscan.io/address/${this.state.tokenWonByUser}`">{this.state.tokenWonByUser}</a>}
          </div>
        </div>
      </nav>
    } else {
      return '';
    }
  }

  render() {
    const getContractsBagHasBalance = this.getContractsBagHasBalance();
    const bagOnlyContainsSameTokenAsUserAddress = getContractsBagHasBalance.length === 1 && getContractsBagHasBalance[0] === this.state.erc20UserSendAddress;
    const buttonDisabled = bagOnlyContainsSameTokenAsUserAddress;
    if (bagOnlyContainsSameTokenAsUserAddress) {
      this.state.addressError = 'Shit bag only contains these no point in exchanging';
    }
    const buttonText = this.getContractsBagHasBalance() === 0 ? 'Donate tokens' : 'Exchange My Lemon';
    return (
      <div className="App">
        { this.state.web3SendInProgressMessage && <div>
            <div className="overlay"></div>
            <div className="spinner"></div>
            <h1 className="sending-message">{ this.state.web3SendInProgressMessage }</h1>
          </div>
        }
        {this.winnerWinnerChickenDinnerElement()}
        <div className="pure-u-1-1 title">
          <h1>Shit Token Grab Bag</h1>
          <div>
          When life gives you erc20 lemons use this to squeeze them into...other lemons.
        </div>
        <div>
          Send whole token amounts, assumes erc20 decimals 18
        </div>
        </div>
        <main className="container">
          <div className="pure-g">
            <div className="pure-u-1-3">
              <img src="images/PooBag.png"/>
            </div>
            <div className="contents pure-u-2-3">
              <form className="pure-form pure-form-aligned">
              <fieldset>
                <div className="pure-control-group">
                    <label htmlFor="token-address">Erc20 address</label>
                    <input className="pure-input-1-2" type="text" name="token-address" placeholder="Erc20 Address" value={this.state.erc20UserSendAddress} onChange={this.handleAddressChange.bind(this)}/>
                      <span className="pure-form-message-inline">{this.state.addressError}</span>
                </div>
                <div className="pure-control-group">
                  <label htmlFor="tokens">Amount of <b className="poo">{this.userTokenName()}</b></label>
                  <input className="pure-input-1-2" type="text" name="tokens" placeholder="Whole tokens" value={this.state.erc20UserSendAmount} onChange={this.handleAmountChange.bind(this)}/>
                </div>
                <div className="pure-control-group">
                  <label htmlFor="balance">Your balance</label>
                  <input className="pure-input-1-2" type="text" name="balance" placeholder="Your balance for address" value={this.userBalance()} readOnly />
                </div>
                <div className="pure-control-group">
                  <label htmlFor="account"><a href={`https://etherscan.io/address/${this.state.account}`}>Your account</a></label>
                  <input className="pure-input-1-2" type="text" name="account" placeholder="Erc20 Address" value={this.state.account} readOnly />
                </div>
                <div className="pure-controls">
                  <button type="submit" disabled={buttonDisabled} onClick={this.donateOrRunDrawing.bind(this)} className="pure-button pure-button-primary">{buttonText}</button>
                </div>
                </fieldset>
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
                {this.emptyBagRow()}
                {getContractsBagHasBalance.map((address, i) => {
                  return( 
                  <tr key={i} className={i % 2 !== 0 ? 'pure-table-odd' : ''}>
                    <td>
                      <img src={`https://raw.githubusercontent.com/trustwallet/tokens/master/images/${address}.png`} onError={this.erc20ImageError.bind(this)}/>
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
