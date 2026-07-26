// verify_mint.js — CEK KEBENARAN MINT on-chain (RBH RPC bohong, jd pake Blockscout)
// Usage: node scripts/verify_mint.js <contract> [count]
// Prints per-sub NFT balance + totalSupply. JANGAN percaya tx.wait() status.
const { ethers } = require("ethers");
const d = require("/root/wallet/sybil_wallets.json");
const C = process.argv[2];
const N = parseInt(process.argv[3] || "100");

const abi = ["function totalSupply() view returns (uint256)",
            "function balanceOf(address) view returns (uint256)"];

(async () => {
  const PROV = new ethers.JsonRpcProvider("https://rpc.mainnet.chain.robinhood.com/");
  const c = new ethers.Contract(C, abi, PROV);
  let ts;
  try { ts = await c.totalSupply(); } catch(e){ ts = "ERR"; }
  console.log("RPC totalSupply:", ts.toString());

  let minted = 0;
  for (let i=0; i<N; i++) {
    const a = d.subs[i].address;
    const url = `https://robinhoodchain.blockscout.com/api?module=account&action=tokenlist&address=${a}`;
    try {
      const r = await fetch(url); const j = await r.json();
      const toks = (j.result||[]).filter(t => t.contractAddress?.toLowerCase()===C.toLowerCase());
      const bal = toks.length ? Number(toks[0].balance) : 0;
      if (bal>0) minted++;
      if (i<10 || bal>0) console.log(`sub${i} ${a.slice(0,10)} RG=${bal}`);
    } catch(e){ console.log(`sub${i} err`); }
    await new Promise(r=>setTimeout(r,300));
  }
  console.log(`\n=== BENERAN MINTED: ${minted}/${N} ===`);
})();
