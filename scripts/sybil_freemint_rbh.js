// SYBIL FREEMINT — direct mint() (non-SeaDrop), proven RBH RobinGeckos 2026-07-17
// Usage: node scripts/sybil_freemint_rbh.js [N] [contract] [selector]
//   N         = jumlah sub (default 10). User rule: jangan auto-100, batch 10 dulu.
//   contract  = NFT contract (default RobinGeckos 0x3bbb...d47ebbd)
//   selector  = mint selector (default 0xa22cb465 = mint(address,uint256))
// Wallet JSON: /root/wallet/sybil_wallets.json { primary:{address,pk}, subs:[{address,pk}] }
//
// FLOW: primary fund tiap sub (native) -> sub kirim calldata mint(to=self, qty=1) value=0
//   cuma butuh GAS (~0.067 gwei RBH, ~0.0000045 ETH/sub).
// PITFALL FIX: kalau ethers sendTransaction kasih "missing revert data"/"could not coalesce",
//   pakai legacy type:0 signed tx + provider.broadcastTransaction(signed).

const { ethers } = require("ethers");
const fs = require("fs");
const d = require("/root/wallet/sybil_wallets.json");
const PROV = new ethers.JsonRpcProvider("https://rpc.mainnet.chain.robinhood.com/");
const C = process.argv[3] || "0x3bbb4359c6147ca6881745903c439c601d47ebbd";
const SEL = process.argv[4] || "0xa22cb465";
const N = parseInt(process.argv[2] || "10");

function cd(to){ return SEL + ethers.zeroPadValue(to,32).slice(2) + ethers.zeroPadValue(ethers.toBeHex(1),32).slice(2); }
const sleep = (ms)=>new Promise(r=>setTimeout(r,ms));

async function mintSub(w, to, gasPrice){
  for (let a=0;a<4;a++){
    try {
      const tx = await w.sendTransaction({ to:C, data:cd(to), value:0n, gasPrice });
      const rc = await tx.wait();
      if (rc.status===1) return {ok:true, hash:tx.hash};
      return {ok:false, reason:"revert"};
    } catch(e){
      const m = e.shortMessage||e.message;
      if (/revert|require/.test(m)) return {ok:false, reason:m.slice(0,50)};
      try {
        const tx = { to:C, data:cd(to), value:0n, gasPrice, gasLimit:80000, type:0,
                     nonce: await PROV.getTransactionCount(to,"latest"), chainId:4663 };
        const signed = await w.signTransaction(tx);
        const sent = await PROV.broadcastTransaction(signed);
        const rc = await sent.wait();
        if (rc.status===1) return {ok:true, hash:sent.hash};
        return {ok:false, reason:"revert"};
      } catch(e2){
        const m2 = e2.shortMessage||e2.message;
        if (/revert|require/.test(m2)) return {ok:false, reason:m2.slice(0,50)};
        await sleep(2000);
      }
    }
  }
  return {ok:false, reason:"rpc_glitch"};
}

(async () => {
  const wP = new ethers.Wallet(d.primary.pk, PROV);
  const gasPrice = (await PROV.getFeeData()).gasPrice;
  const subs = d.subs.slice(0, N);
  const results = [];
  for (let i=0;i<subs.length;i++){
    const s = subs[i];
    const wSub = new ethers.Wallet(s.pk, PROV);
    const bal = await PROV.getBalance(s.address);
    const need = gasPrice * 80000n;
    if (bal < need) {
      const fund = gasPrice * 90000n;
      try { const tx = await wP.sendTransaction({ to:s.address, value:fund, gasPrice }); await tx.wait();
            console.log(`[${i}] funded ${s.address} ${ethers.formatEther(fund)}`);
      } catch(e){ console.log(`[${i}] FUND FAIL ${e.shortMessage||e.message.slice(0,50)}`); results.push({i,status:"fund_fail"}); continue; }
    }
    const r = await mintSub(wSub, s.address, gasPrice);
    console.log(`[${i}] ${s.address} -> ${r.ok? "OK "+r.hash.slice(0,12) : "FAIL "+r.reason}`);
    results.push({i, addr:s.address, status:r.ok?"ok":"fail", tx:r.hash});
    await sleep(1500);
  }
  const ok = results.filter(r=>r.status==="ok").length;
  console.log(`\n=== DONE ${ok}/${N} minted ===`);
  fs.writeFileSync("/root/ai-mint-bot/freemint_log.json", JSON.stringify(results,null,2));
})();
