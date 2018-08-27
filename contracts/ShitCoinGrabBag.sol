pragma solidity ^0.4.24;
import "./EIP20Interface.sol";

contract ShitCoinGrabBag {
  address public owner = msg.sender;
  // Erc20 Contract Address -> our balance of those coins in whole amounts (right now assumes 18 decimals)
  mapping (address => uint256) ourTokenBalances;
  // Stores keys of ourTokenBalances since mapping doesn't have a way to get keys
  address[] public tokenContractAddresses;
  // Keep track of where we've transferred tokens
  mapping (address => address) public tokensTransferredTo;

  event ReceivedToken(address token, uint256 numTokens);
  event TransferToken(address token, address receiver, uint256 amount);
  event ChoseToken(address token);
  event ChoseIndex(uint256 index);

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

  function coinDrawing(address tokenContract, uint256 amount, address sender) public onlyOwner returns (bool) {
    if (registerToken(tokenContract, amount)) {
      transferAToken(sender);
    } else {
      revert("Failed to registerToken");
    }
  }

  function registerToken(address tokenContract, uint256 amount) public onlyOwner returns (bool){
    // To be called once we have observed transferFrom fire on the erc20 tokenContract with this contract's address
    require(tokenContract != address(0), "contact address must be valid");
    require(ourTokenBalances[tokenContract] + amount >= ourTokenBalances[tokenContract], "must not decrease amount");
    if (ourTokenBalances[tokenContract] == 0) {
      tokenContractAddresses.push(tokenContract); // Only add if unique
    }
    ourTokenBalances[tokenContract] += amount;
    emit ReceivedToken(tokenContract, amount);
    return true;
  }

  function transferAToken(address destination) public onlyOwner {
    // TODO require that tokensTransferredTo[destination] be 0x0 so that if destination hasn't already
    // claimed previous token it isn't overwritten and then they don't know erc20 address for token they received
    require(tokenContractAddresses.length > 0, "need some deposited tokens to choose from");
    uint indexForTokenContractToTransferFrom = pickRandomTokenIndex();
    emit ChoseIndex(indexForTokenContractToTransferFrom);
    address chosenTokenContract = tokenContractAddresses[indexForTokenContractToTransferFrom];
    emit ChoseToken(chosenTokenContract);
    require(ourTokenBalances[chosenTokenContract] >= 1, "should not happen");
    ourTokenBalances[chosenTokenContract] -= 1;
    if (ourTokenBalances[chosenTokenContract] == 0) {
      deleteTokenContract(indexForTokenContractToTransferFrom);
    }
    tokensTransferredTo[destination] = chosenTokenContract;
    EIP20Interface erc20 = EIP20Interface(chosenTokenContract);
    erc20.transfer(destination, 1 * ( 10 ** 18)); // TODO figure out if contract supports getting decimals
    emit TransferToken(chosenTokenContract, destination, 1);
  }
  
  // https://gist.github.com/alexvandesande/259b4ffb581493ec0a1c
  // TODO improve randomness?
  function randomGen(uint seed, uint max) public view returns (uint randomNumber) {
    return(uint(keccak256(abi.encodePacked(blockhash(block.number-1), seed )))%max);
  }

  function pickRandomTokenIndex() public view returns (uint) {
    return randomGen(block.timestamp, tokenContractAddresses.length);
  }

  function deleteTokenContract(uint256 index) public onlyOwner returns(bool) { 
    // This moves the last element of the array into spot we are deleting
    address lastElement = tokenContractAddresses[tokenContractAddresses.length-1];
    tokenContractAddresses[index] = lastElement;
    tokenContractAddresses.length--;
    return true;
  }
}