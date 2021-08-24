# YokaiSwap Core

## Local Development

The following assumes the use of `node@>=14`.

### Install Dependencies

`yarn`

### Compile Contracts

`yarn compile`

## Deployment

First, create a `.env` file, remember to replace placeholders with real value.

```sh
cat > .env <<EOF
DEPLOYER_PRIVATE_KEY=< replace with your private key >
RPC_URL=< polyjuice web3 rpc >
NETWORK_SUFFIX=< gw-testnet or gw-mainnet >

ROLLUP_TYPE_HASH=< replace with godwoken rollup type hash >
ETH_ACCOUNT_LOCK_CODE_HASH=< replace with godwoken eth-account-lock code hash >
EOF
```

Then compile and deploy.

```sh
yarn compile
yarn deploy
```
