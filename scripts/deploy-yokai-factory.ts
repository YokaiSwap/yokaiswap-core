import { Contract, ContractFactory, Overrides, providers } from "ethers";
import { PolyjuiceJsonRpcProvider } from "@polyjuice-provider/ethers";

import { TransactionSubmitter } from "./TransactionSubmitter";
import {
  rpc,
  deployer,
  networkSuffix,
  initGWAccountIfNeeded,
  isGodwoken,
} from "./common";

import YokaiFactory from "../artifacts/contracts/YokaiFactory.sol/YokaiFactory.json";

type TCallStatic = Contract["callStatic"];

interface IYokaiFactoryStaticMethods extends TCallStatic {
  feeToSetter(): Promise<string>;
  INIT_CODE_PAIR_HASH(): Promise<string>;
}

interface IYokaiFactory extends Contract, IYokaiFactoryStaticMethods {
  setFeeToSetter(
    address: string,
    override?: Overrides,
  ): Promise<providers.TransactionResponse>;
  callStatic: IYokaiFactoryStaticMethods;
}

const deployerAddress = deployer.address;
const txOverrides = {
  gasPrice: isGodwoken ? 0 : undefined,
  gasLimit: isGodwoken ? 12_500_000 : undefined,
};

async function main() {
  console.log("Deployer Ethereum address:", deployerAddress);

  await initGWAccountIfNeeded(deployerAddress);

  let deployerRecipientAddress = deployerAddress;
  if (isGodwoken) {
    const { godwoker } = rpc as PolyjuiceJsonRpcProvider;
    deployerRecipientAddress =
      await godwoker.getShortAddressByAllTypeEthAddress(deployerAddress);
    console.log("Deployer Godwoken address:", deployerRecipientAddress);
  }

  const transactionSubmitter = await TransactionSubmitter.newWithHistory(
    `deploy-yokai-factory${networkSuffix ? `-${networkSuffix}` : ""}.json`,
    Boolean(process.env.IGNORE_HISTORY),
  );

  const receipt = await transactionSubmitter.submitAndWait(
    `Deploy YokaiFactory`,
    () => {
      const implementationFactory = new ContractFactory(
        YokaiFactory.abi,
        YokaiFactory.bytecode,
        deployer,
      );
      const tx = implementationFactory.getDeployTransaction(
        deployerRecipientAddress,
      );
      tx.gasPrice = txOverrides.gasPrice;
      tx.gasLimit = txOverrides.gasLimit;
      return deployer.sendTransaction(tx);
    },
  );
  const yokaiFactoryAddress = receipt.contractAddress;
  console.log(`    YokaiFactory address:`, yokaiFactoryAddress);

  const yokaiFactory = new Contract(
    yokaiFactoryAddress,
    YokaiFactory.abi,
    deployer,
  ) as IYokaiFactory;
  console.log(
    "    INIT_CODE_PAIR_HASH:",
    await yokaiFactory.callStatic.INIT_CODE_PAIR_HASH(),
  );
  console.log("    feeToSetter:", await yokaiFactory.callStatic.feeToSetter());
}

main()
  .then(() => {
    process.exit(0);
  })
  .catch((err) => {
    console.log("err", err);
    process.exit(1);
  });
