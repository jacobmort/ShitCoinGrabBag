# Avoid state changes after external calls
* `transferAToken` function does all state changes before the calling external `send` on erc20 contract

# Enforce invariants with assert() and require()
* `require` guards are in place to check input to functions.  Also used to ensure token `transfer` (`transferAToken`)
* `assert` checks for invalid internal state (`transferAToken`) and for overflow/underflow (`registerToken`)

# Explicitly mark visibility in functions and state variables
* Locked down all functions as much as possible. 
* `internal` methods exposed for testing via `ExposedShitCoinGrabBag.sol`

# Lock pragmas to specific compiler version
* Done for only deployable contract `ShitCoinGrabBag.sol`

# Mark untrusted contracts
* External contract is named `untrustedErc20`