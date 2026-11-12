import { jest } from '@jest/globals';
import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { NearService } from '../blockchain/near.service.js';

describe('AuthService', () => {
  let service: AuthService;
  let prisma: any;
  let jwtService: any;
  let nearService: any;

  const mockAddress = 'alice.testnet';
  const mockNonce = 'abcdef1234567890abcdef1234567890';

  beforeEach(async () => {
    prisma = {
      authNonce: {
        create: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      wallet: {
        findUnique: jest.fn(),
        create: jest.fn(),
      },
      user: {
        create: jest.fn(),
        findUnique: jest.fn(),
      },
    };

    jwtService = {
      sign: jest.fn().mockReturnValue('mock-jwt-token'),
    };

    nearService = {
      normalizeAccountId: jest.fn((addr: string) => addr.toLowerCase()),
      isValidAccountId: jest.fn((addr: string) => addr === 'alice.testnet' || addr === 'bob.near'),
      verifySignature: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: prisma },
        { provide: JwtService, useValue: jwtService },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string, defaultValue?: any) => {
              if (key === 'frontendUrl') return 'http://localhost:3000';
              if (key === 'nearNetwork') return 'testnet';
              return defaultValue;
            }),
          },
        },
        { provide: NearService, useValue: nearService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  describe('generateNonce', () => {
    it('should generate a valid nonce and formatted sign-in message', async () => {
      prisma.authNonce.create.mockResolvedValue({});

      const result = await service.generateNonce(mockAddress);

      expect(result).toHaveProperty('nonce');
      expect(result).toHaveProperty('message');
      expect(result.message).toContain(mockAddress);
      expect(result.message).toContain('Nonce:');
      expect(prisma.authNonce.create).toHaveBeenCalled();
    });

    it('should reject an invalid NEAR account ID', async () => {
      await expect(service.generateNonce('invalid-address!!')).rejects.toThrow(BadRequestException);
    });
  });

  describe('verifySignature', () => {
    const validMessage = `Welcome to VaultIQ — NEAR Treasury Agent!\n\nPlease sign this message.\n\nAccount: ${mockAddress}\nNonce: ${mockNonce}`;

    it('should verify signature successfully and return JWT', async () => {
      prisma.authNonce.findUnique.mockResolvedValue({
        id: 'nonce-1',
        nonce: mockNonce,
        address: mockAddress.toLowerCase(),
        expiresAt: new Date(Date.now() + 60000),
        used: false,
      });

      nearService.verifySignature.mockResolvedValue(true);

      prisma.wallet.findUnique.mockResolvedValue({
        id: 'wallet-1',
        address: mockAddress.toLowerCase(),
        chainId: 0,
        isPrimary: true,
        user: { id: 'user-1', name: 'Alice', email: null },
      });

      const result = await service.verifySignature(
        mockAddress,
        'ed25519-valid-sig',
        validMessage,
      );

      expect(result.accessToken).toBe('mock-jwt-token');
      expect(result.user.wallet.id).toBe('wallet-1');
      expect(prisma.authNonce.update).toHaveBeenCalledWith({
        where: { id: 'nonce-1' },
        data: { used: true },
      });
    });

    it('should reject if signature verification fails', async () => {
      prisma.authNonce.findUnique.mockResolvedValue({
        id: 'nonce-1',
        nonce: mockNonce,
        address: mockAddress.toLowerCase(),
        expiresAt: new Date(Date.now() + 60000),
        used: false,
      });

      nearService.verifySignature.mockResolvedValue(false);

      await expect(
        service.verifySignature(mockAddress, 'invalidsig', validMessage),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should reject if nonce is already used', async () => {
      prisma.authNonce.findUnique.mockResolvedValue({
        id: 'nonce-1',
        nonce: mockNonce,
        address: mockAddress.toLowerCase(),
        expiresAt: new Date(Date.now() + 60000),
        used: true,
      });

      await expect(
        service.verifySignature(mockAddress, 'sig', validMessage),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should reject if nonce has expired', async () => {
      prisma.authNonce.findUnique.mockResolvedValue({
        id: 'nonce-1',
        nonce: mockNonce,
        address: mockAddress.toLowerCase(),
        expiresAt: new Date(Date.now() - 60000), // expired in past
        used: false,
      });

      await expect(
        service.verifySignature(mockAddress, 'sig', validMessage),
      ).rejects.toThrow(UnauthorizedException);
    });
  });
});
