export interface AppConfig {
  nodeEnv: string;
  port: number;
  databaseUrl: string;
  directUrl?: string;
  jwtSecret: string;
  jwtExpiresIn: string;
  frontendUrl: string;
  nearNetwork: string;
  nearRpcUrl: string;
  nearAccountId?: string;
  nearPrivateKey?: string;
  treasuryContractAddress?: string;
  aiApiKey?: string;
  aiModel: string;
  redisUrl?: string;
  telegramBotToken?: string;
  telegramChatId?: string;
}

export default (): AppConfig => ({
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '4000', 10),
  databaseUrl: process.env.DATABASE_URL || '',
  directUrl: process.env.DIRECT_URL,
  jwtSecret: process.env.JWT_SECRET || 'default-treasury-secret-change-in-production',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000',
  nearNetwork: process.env.NEAR_NETWORK || 'testnet',
  nearRpcUrl: process.env.NEAR_RPC_URL || 'https://rpc.testnet.near.org',
  nearAccountId: process.env.NEAR_ACCOUNT_ID,
  nearPrivateKey: process.env.NEAR_PRIVATE_KEY,
  treasuryContractAddress: process.env.TREASURY_CONTRACT_ADDRESS || process.env.TREASURY_CONTRACT_ID,
  aiApiKey: process.env.AI_API_KEY,
  aiModel: process.env.AI_MODEL || 'qwen/qwen3.8-27b',
  redisUrl: process.env.REDIS_URL,
  telegramBotToken: process.env.TELEGRAM_BOT_TOKEN,
  telegramChatId: process.env.TELEGRAM_CHAT_ID,
});
