import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface TokenMetadata {
  address: string;
  name: string;
  symbol: string;
  decimals: number;
}

export interface TokenBalanceInfo {
  tokenAddress: string;
  symbol: string;
  name: string;
  decimals: number;
  balanceRaw: string;
  balanceFormatted: string;
}

@Injectable()
export class BlockchainService implements OnModuleInit {
  private readonly logger = new Logger(BlockchainService.name);
  private rpcUrl: string;
  private network: string;

  constructor(private configService: ConfigService) {}

  onModuleInit() {
    this.network = this.configService.get<string>('nearNetwork', 'testnet');
    this.rpcUrl = this.configService.get<string>(
      'nearRpcUrl',
      this.network === 'mainnet'
        ? 'https://rpc.mainnet.near.org'
        : 'https://rpc.testnet.near.org',
    );

    this.logger.log(
      `BlockchainService initialized for NEAR Protocol on network "${this.network}" with RPC ${this.rpcUrl}`,
    );
  }

  getNetwork(): string {
    return this.network;
  }

  getRpcUrl(): string {
    return this.rpcUrl;
  }

  async rpcCall<T = any>(method: string, params: any): Promise<T> {
    try {
      const response = await fetch(this.rpcUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: `vaultiq-${Date.now()}`,
          method,
          params,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error ${response.status}: ${response.statusText}`);
      }

      const json = await response.json();
      if (json.error) {
        throw new Error(
          typeof json.error === 'object'
            ? json.error.message || json.error.name || JSON.stringify(json.error)
            : String(json.error),
        );
      }

      return json.result;
    } catch (error) {
      this.logger.debug(`RPC Call to ${method} failed: ${error.message}`);
      throw error;
    }
  }

  formatYoctoNear(yocto: string | bigint): string {
    const yoctoStr = yocto.toString();
    if (yoctoStr === '0') return '0';

    const decimals = 24;
    const padded = yoctoStr.padStart(decimals + 1, '0');
    const whole = padded.slice(0, padded.length - decimals);
    const frac = padded.slice(padded.length - decimals).replace(/0+$/, '');

    return frac.length > 0 ? `${whole}.${frac}` : whole;
  }

  parseNearToYocto(nearAmount: string): bigint {
    const parts = nearAmount.split('.');
    const whole = parts[0] || '0';
    let frac = parts[1] || '';
    if (frac.length > 24) {
      frac = frac.slice(0, 24);
    } else {
      frac = frac.padEnd(24, '0');
    }
    return BigInt(whole + frac);
  }

  async getNearBalance(accountId: string): Promise<{ raw: bigint; formatted: string }> {
    if (!accountId) {
      return { raw: 0n, formatted: '0' };
    }

    try {
      const result = await this.rpcCall('query', {
        request_type: 'view_account',
        finality: 'final',
        account_id: accountId.trim().toLowerCase(),
      });

      const amountStr = result?.amount || '0';
      const raw = BigInt(amountStr);
      const formatted = this.formatYoctoNear(raw);

      return { raw, formatted };
    } catch (error) {
      this.logger.warn(`Failed to fetch NEAR balance for ${accountId}: ${error.message}`);
      return { raw: 0n, formatted: '0' };
    }
  }

  async getTokenMetadata(tokenContractId: string): Promise<TokenMetadata> {
    const norm = tokenContractId?.trim().toLowerCase();
    if (!norm || norm === 'near' || norm === 'native') {
      return {
        address: 'near',
        name: 'NEAR Protocol Native Token',
        symbol: 'NEAR',
        decimals: 24,
      };
    }

    try {
      const result = await this.rpcCall('query', {
        request_type: 'call_function',
        finality: 'final',
        account_id: norm,
        method_name: 'ft_metadata',
        args_base64: '',
      });

      const bytes = Buffer.from(result.result);
      const metadata = JSON.parse(bytes.toString('utf-8'));

      return {
        address: norm,
        name: metadata.name || norm,
        symbol: metadata.symbol || 'TOKEN',
        decimals: Number(metadata.decimals ?? 24),
      };
    } catch (error) {
      this.logger.warn(`Could not read NEP-141 metadata for ${norm}, using defaults: ${error.message}`);
      return {
        address: norm,
        name: norm,
        symbol: norm.split('.')[0].toUpperCase(),
        decimals: 24,
      };
    }
  }

  async getTokenBalance(
    tokenContractId: string,
    accountId: string,
  ): Promise<TokenBalanceInfo> {
    const normContract = tokenContractId?.trim().toLowerCase();
    const normAccount = accountId?.trim().toLowerCase();

    // Handle Native NEAR token
    if (
      !normContract ||
      normContract === 'near' ||
      normContract === 'native'
    ) {
      const near = await this.getNearBalance(normAccount);
      return {
        tokenAddress: 'near',
        symbol: 'NEAR',
        name: 'NEAR Native Token',
        decimals: 24,
        balanceRaw: near.raw.toString(),
        balanceFormatted: near.formatted,
      };
    }

    const metadata = await this.getTokenMetadata(normContract);

    try {
      const argsBase64 = Buffer.from(
        JSON.stringify({ account_id: normAccount }),
      ).toString('base64');

      const result = await this.rpcCall('query', {
        request_type: 'call_function',
        finality: 'final',
        account_id: normContract,
        method_name: 'ft_balance_of',
        args_base64: argsBase64,
      });

      const bytes = Buffer.from(result.result);
      const balanceStr = JSON.parse(bytes.toString('utf-8')) || '0';
      const balanceBig = BigInt(balanceStr);

      const formatted = this.formatTokenAmount(balanceBig, metadata.decimals);

      return {
        tokenAddress: metadata.address,
        symbol: metadata.symbol,
        name: metadata.name,
        decimals: metadata.decimals,
        balanceRaw: balanceBig.toString(),
        balanceFormatted: formatted,
      };
    } catch (error) {
      this.logger.warn(
        `Error reading NEP-141 balance for ${normContract} on ${normAccount}: ${error.message}`,
      );
      return {
        tokenAddress: metadata.address,
        symbol: metadata.symbol,
        name: metadata.name,
        decimals: metadata.decimals,
        balanceRaw: '0',
        balanceFormatted: '0',
      };
    }
  }

  private formatTokenAmount(amount: bigint, decimals: number): string {
    const str = amount.toString();
    if (str === '0') return '0';
    if (decimals === 0) return str;

    const padded = str.padStart(decimals + 1, '0');
    const whole = padded.slice(0, padded.length - decimals);
    const frac = padded.slice(padded.length - decimals).replace(/0+$/, '');
    return frac.length > 0 ? `${whole}.${frac}` : whole;
  }

  async getTransactionReceipt(txHash: string, accountId?: string) {
    try {
      const result = await this.rpcCall('tx', [txHash, accountId || 'system']);
      return result;
    } catch (error) {
      this.logger.debug(`NEAR transaction not yet available for ${txHash}: ${error.message}`);
      return null;
    }
  }

  async getBlockNumber(): Promise<bigint> {
    try {
      const block = await this.rpcCall('block', { finality: 'final' });
      return BigInt(block?.header?.height || 0);
    } catch (error) {
      this.logger.warn(`Failed to fetch block height from NEAR RPC: ${error.message}`);
      return 0n;
    }
  }
}
