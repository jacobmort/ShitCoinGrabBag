pragma solidity 0.4.24;

/// @title Random Library
library RandomLibrary {
  
  /** @dev Gets a random-ish number
    * @param max highest value we want back
    * @return random number
    * TODO better seed than block.timestamp?
    */
  function pickRandomTokenIndex(uint256 max) public view returns (uint256) {
    return randomGen(block.timestamp, max);
  }
  /** @dev Gets a random-ish number
    * @param seed used for entropy
    * @param max highest value we want back
    * @return A random-ish selected number
    * from https://gist.github.com/alexvandesande/259b4ffb581493ec0a1c
    * TODO improve randomness?
    */
  function randomGen(uint256 seed, uint256 max) private view returns (uint256 randomNumber) {    
    return(uint(keccak256(abi.encodePacked(blockhash(block.number-1), seed))) % max);
  }
}