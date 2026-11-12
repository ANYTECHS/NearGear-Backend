#!/usr/bin/env bash
set -e
cd /mnt/c/Users/DELL/Desktop/NEAR/NearGuard-Backend
near deploy treasury.hardicon1140.testnet contracts/build/treasury_vault.wasm --initFunction init --initArgs '{"owner_id": "hardicon1140.testnet"}' --networkId testnet

