import { jest } from '@jest/globals';
import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { TelegramService } from './telegram.service.js';

describe('TelegramService — Real-time Transaction Notifications', () => {
  let service: TelegramService;
  let mockFetch: any;

  beforeEach(async () => {
    mockFetch = jest.fn().mockImplementation(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ ok: true, result: { message_id: 123 } }),
      }),
    );
    // @ts-ignore
    global.fetch = mockFetch;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TelegramService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string, defaultValue?: any) => {
              if (key === 'telegramBotToken') return '123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11';
              if (key === 'telegramChatId') return '987654321';
              if (key === 'nearNetwork') return 'testnet';
              return defaultValue;
            }),
          },
        },
      ],
    }).compile();

    service = module.get<TelegramService>(TelegramService);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should identify that telegram is configured when token is set', () => {
    expect(service.isConfigured()).toBe(true);
  });

  it('should send a formatted message via Telegram API', async () => {
    const success = await service.sendMessage('<b>Test Message</b>', '987654321');
    expect(success).toBe(true);
    expect(mockFetch).toHaveBeenCalledWith(
      'https://api.telegram.org/bot123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11/sendMessage',
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: expect.stringContaining('"chat_id":"987654321"'),
      }),
    );
  });

  it('should dispatch Telegram notification when on-chain transaction is recorded', async () => {
    await service.notifyTransactionRecorded({
      treasuryName: 'Main Treasury',
      type: 'TRANSFER',
      amount: '5.0',
      tokenSymbol: 'NEAR',
      fromAddress: 'alice.testnet',
      toAddress: 'bob.testnet',
      txHash: 'E4bVn9V5dCq3aK7vUf9ZtP2xM1sH4jL8rY6wQ3eA7bC',
      status: 'CONFIRMED',
    });

    expect(mockFetch).toHaveBeenCalled();
    const callArgs = mockFetch.mock.calls[0];
    const body = JSON.parse(callArgs[1].body);
    expect(body.text).toContain('NearGear: Transaction CONFIRMED');
    expect(body.text).toContain('5.0 NEAR');
    expect(body.text).toContain('alice.testnet');
    expect(body.text).toContain('bob.testnet');
  });

  it('should dispatch Telegram alert when AI agent payment is auto-approved', async () => {
    await service.notifyAgentSpendApproved({
      treasuryName: 'Main Treasury',
      agentName: 'Computing Agent',
      agentAccountId: 'compute-agent.testnet',
      amount: '2.5',
      recipientAddress: 'hosting.testnet',
      task: 'cloud_hosting',
    });

    expect(mockFetch).toHaveBeenCalled();
    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.text).toContain('AI Agent Payment Auto-Approved');
    expect(body.text).toContain('compute-agent.testnet');
    expect(body.text).toContain('cloud_hosting');
  });

  it('should dispatch Telegram alert when high-value payment requires human approval', async () => {
    await service.notifyAgentSpendApprovalRequired({
      treasuryName: 'Main Treasury',
      agentName: 'Computing Agent',
      agentAccountId: 'compute-agent.testnet',
      amount: '15.0',
      instantLimit: '5.0',
      recipientAddress: 'hosting.testnet',
      task: 'cloud_hosting',
      approvalId: 'appr-123',
    });

    expect(mockFetch).toHaveBeenCalled();
    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.text).toContain('Agent High-Value Payment Requires Approval');
    expect(body.text).toContain('15.0 NEAR');
    expect(body.text).toContain('5.0 NEAR');
  });

  it('should dispatch Telegram security alert when payment is blocked by policy', async () => {
    await service.notifyAgentSpendBlocked({
      treasuryName: 'Main Treasury',
      agentName: 'Computing Agent',
      agentAccountId: 'compute-agent.testnet',
      amount: '1.0',
      recipientAddress: 'hacker.testnet',
      task: 'cloud_hosting',
      violations: ['UNAPPROVED_RECIPIENT: Recipient not in whitelist'],
    });

    expect(mockFetch).toHaveBeenCalled();
    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.text).toContain('NearGear Security Alert: Payment Request Blocked');
    expect(body.text).toContain('hacker.testnet');
    expect(body.text).toContain('UNAPPROVED_RECIPIENT');
  });
});

