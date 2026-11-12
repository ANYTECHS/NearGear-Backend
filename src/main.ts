import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module.js';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule);

  // 1. CORS Configuration
  const allowedOrigins = [
    process.env.FRONTEND_URL || 'http://localhost:3000',
    'http://localhost:3001',
    'http://localhost:5173',
    'https://vaultiq-web.vercel.app',
  ];

  app.enableCors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, curl, server-to-server)
      if (!origin || allowedOrigins.includes(origin) || origin.endsWith('.vercel.app')) {
        callback(null, true);
      } else {
        callback(null, true); // Permissive for development & staging
      }
    },
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
    allowedHeaders: 'Content-Type, Accept, Authorization',
  });

  // 2. Global Validation Pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: false,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // 3. Swagger OpenAPI Documentation
  const config = new DocumentBuilder()
    .setTitle('NearGear — AI Treasury & Agent Security API')
    .setDescription(
      'Smart AI. Secure Treasury.\n\n' +
      'Businesses can give AI agents permission to spend money, but NearGear makes sure they spend only within the rules established by the business.\n\n' +
      '### Core Security Permissions:\n' +
      '1. **Approved Recipient Permission**: Autonomous agents can only disburse payments to wallet addresses pre-approved by the treasury owner (e.g. paying approved cloud hosting or APIs, rejecting unknown recipients).\n' +
      '2. **Transaction Approval Permission**: Payments at or below the instant threshold (e.g. 5 NEAR) are auto-approved; payments above require human owner approval.\n' +
      '3. **Task-Based Permission**: Agents can only spend on authorized task and service categories (e.g. cloud_hosting, research_apis, compute_resources).\n' +
      '4. **Time-Based Permission**: Agents can only initiate disbursements during authorized operating windows (e.g. 8:00 AM - 6:00 PM UTC, Mon-Fri).\n\n' +
      '### Additional Capabilities:\n' +
      '- **Multi-Wallet NEAR Authentication**: Universal support for Meteor Wallet, Sender Wallet, Here Wallet, MyNearWallet, and NEAR Mobile (Ed25519 & NEP-413 signatures).\n' +
      '- **Real-Time Telegram Notifications**: Instant alert dispatch via Telegram Bot to treasury owners and support groups on all agent disbursements, approval requests, and policy violations.\n' +
      '- **Multi-Asset Treasury Management**: Live NEAR & NEP-141 token tracking on NEAR Testnet and Mainnet.\n' +
      '- **On-Chain TreasuryVault Smart Contract**: Verifiable smart contract enforcement on NEAR Protocol.\n' +
      '- **Rule Engine & Outlier Anomaly Detection**: Comprehensive pre-execution evaluation for agent operations.\n' +
      '- **Grounded AI Treasury Copilot**: Groq / LLaMA 3.3 powered natural language treasury management.',
    )
    .setVersion('1.1')
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
  SwaggerModule.setup('api/docs', app, document, {
    customSiteTitle: 'NearGear API Docs',
    swaggerOptions: {
      persistAuthorization: true,
    },
  });

  // Export Swagger JSON specification for frontend and client generators
  try {
    const { writeFileSync } = await import('fs');
    writeFileSync('./swagger.json', JSON.stringify(document, null, 2));
  } catch (err) {
    logger.warn(`Could not export swagger.json: ${err.message}`);
  }

  const port = process.env.PORT || 4000;
  await app.listen(port, '0.0.0.0');

  logger.log(`=======================================================`);
  logger.log(`🚀 AI Treasury Agent Backend running on port ${port}`);
  logger.log(`📚 Swagger Documentation: http://localhost:${port}/api/docs`);
  logger.log(`🩺 Health Check: http://localhost:${port}/api/health`);
  logger.log(`=======================================================`);
}

bootstrap();
