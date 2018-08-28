pragma solidity 0.4.24;
import "./EIP20Interface.sol";
import "./RandomLibrary.sol";

/// @title Shit Coin Grab Bag
contract ShitCoinGrabBag {
  address public owner = msg.sender;
  // @dev Erc20 Contract Address -> our balance of those coins in whole amounts (right now assumes 18 decimals)
  mapping (address => uint256) ourTokenBalances;
  // @dev Stores keys of ourTokenBalances since mapping doesn't have a way to get keys
  address[] public tokenContractAddresses;
  // @dev Keep track of where we've transferred tokens
  mapping (address => address) public tokensTransferredTo;
  // @dev Assumes erc20 has 18 decimals. ERC20s are not required to implement `decimals`
  // @dev Wanted to use uint8 to save space but https://github.com/ethereum/solidity/issues/1738
  uint256 public decimals = 18;
  // @dev For circuit breaker patern
  bool public halt = false;

  event ReceivedToken(address token, uint256 numTokens);
  event TransferToken(address token, address receiver, uint256 amount);
  event ChoseToken(address token);
  event ChoseIndex(uint256 index);

  modifier onlyOwner() {
    require(msg.sender == owner, "Sender not authorized.");
    _;
  }

  modifier stopInEmergency() {
    require(!halt, "Contract has been paused");
    _;
  }

  /** @dev Gets Bags token balance for address
    * @param tokenContract address of erc20 token
    * @return amount (if any)
    */
  function getTokenBalance(address tokenContract) public view returns (uint256) {
    return ourTokenBalances[tokenContract];
  }

  /** @dev Get all addresses Bag has tokens on
    * @return all addresses we have tokens on
    */
  function getTokenContracts() public view returns (address[]) {
    return tokenContractAddresses;
  }

  /** @dev Get erc20 token address where they can find their new token
    * @param winner address of user
    * @return address of erc20 token contract we transferred to
    */
  function getContractAddressOfTransferredToken(address winner) public view returns (address) {
    return tokensTransferredTo[winner];
  }

  function toggleContract() public onlyOwner() {
    halt = !halt;
  }

  /** @dev Records deposit of token and then draws a random one out and transfers to sender
    * @param tokenContract Address of erc20 contract we received transfer from
    * @param amount Number of whole tokens we received (disregards decimals)
    * @param sender User who transfered token to this contract
    * TODO make external once we have a separate service for watching erc20 Transfer events
    */
  function coinDrawing(address tokenContract, uint256 amount, address sender) public onlyOwner stopInEmergency {
    if (registerToken(tokenContract, amount)) {
      transferAToken(sender);
    } else {
      revert("Failed to registerToken");
    }
  }
  
  /** @dev Records deposit of token
    * @param tokenContract Address of erc20 contract we received transfer from
    * @param amount Number of whole tokens we received (disregards decimals)
    * @return true That it succeeded
    * TODO make external once we have a separate service for watching erc20 Transfer events
    */
  function registerToken(address tokenContract, uint256 amount) public onlyOwner stopInEmergency returns (bool){
    // To be called once we have observed transferFrom fire on the erc20 tokenContract with this contract's address
    require(tokenContract != address(0), "contact address must be valid");
    // Must not underflow/overflow
    assert(ourTokenBalances[tokenContract] + amount >= ourTokenBalances[tokenContract]);
    if (ourTokenBalances[tokenContract] == 0) {
      tokenContractAddresses.push(tokenContract); // Only add if unique
    }
    ourTokenBalances[tokenContract] += amount;
    emit ReceivedToken(tokenContract, amount);
    return true;
  }

  /** @dev Picks a token out of bag and transfers it to destination
    * @param destination Address we are transferring token to
    */
  function transferAToken(address destination) internal onlyOwner stopInEmergency {
    // TODO consider requiring that tokensTransferredTo[destination] be 0x0 so that if destination hasn't already
    // claimed previous token it isn't overwritten and then they don't know erc20 address for token they received
    require(tokenContractAddresses.length > 0, "need some deposited tokens to choose from");
    uint indexForTokenContractToTransferFrom = RandomLibrary.pickRandomTokenIndex(tokenContractAddresses.length);
    // Not an invalid index of array
    assert(indexForTokenContractToTransferFrom < tokenContractAddresses.length);
    emit ChoseIndex(indexForTokenContractToTransferFrom);
    address chosenTokenContract = tokenContractAddresses[indexForTokenContractToTransferFrom];
    emit ChoseToken(chosenTokenContract);
    // We must believe we have a token to transfer
    assert(ourTokenBalances[chosenTokenContract] >= 1);
    ourTokenBalances[chosenTokenContract] -= 1;
    if (ourTokenBalances[chosenTokenContract] == 0) {
      deleteTokenContract(indexForTokenContractToTransferFrom);
    }
    tokensTransferredTo[destination] = chosenTokenContract;
    EIP20Interface untrustedErc20 = EIP20Interface(chosenTokenContract);
    require(untrustedErc20.transfer(destination, 1 * ( 10 ** decimals)), "token transfer must success");
    emit TransferToken(chosenTokenContract, destination, 1);
  }

  /** @dev Removes element from tokenContractAddresses array without leaving 0x0
    * @param index Index to remove
    */
  function deleteTokenContract(uint256 index) internal onlyOwner stopInEmergency { 
    // This moves the last element of the array into spot we are deleting then shortens length by 1
    require(tokenContractAddresses.length > 0, "Must have something to delete");
    require(tokenContractAddresses.length >= index, "Must be valid index");
    address lastElement = tokenContractAddresses[tokenContractAddresses.length-1];
    tokenContractAddresses[index] = lastElement;
    tokenContractAddresses.length--;
  }
}