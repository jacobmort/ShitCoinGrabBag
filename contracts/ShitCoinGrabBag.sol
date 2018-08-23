pragma solidity ^0.4.24;

contract ShitCoinGrabBag {
  /* stores erc20 balances and corresponding contract addresses
	
	grabFromBag(donator address)
		randomly draws a token, calls corresponding erc20 contract "transferFrom" to donator address
		
	addToken(uint amount, erc20contract address, donator address)
		owner only
		calls grabFromBag after updating? */

  address public owner = msg.sender;
  mapping (address => uint256) ourTokenBalances; // Erc20 Contract Address -> our balance of those coins
  address[] public tokenContractAddresses; // Since mapping doesn't have a way of determining keys

  modifier onlyOwner()
  {
    require(
      msg.sender == owner,
      "Sender not authorized."
    );
    _;
  }

  function getTokenBalance(address tokenContract) public view returns (uint256) {
    return ourTokenBalances[tokenContract];
  }

  function getTokenContracts() public view returns (address[]) {
    return tokenContractAddresses;
  }

  function registerToken(address tokenContract, uint256 amount, address sender) public onlyOwner returns (bool){
    // To be called once we have observed transferFrom fire on the erc20 tokenContract with this contract's address
    require(tokenContract != address(0), "contact address must be valid");
    require(ourTokenBalances[tokenContract] + amount >= ourTokenBalances[tokenContract], "must not decrease amount");
    ourTokenBalances[tokenContract] += amount;
    tokenContractAddresses.push(tokenContract);
    return true;
  }
}
