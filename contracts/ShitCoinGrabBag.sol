pragma solidity ^0.4.24;
import "./EIP20Interface.sol";

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
  mapping (address => address) public tokensTransferredTo;

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

  function getContractAddressOfTransferredToken(address winner) public view returns (address) {
    return tokensTransferredTo[winner];
  }

  function registerToken(address tokenContract, uint256 amount, address sender) public onlyOwner returns (bool){
    // To be called once we have observed transferFrom fire on the erc20 tokenContract with this contract's address
    require(tokenContract != address(0), "contact address must be valid");
    require(ourTokenBalances[tokenContract] + amount >= ourTokenBalances[tokenContract], "must not decrease amount");
    if (ourTokenBalances[tokenContract] == 0) {
      tokenContractAddresses.push(tokenContract); // Only add if unique
    }
    ourTokenBalances[tokenContract] += amount;
    return true;
  }

  function transferAToken(address destination) public onlyOwner {
    // TODO require that tokensTransferredTo[destination] be 0x0 so that if destination hasn't already
    // claimed previous token it isn't overwritten and then they don't know erc20 address for token they received
    require(tokenContractAddresses.length > 0, "need some initial tokens");
    uint indexForTokenContractToTransferFrom = pickRandomTokenIndex();
    address chosenTokenContract = tokenContractAddresses[indexForTokenContractToTransferFrom];
    require(ourTokenBalances[chosenTokenContract] >= 1, "should not happen");
    ourTokenBalances[chosenTokenContract] -= 1;
    if (ourTokenBalances[chosenTokenContract] == 0) {
      // TODO This just sets value to 0x0 and length of array does not change.  Need to actually delete
      delete tokenContractAddresses[indexForTokenContractToTransferFrom];
    }
    tokensTransferredTo[destination] = chosenTokenContract;
    EIP20Interface erc20 = EIP20Interface(chosenTokenContract);
    erc20.transfer(destination, 1);
  }
  
  // https://gist.github.com/alexvandesande/259b4ffb581493ec0a1c
  // TODO improve randomness?
  function randomGen(uint seed, uint max) public view returns (uint randomNumber) {
    return(uint(keccak256(abi.encodePacked(blockhash(block.number-1), seed )))%max);
  }

  function pickRandomTokenIndex() public view returns (uint) {
    return randomGen(block.timestamp, tokenContractAddresses.length);
  }
}