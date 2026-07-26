const axios = require("axios");
const fs = require("fs");
require("dotenv").config();

// RBH explorer lokal (TANPA key, 200 OK). api.blockscout.com/4663 -> 402 (plan gak cover).
const API_KEY = process.env.BLOCKSCOUT_API_KEY;
const BASE = "https://robinhoodchain.blockscout.com/api/v2/";
const NFT = "0x76792239cd5f64192b4dc28dc88ba6c03bd05448"; // Robin Hoodies
const headers = API_KEY ? { "X-API-KEY": API_KEY } : {};

// 1. Ambil raw calldata dari tx hash (alternatif RPC eth_getTransactionByHash)
async function fetchCalldataFromBlockscout(txHash) {
  const r = await axios.get(`${BASE}transactions/${txHash}`, { headers });
  if (r.data && r.data.raw_input) return r.data.raw_input;
  throw new Error("raw_input kosong: " + JSON.stringify(r.data).slice(0, 120));
}

// 2. Tracker: saldo native + NFT ownership 100 sub
function loadSubs() {
  return require("/root/wallet/sybil_wallets.json").subs;
}

async function getNativeBalance(addr) {
  const r = await axios.get(`${BASE}addresses/${addr}`, { headers });
  return BigInt(r.data.coin_balance || "0");
}

async function getNftBalance(addr) {
  // endpoint BENER utk RBH: tokens?type=ERC-721 (nft/collections -> 422)
  const r = await axios.get(`${BASE}addresses/${addr}/tokens?type=ERC-721`, { headers });
  const items = r.data.items || [];
  const found = items.find((i) => i.address && i.address.toLowerCase() === NFT.toLowerCase());
  return found ? Number(found.amount || found.value || 1) : 0;
}

async function trackAll() {
  const subs = loadSubs();
  const rows = [];
  let totalNative = 0n, totalNft = 0;
  for (let i = 0; i < subs.length; i++) {
    const a = subs[i].address;
    try {
      const [bal, nft] = await Promise.all([getNativeBalance(a), getNftBalance(a)]);
      totalNative += bal; totalNft += nft;
      rows.push({ i, addr: a, balEth: Number(bal) / 1e18, nft });
    } catch (e) { rows.push({ i, addr: a, err: e.message.slice(0, 40) }); }
  }
  const minted = rows.filter((r) => r.nft > 0).length;
  const noGas = rows.filter((r) => r.balEth !== undefined && r.balEth < 0.000011).length;
  return { total: subs.length, minted, noGas, totalNativeEth: Number(totalNative) / 1e18, totalNft, rows };
}

module.exports = { fetchCalldataFromBlockscout, trackAll, getNativeBalance, getNftBalance, loadSubs, API_KEY, BASE };
