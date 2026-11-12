import fs from 'fs';
import path from 'path';
import os from 'os';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
let nearApi;
try {
  nearApi = require('/usr/local/lib/node_modules/near-cli/node_modules/near-api-js');
} catch {
  nearApi = require('near-api-js');
}

const accountId = 'hardicon1140.testnet';
const privateKey = 'ed25519:4PWRud8GjeWbBTTbX4mUvU9Z5JpQGasdbLkrgwKWXNTa15p14gDBN46Jw1XsfcVEAVkw92m7KnaZMziQJkfG6Dzk';

const kp = nearApi.KeyPair.fromString(privateKey);
const publicKey = kp.getPublicKey().toString();

console.log('Account ID:', accountId);
console.log('Public Key:', publicKey);

const homeDir = os.homedir();
const credsDir = path.join(homeDir, '.near-credentials', 'testnet');
fs.mkdirSync(credsDir, { recursive: true });

const credPath = path.join(credsDir, `${accountId}.json`);
fs.writeFileSync(credPath, JSON.stringify({
  account_id: accountId,
  public_key: publicKey,
  private_key: privateKey,
  secret_key: privateKey
}, null, 2));

console.log('Successfully wrote credentials to:', credPath);

