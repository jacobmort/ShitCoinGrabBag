pragma solidity ^0.4.24;
import "../contracts/ShitCoinGrabBag.sol";

contract ExposedShitCoinGrabBag is ShitCoinGrabBag {
  function _deleteTokenContract(uint256 index) public onlyOwner { 
    deleteTokenContract(index);
  }

  function _transferAToken(address destination) public onlyOwner {
    transferAToken(destination);
  }
}