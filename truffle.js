module.exports = {
  // See <http://truffleframework.com/docs/advanced/configuration>
  // to customize your Truffle configuration!
  networks: {
    development: {
      host: "127.0.0.1",
      port: "8545",
      network_id: "5777"
    },
    main: {
      host: "https://mainnet.infura.io",
      port: "80",
      network_id: "mainnet"
    }
  }
};