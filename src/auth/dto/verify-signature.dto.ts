import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, Length, Matches } from 'class-validator';

export class VerifySignatureDto {
  @ApiProperty({
    description: 'NEAR account ID',
    example: 'alice.testnet',
  })
  @IsString()
  @IsNotEmpty()
  @Length(2, 64, { message: 'NEAR account ID must be between 2 and 64 characters' })
  @Matches(/^(([a-z0-9]+[-_])*[a-z0-9]+\.)*([a-z0-9]+[-_])*[a-z0-9]+$|^[0-9a-fA-F]{64}$/, {
    message: 'Address must be a valid NEAR account ID or implicit account ID',
  })
  address: string;

  @ApiProperty({
    description: 'Signature (Base64 or Hex encoded) from wallet signMessage (NEP-413 / Ed25519)',
    example: 'ed25519-signature-in-base64-or-hex',
  })
  @IsString()
  @IsNotEmpty()
  signature: string;

  @ApiProperty({
    description: 'Original sign-in message that was signed',
  })
  @IsString()
  @IsNotEmpty()
  message: string;

  @ApiPropertyOptional({
    description: 'Optional public key from NEAR wallet (e.g. ed25519:...)',
    example: 'ed25519:D6Z5Vf...',
  })
  @IsOptional()
  @IsString()
  publicKey?: string;

  @ApiPropertyOptional({
    description: 'Optional nonce string (if omitted, automatically extracted from message)',
    example: 'abcdef1234567890abcdef1234567890',
  })
  @IsOptional()
  @IsString()
  nonce?: string;
}
