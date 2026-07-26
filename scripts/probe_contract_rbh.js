const { ethers } = require("ethers");

// PROVEN RBH contract probe (RobinGeckos 0x3bbb...d47ebbd, 2026-07-17)
// Works when RPC getTransaction returns input:undefined and Blockscout proxy eth_getTransactionByHash returns null.
const PROV = new ethers.JsonRpcProvider("https://rpc.mainnet.chain.robinhood.com/");
const C = process.argv[2] || "0x3bbb4359c6147ca6881745903c439c601d47ebbd";

const viewABI = [
  "function name() view returns (string)",
  "function symbol() view returns (string)",
  "function totalSupply() view returns (uint256)",
  "function maxSupply() view returns (uint256)",
  "function owner() view returns (address)",
];

(async () => {
  console.log("=== CONTRACT", C);
  const code = await PROV.getCode(C);
  console.log("codeLen:", (code.length - 2) / 2);
  if (code.startsWith("0x363d3d373d3d3d363d73")) {
    const impl = "0x" + code.slice(20, 60);
    console.log("EIP-1167 proxy -> impl:", impl);
  }

  const c = new ethers.Contract(C, viewABI, PROV);
  for (const f of ["name","symbol","totalSupply","maxSupply","owner"]) {
    try { console.log(f + ":", (await c[f]()).toString()); } catch(e){}
  }

  // Mint selector discovery: scan recent tx via Blockscout account=txlist (RPC input is undefined on RBH)
  const url = `https://robinhoodchain.blockscout.com/api?module=account&action=txlist&address=${C}&page=1&offset=10&sort=desc`;
  const r = await fetch(url);
  const j = await r.json();
  const txs = (j.result || []).filter(t => t.input && t.input.length > 10);
  console.log("=== recent tx (", txs.length, ") — common selector = mint ===");
  const freq = {};
  for (const t of txs) {
    const sel = t.input.slice(0, 10);
    freq[sel] = (freq[sel] || 0) + 1;
    console.log(sel, "value(eth):", ethers.formatEther(t.value || 0), "from:", t.from.slice(0,12));
  }
  const top = Object.entries(freq).sort((a,b)=>b[1]-a[1])[0];
  if (top) {
    console.log(">>> LIKELY MINT SELECTOR:", top[0], "(count", top[1] + ")");
    const t = txs.find(x => x.input.slice(0,10) === top[0]);
    const rest = t.input.slice(10);
    for (let i=0; i+64<=rest.length; i+=64) {
      console.log(`   arg${i/64+1}:`, ethers.toBigInt("0x"+rest.slice(i,i+64)).toString());
    }
    console.log("   value(eth):", ethers.formatEther(t.value || 0), "(0 = FREEMINT)");
  }
})();
