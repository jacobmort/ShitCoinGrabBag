### Design

* For testing we have `owner` of ShitCoinGrabBag contract as local user and call `coinDrawing` from web3.  `owner` on testnet/or *gasp* mainnet `owner` will be controlled by a separate backend server.  This server will listen directly to the erc20 addresses for `Transfer` events and automatically call `coinDrawing` itself.
* ERC20s do not require `decimal` is implemented so `ShitCoinGrabBag.sol` assumes 18 (the most common).  We should be able to have 18 as fallback and try to get actual from contracts.
* Circuit breaker pattern implemented in case contract needs to be paused.

## Improvements
* Is there any need to store what we think the balance of our erc20s are?  We can just ask each contract for our balance.  It already works like this on frontend but would need to have contract call as well.
* Can we move to pull (via `approve` and `transferFrom` methods) instead of push for erc20 transfer?