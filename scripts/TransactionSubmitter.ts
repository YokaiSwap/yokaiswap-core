import { promises as fs } from "fs";
import { providers, BigNumber } from "ethers";

const { readFile, writeFile } = fs;

interface TXReceipts {
  [key: string]: providers.TransactionReceipt;
}

function jsonRevive(_key: string, val: { type: string; hex: string }): any {
  if (val && typeof val == "object") {
    if (val.type === "BigNumber") {
      return BigNumber.from(val.hex);
    }
  }

  return val;
}

export class TransactionSubmitter {
  static async newWithHistory(
    filePath: string,
    replaceExistFile = false,
  ): Promise<TransactionSubmitter> {
    let receipts: TXReceipts = {};

    console.log(`Running: Load transaction history ${filePath}`);
    try {
      const jsonData = await readFile(filePath, "utf8");
      receipts = JSON.parse(jsonData, jsonRevive) as TXReceipts;

      if (replaceExistFile) {
        console.log(
          "    Ignoring exist history, history file will be replaced",
        );
        receipts = {};
      } else {
        console.log("    Loaded");
      }
    } catch (err) {
      if (err.code === "ENOENT") {
        console.log(`    New history created`);
      } else {
        console.log(
          `    Failed to load transaction history file: ${filePath}:`,
          err,
        );
      }
    }

    return new TransactionSubmitter(receipts, filePath);
  }

  static async loadReceipts(filePath: string): Promise<TXReceipts> {
    let receipts: TXReceipts = {};

    try {
      const jsonData = await readFile(filePath, "utf8");
      receipts = JSON.parse(jsonData, jsonRevive) as TXReceipts;
      return receipts;
    } catch (err) {
      throw new Error(
        `Failed to load transaction history file: ${filePath}: ${err}`,
      );
    }
  }

  public defaultConfirmations = 1;
  constructor(private receipts: TXReceipts, public filePath: string) {}

  public async submitAndWait(
    key: string,
    action: () => Promise<providers.TransactionResponse>,
  ): Promise<providers.TransactionReceipt> {
    let receipt = this.getReceipt(key);

    if (receipt) {
      console.log(`Skipping transaction: ${key}`);
      return receipt;
    }

    console.log(`Running transaction: ${key}`);
    const res = await action();
    console.log("    Tx Hash:", res.hash);

    receipt = await res.wait(this.defaultConfirmations);

    if (receipt == null) {
      throw new Error("    Transaction has no receipt");
    }

    this.receipts[key] = receipt;

    await this.saveHistory();

    return receipt;
  }

  public getReceipt(key: string): providers.TransactionReceipt | null {
    return this.receipts[key] || null;
  }

  private async saveHistory() {
    const jsonData = JSON.stringify(this.receipts, null, 2);
    await writeFile(this.filePath, jsonData, "utf8");
  }
}
