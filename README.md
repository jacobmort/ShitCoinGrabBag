# Shit Token Grab Bag
#### You put a erc20 token in and you get a random erc20 out.
This was one of the first ideas for a smart contract.  Silly but I wanted an excuse to learn about interacting with erc20 tokens.  
If I put this live I would seed it with some semi-valuable tokens for motivation to play and then a bunch of cheapos to prolong the life.
I think end-state of contract is to fill up with a bunch of cheapest coins around so there might need to be another mechanic to make it viable.

## TODO
* Only the contract owner can conduct the drawing so for this to go live I need to setup a backend which can listen to erc20 Transfer events.
Frontend initiates erc20 transfer and sends contract address to backend -> backend listens for `Transfer` event to Shit Token Grab Bag address -> backend (owner of Shit Token Grab Bag private key) calls `coinDrawing`.

* Backend assumes 18 decimals on erc20 contract- should be able to call contract and receive decimals but that will increase cost of transaction

## Installation

1. Install Truffle globally.
    ```javascript
    npm install -g truffle
    ```

2. Run the development console.
    ```javascript
    truffle develop
    ```

3. Compile and migrate the smart contracts. Note inside the development console we don't preface commands with `truffle`.
    ```javascript
    compile
    migrate
    ```

4. Run the webpack server for front-end hot reloading (outside the development console). Smart contract changes must be manually recompiled and migrated.
    ```javascript
    // Serves the front-end on http://localhost:3000
    npm run start
    ```

5. Truffle can run tests written in Solidity or JavaScript against your smart contracts. Note the command varies slightly if you're in or outside of the development console.
    ```javascript
    // If inside the development console.
    test

    // If outside the development console..
    truffle test
    ```

6. Jest is included for testing React components. Compile your contracts before running Jest, or you may receive some file not found errors.
    ```javascript
    // Run Jest outside of the development console for front-end component tests.
    npm run test
    ```

7. To build the application for production, use the build command. A production build will be in the build_webpack folder.
    ```javascript
    npm run build
    ```
