const axios = require("axios");
const { ethers } = require("ethers");
require("dotenv").config();

// ============================================================
//  KONFIGURASI — ISI MANUAL DARI CHROME NETWORK TAB
// ============================================================
const CONFIG = {
  RPC: "https://rpc.mainnet.chain.robinhood.com/",
  CHAIN_ID: 4663,
  SEADROP: "0x00005EA00Ac477B1030CE78506496e8C2dE24bf5", // SeaDrop contract
  NFT: "0x76792239cd5f64192b4dc28dc88ba6c03bd05448",     // Robin Hoodies

  // ▼▼▼ ISI DARI NETWORK TAB (saat klik Mint di OpenSea) ▼▼▼
  OPENSEA_ENDPOINT: "https://api.opensea.io/api/v2/chain/robinhood/mint/request", // <-- sesuaikan
  HEADERS: {
    "Content-Type": "application/json",
    "User-Agent": "Mozilla/5.0",
    "Cookie": "session=...",          // <-- paste session cookie dari browser lu
    "X-API-KEY": "a964f4e88f0043c790acbc953cbe52aa",
  },
  PAYLOAD: {
    // contoh: { nftContract: "0x7679...", minter: "0x...", quantity: 1 }
    // <-- paste persis dari Network tab
  },
  // ============================================================

  PRIVATE_KEY: process.env.PRIVATE_KEY, // PK wallet yg ELIGIBLE (holder/allowlist)
};

// ============================================================
//  STEP 1 — SNIFF SIGNATURE DARI OPENSEA
// ============================================================
async function getSeaDropSignature() {
  console.log("[1] hitting OpenSea:", CONFIG.OPENSEA_ENDPOINT);
  const res = await axios.post(CONFIG.OPENSEA_ENDPOINT, CONFIG.PAYLOAD, { headers: CONFIG.HEADERS });
  const d = res.data;
  const out = {
    signature: d.signature || d.mintSignature || (d.allowedNftToken && d.allowedNftToken.signature) || (d.dropStage && d.dropStage.signature),
    mintPrice: d.mintPrice || d.mintValue || "0",
    nonce:     d.nonce || (d.dropStage && d.dropStage.nonce) || 0,
    mintValue: d.mintValue || d.mintPrice || "0",
    feeBps:    d.feeBps || 0,
    startTime: d.startTime || (d.dropStage && d.dropStage.startTime) || 0,
    endTime:   d.endTime || (d.dropStage && d.dropStage.endTime) || 0,
  };
  if (!out.signature) throw new Error("signature gak dapet. response: " + JSON.stringify(d).slice(0,200));
  console.log("[1] signature OK, nonce:", out.nonce, "price:", out.mintPrice);
  return out;
}

// ============================================================
//  STEP 2 — REPLICATE KE mintSigned() DI RBH CHAIN
// ============================================================
const SEADROP_ABI = [
  "function mintSigned(address nftContract,uint256 mintValue,uint256 feeBps,uint256 startTime,uint256 endTime,uint256 nonce,bytes signature) payable returns (uint256)"
];

async function mintOnChain(sig, wallet) {
  const provider = new ethers.JsonRpcProvider(CONFIG.RPC);
  const seadrop = new ethers.Contract(CONFIG.SEADROP, SEADROP_ABI, wallet.connect(provider));
  console.log("[2] calling mintSigned on RBH...");
  const tx = await seadrop.mintSigned(
    CONFIG.NFT,
    ethers.toBigInt(sig.mintValue),
    ethers.toBigInt(sig.feeBps),
    ethers.toBigInt(sig.startTime),
    ethers.toBigInt(sig.endTime),
    ethers.toBigInt(sig.nonce),
    sig.signature,
    { value: ethers.toBigInt(sig.mintPrice), gasLimit: 600000n }
  );
  const rc = await tx.wait();
  console.log("[2] MINTED block", rc.blockNumber, "tx", rc.hash);
  return rc.hash;
}

// ============================================================
//  MAIN — LOOP BANYAK WALLET (opsional)
// ============================================================
async function main() {
  const sig = await getSeaDropSignature();
  const wallet = new ethers.Wallet(CONFIG.PRIVATE_KEY, new ethers.JsonRpcProvider(CONFIG.RPC));
  console.log("[*] minter:", wallet.address);
  await mintOnChain(sig, wallet);
}

// NOTE: kalau mintSigned REVERT karena ABI beda (SeaDrop version lain),
// solusi: replay RAW CALLDATA dari Network tab (ganti field 'minter' di calldata ke wallet baru,
// lalu wallet.sendTransaction({to: SEADROP, data: rawCalldata, value})).
// Raw calldata capture: di Network tab, lihat request ke rpc dgn input 0x4b61cd6f... — itu calldata lengkap.

if (require.main === module) main().catch(e => { console.log("ERR", e.reason || e.message); process.exit(1); });
module.exports = { getSeaDropSignature, mintOnChain };
