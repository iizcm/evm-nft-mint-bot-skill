const { ethers } = require("ethers");
const fs = require("fs");
const h = require("./blockscout_helper.js");

const prov = new ethers.JsonRpcProvider("https://rpc.mainnet.chain.robinhood.com/");
const subs = require("/root/wallet/sybil_wallets.json").subs;
const SEADROP = "0x00005EA00Ac477B1030CE78506496e8C2dE24bf5";
const GASLIMIT = 150000n;
const GASPRICE = 67000000n; // 0.067 gwei RBH (dekat baseFee)
const FUND_MIN = ethers.parseEther("0.00002"); // saldo minimal buat mint
const CDC_FILE = "/root/ai-mint-bot/calldata_sub0.txt"; // template terbukti (sub0 lu)
const ORIG_MINTER = "0xea29bd21dd507bba7b83c7c2b2df64030c92a361";

// ---- build calldata: ganti minter asli -> sub target ----
function buildCalldata(cdc, newMinter) {
  const nm = newMinter.toLowerCase().replace("0x", "");
  const needle = "000000000000000000000000" + ORIG_MINTER.replace("0x", "");
  const repl = "000000000000000000000000" + nm;
  return cdc.includes(needle) ? cdc.replace(needle, repl) : cdc;
}

// ---- auto-sniff calldata dari explorer (buak next project) ----
async function sniffMintTx(contract) {
  const BASE = h.BASE;
  let url = `${BASE}addresses/${contract}/transactions`;
  let seen = 0;
  while (url) {
    const r = await axios.get(url, { headers: h.headers });
    for (const tx of (r.data.items || [])) {
      seen++;
      if (tx.status !== "ok" && tx.status !== true) continue;
      const inp = tx.raw_input || "";
      if (inp.startsWith("0x161ac21f") || inp.startsWith("0x4b61cd6f")) {
        return { hash: tx.hash, input: inp, from: tx.from ? (tx.from.hash || tx.from) : "" };
      }
    }
    const np = r.data.next_page_params;
    if (!np || seen > 2000) break;
    url = `${BASE}addresses/${contract}/transactions?${new URLSearchParams(np).toString()}`;
  }
  throw new Error("gak nemu tx mint di contract");
}

// ---- mint 1 sub (auto-fund kalau kurang) ----
async function mintSub(sub, cdc, prim) {
  const bal = await prov.getBalance(sub.address);
  if (bal < ethers.parseEther("0.000011")) {
    if (!prim) return { ok: false, why: "no-gas" };
    const t = await prim.sendTransaction({ to: sub.address, value: FUND_MIN });
    await t.wait();
  }
  const w = new ethers.Wallet(sub.pk, prov);
  const tx = await w.sendTransaction({ to: SEADROP, data: cdc, gasLimit: GASLIMIT, gasPrice: GASPRICE, value: 0n });
  const rc = await tx.wait();
  return { ok: rc.status === 1, hash: tx.hash, block: rc.blockNumber };
}

// ---- MAIN: mint-project [contract] ----
async function mintProject(contract, opts = {}) {
  const only = opts.only || subs.length;
  const cdc = fs.readFileSync(CDC_FILE, "utf8").trim();
  console.log(`[mint-project] template=calldata_sub0 subs=${only}`);
  const prim = new ethers.Wallet(require("/root/wallet/sybil_wallets.json").primary.pk, prov);
  let ok = 0, fail = 0, nogas = 0;
  for (let i = 0; i < only; i++) {
    const sub = subs[i];
    const data = buildCalldata(cdc, sub.address);
    const bal = await prov.getBalance(sub.address);
    if (bal < ethers.parseEther("0.000011") && !prim) { nogas++; console.log(`[${i}] SKIP no-gas`); continue; }
    try {
      if (bal < ethers.parseEther("0.000011")) {
        const t = await prim.sendTransaction({ to: sub.address, value: FUND_MIN });
        await t.wait();
      }
      const w = new ethers.Wallet(sub.pk, prov);
      const tx = await w.sendTransaction({ to: SEADROP, data, gasLimit: GASLIMIT, gasPrice: GASPRICE, value: 0n });
      const rc = await tx.wait();
      if (rc.status === 1) { ok++; console.log(`[${i}] OK ${sub.address.slice(0, 8)} ${tx.hash.slice(0, 14)}`); }
      else { fail++; console.log(`[${i}] REVERT`); }
    } catch (e) { fail++; console.log(`[${i}] ERR ${e.reason || e.message}`); }
    await new Promise((r) => setTimeout(r, 1200));
  }
  console.log(`\n[DONE] ok=${ok} fail=${fail} nogas=${nogas} / ${only}`);
  return { ok, fail, nogas };
}

module.exports = { mintProject, sniffMintTx, buildCalldata, mintSub };
if (require.main === module) {
  const c = process.argv[2];
  if (!c) { console.log("pakai: node mint_project.js 0xCONTRACT"); process.exit(1); }
  mintProject(c).catch((e) => console.log("ERR", e.message));
}
