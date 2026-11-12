import { NestFactory } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { writeFileSync } from 'fs';
import { AppModule } from '../dist/src/app.module.js';

async function main() {
  const app = await NestFactory.create(AppModule, { logger: false });

  const config = new DocumentBuilder()
    .setTitle('NearGear — AI Treasury & Agent Security API')
    .setDescription(
      'Smart AI. Secure Treasury.\n\n' +
      'Businesses can give AI agents permission to spend money, but NearGear makes sure they spend only within the rules established by the business.\n\n' +
      '### Core Security Permissions:\n' +
      '1. **Approved Recipient Permission**: Autonomous agents can only disburse payments to wallet addresses pre-approved by the treasury owner.\n' +
      '2. **Transaction Approval Permission**: Payments at or below the instant threshold (e.g. 5 NEAR) are auto-approved; payments above require human owner approval.\n' +
      '3. **Task-Based Permission**: Agents can only spend on authorized task and service categories (e.g. cloud_hosting, research_apis, compute_resources).\n' +
      '4. **Time-Based Permission**: Agents can only initiate disbursements during authorized operating windows (e.g. 8:00 AM - 6:00 PM UTC, Mon-Fri).\n\n' +
      '### Additional Capabilities:\n' +
      '- Web3 Nonce & Signature Authentication (NEAR Ed25519)\n' +
      '- Multi-Asset Treasury Management with Live NEAR & NEP-141 Balances\n' +
      '- On-Chain TreasuryVault Smart Contract Enforcement\n' +
      '- Rule Engine & Outlier Anomaly Detection\n' +
      '- Grounded AI Treasury Copilot (Groq / LLaMA 3.3)',
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

