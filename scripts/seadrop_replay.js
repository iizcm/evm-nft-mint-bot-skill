// SeaDrop RAW CALLDATA REPLAY — TERBUKTI WORK DI RBH CHAIN (selector 0x161ac21f)
// Usage: node seadrop_replay.js  (butuh CONFIG.CAPTURED_CALLDATA + sybil_wallets.json)
const { ethers } = require("ethers");
const fs = require("fs");
const RPC = "https://rpc.mainnet.chain.robinhood.com/";
const SEADROP = "0x00005EA00Ac477B1030CE78506496e8C2dE24bf5";

const CONFIG = {
  CAPTURED_CALLDATA: fs.existsSync("calldata_sub0.txt")
    ? fs.readFileSync("calldata_sub0.txt", "utf8").trim()
    : "0x161ac21fPASTE", // capture dari tx mint LU SENDIRI via eth_getTransactionByHash
  ORIG_MINTER: "0xea29bd21dd507bba7b83c7c2b2df64030c92a361", // minter asli (lowercase no 0x)
  GAS_LIMIT: 600000n,
};

// load 100 sub PK
let SUB_PKS = [];
try {
  SUB_PKS = require("/root/wallet/sybil_wallets.json").subs.map((s) => s.pk);
} catch (e) {}

function buildCalldata(tpl, newMinter) {
  const nm = newMinter.toLowerCase().replace("0x", "");
  const ORIG = CONFIG.ORIG_MINTER.toLowerCase().replace("0x", "");
  const needle = "000000000000000000000000" + ORIG;
  const repl = "000000000000000000000000" + nm;
  return tpl.includes(needle) ? tpl.replace(needle, repl) : tpl;
}

async function mintRawReplay(pk) {
  const wallet = new ethers.Wallet(pk, new ethers.JsonRpcProvider(RPC));
  const calldata = buildCalldata(CONFIG.CAPTURED_CALLDATA, wallet.address);
  const tx = await wallet.sendTransaction({
    to: SEADROP,
    data: calldata,
    value: 0n,
    gasLimit: CONFIG.GAS_LIMIT,
  });
  return await tx.wait();
}

async function runLoop() {
  console.log(`[LOOP] ${SUB_PKS.length} sub`);
  let ok = 0, fail = 0;
  for (let i = 0; i < SUB_PKS.length; i++) {
    try {
      const rc = await mintRawReplay(SUB_PKS[i]);
      console.log(`[${i}] OK ${SUB_PKS[i].slice(0, 10)} block ${rc.blockNumber}`);
      ok++;
    } catch (e) {
      console.log(`[${i}] FAIL ${SUB_PKS[i].slice(0, 10)} ${e.reason || e.message}`);
      fail++;
    }
    await new Promise((r) => setTimeout(r, 1500));
  }
  console.log(`\n[DONE] ok=${ok} fail=${fail}`);
}

if (require.main === module) {
  if (!CONFIG.CAPTURED_CALLDATA.startsWith("0x161ac21f")) {
    console.log("!! Isi CAPTURED_CALLDATA dulu (dari tx mint LU sendiri)");
    process.exit(1);
  }
  runLoop().catch((e) => { console.log("ERR", e.message); process.exit(1); });
}
module.exports = { runLoop, mintRawReplay, buildCalldata };
