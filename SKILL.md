---
name: evm-nft-mint-bot
description: "AI agent (Node.js + Ethers + IAMHC/OpenAI function-calling) untuk mint NFT otomatis di EVM chain. Dua mode: PUBLIC MINT langsung (panggil mint() tanpa signature) untuk EVM umum, dan SEADROP SNIFF (tangkap mintSigned signature dari OpenSea lewat browser automation). Pakai saat user mau bot mint NFT, cek contract, atau otomasi mint."
version: 1.0.0
author: Community
license: MIT
platforms: [linux, macos, windows]
tags: [general]
---

# Evm Nft Mint Bot — Skill

AI agent (Node.js + Ethers + IAMHC/OpenAI function-calling) untuk mint NFT otomatis di EVM chain. Dua mode: PUBLIC MINT langsung (panggil mint() tanpa signature) untuk EVM umum, dan SEADROP SNIFF (tangkap mintSigned signature dari OpenSea lewat browser automation). Pakai saat user mau bot mint NFT, cek contract, atau otomasi mint.

## Install

```bash
cp -r <skill-name> ~/.hermes/skills/<skill-path>/
```

Or clone this repository:

```bash
git clone https://github.com/iizcm/evm-nft-mint-bot-skill.git ~/.hermes/skills/<skill-path>/
```

## Usage

Invoke your AI agent with a clear instruction matching this skill's purpose. The agent will route tasks to this skill when the instruction matches its description or trigger keywords.

Refer to `README.md` in this repository for:
- Detailed step-by-step installation guide
- Bilingual documentation (English + Indonesian)
- Troubleshooting table
- Security best practices
- Customization tips

## Safety rules

- Never commit private keys, seed phrases, API tokens, or personal data to version control
- Use placeholders (`<YOUR_...>`) in all examples and code snippets
- Validate all outputs before acting on them
- Keep real credentials in your runtime's secure credential store only
