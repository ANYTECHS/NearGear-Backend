import { NestFactory } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { writeFileSync } from 'fs';
import { AppModule } from '../dist/src/app.module.js';

async function main() {
  const app = await NestFactory.create(AppModule, { logger: false });

  const config = new DocumentBuilder()
    .setTitle('AI Treasury Agent API')
    .setDescription(
      'REST API for AI-powered Programmable Treasury Management on NEAR Protocol.\n\n' +
      'Features:\n' +
      '- Web3 Nonce & Signature Authentication (NEAR Ed25519)\n' +
      '- Treasury Management & On-chain Vault Integration\n' +
      '- NEAR & NEP-141 Live Balance Verification\n' +
      '- Transaction Proposals & Approval Workflows\n' +
      '- Rule Engine & Automated Limit Enforcement\n' +
      '- AI Assistant with Grounded Treasury Insights & Anomaly Detection',
    )
    .setVersion('1.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'JWT',
        description: 'Enter your JWT token obtained from /api/auth/verify',
        in: 'header',
      },
      'JWT-auth',
    )
    .build();

  const document = SwaggerModule.createDocument(app, config);
  writeFileSync('./swagger.json', JSON.stringify(document, null, 2));
  console.log('✅ Exported swagger.json successfully');
  await app.close();
  process.exit(0);
}

main().catch((err) => {
  console.error('Error generating swagger:', err);
  process.exit(1);
});

