# Robinhood Chain (RBH) — Reference

Chain ID: **4663**
Native token: **ETH** (sama kayak OP/Base/Arbitrum — gak ada token RBH terpisah, native = ETH)
RPC: `https://rpc.mainnet.chain.robinhood.com/`
Explorer: `https://robinhoodchain.blockscout.com/` (blockscout-style API)
Robinscan: `https://robinscan.io/` (tx link: `https://robinscan.io/tx/<hash>`)

## CRITICAL: Mint Mechanics (terbukti sesi ini)
- Mint lewat **SeaDrop `mintSigned`**, BUKAN public mint langsung contract.
- **Selector yg WORK utk raw replay: `0x161ac21f`** (struct: nftContract + fee/salt + minter + signature).
- **Selector `0x4b61cd6f` (tx org) → REVERT kalau di-replay** (struct 9-arg kompleks, signature bound beda). JANGAN pakai.
- Signature di tail calldata = **DROP-STAGE BOUND** (sama di semua tx yg sukses) → raw replay WORK asal ganti minter di arg3.
- Capture calldata YANG BENER: RPC `eth_getTransactionByHash` (blockscout `/api/v2/transactions/{tx}` return EMPTY input — jangan pake).
- Capture dari tx mint **LU SENDIRI**, bukan tx org.

### Calldata shape (0x161ac21f):
```
0x161ac21f
 + nftContract (32): 0000...0000 76792239cd5f64192b4dc28dc88ba6c03bd05448
 + salt/fee   (32):   0000...0000 a26b00c1f0df003000390027140000faa719
 + minter     (32):   0000...0000 <MINTER 20-byte>   <-- INI YANG DIGANTI
 + signature  (32):   0000...0000 3d958fe2
```
Ganti `MINTER` → sub target, signature biarin sama. Replay sukses.

## Contract Addresses (Robin Hoodies)
- NFT contract: `0x76792239cd5f64192b4dc28dc88ba6c03bd05448`
- SeaDrop: `0x00005EA00Ac477B1030CE78506496e8C2dE24bf5`
- Collection: `https://opensea.io/collection/robinhoodies-` (trailing dash)
- Website: `https://robinhood-hoodies-io.vercel.app`

## Public mint test (deploy sendiri buat bukti bot)
- Contract test: `0x4Dd890bF0a0428CD82490A66d4A3906e3E063014` (fn `mint()` gratis, RBH)
- Bot `index.js` sukses mint + verify balance=1 (rule-based AI, gak pake LLM karena IAMHC gak punya gpt-4o)

## Holder scan (union 3 NFT contract)
Script: `/root/holders_scan.py` — loop `eth_getLogs` Transfer event dr block 0 → latest (chunk 5000),
build holder map, output `/root/holders.txt` + `/root/holders.csv`.
Contract gate (Robin Hoodies WL):
- `0xd2e2342e605d9576d788b3c4e1026dc54528987f`
- `0x12449b9a29865621be166aaff04dc14a640b4119`
- `0xf08c65564eb07d880021105489552080b08e4319`
Hasil: **4,173 unique holders**. Allowlist format: `Wallet address,1,0`.

## Gas / Cost
- Gas price RBH: ~0.067 gwei (sangat murah)
- 1 mint SeaDrop (measured tx 0xc1e98db...): gasUsed 100,254 × gasPrice 66.5M wei = **0.00000667 ETH (~$0.013)**. Fund per sub 0.00015 ETH (buffer) → 100 sub = 0.015 ETH (~$29) +buffer 0.018 ETH. JANGAN percaya "$0.05 cukup 100" (itu cuma ~4 sub).
- Freemint = 0 price, cuma gas

## Wallet burner (sybil test)
- Primary: `0x3cDC73Adcf589CaAA05f5f931034E63cD5281426` (fund ETH RBH di sini)
- 100 sub: `/root/wallet/sybil_wallets.json` (PK) + `sybil_addresses.csv` (addr)
- Tiap sub butuh ~0.0001 ETH gas. Primary fund ~0.01 ETH utk 100 sub.
- Flow: primary → distribute gas → loop mintRawReplay (ganti minter) → 100 NFT
- RISK: PK di VPS plaintext = seller VPS bisa liat. Jangan taruh PK utama di VPS.
