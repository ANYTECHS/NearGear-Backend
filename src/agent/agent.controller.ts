import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiResponse,
} from '@nestjs/swagger';
import { AgentService } from './agent.service.js';
import { AgentPermissionsService } from './agent-permissions.service.js';
import { AgentChatDto } from './dto/agent-chat.dto.js';
import { CreateAgentDto } from './dto/create-agent.dto.js';
import { UpdateAgentDto } from './dto/update-agent.dto.js';
import { AgentSpendRequestDto } from './dto/agent-spend-request.dto.js';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { Public } from '../common/decorators/public.decorator.js';

@ApiTags('AI Agent & Security Permissions')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('api/agent')
export class AgentController {
  constructor(
    private readonly agentService: AgentService,
    private readonly permissionsService: AgentPermissionsService,
  ) {}

  // ==========================================
  // AI COPILOT & HEALTH ASSISTANT
  // ==========================================

  @Post('chat')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Chat with AI Treasury Agent with grounded real-time treasury context',
  })
  @ApiResponse({
    status: 200,
    description: 'AI Response and extracted recommendations',
  })
  async chat(@CurrentUser('userId') userId: string, @Body() dto: AgentChatDto) {
    const data = await this.agentService.chat(userId, dto);
    return {
      message: 'AI response generated successfully',
      data,
    };
  }

  @Get(':treasuryId/insights')
  @ApiOperation({ summary: 'Get AI-generated treasury insights' })
  @ApiResponse({ status: 200, description: 'Insights list' })
  async getInsights(
    @Param('treasuryId') treasuryId: string,
    @CurrentUser('userId') userId: string,
  ) {
    const data = await this.agentService.getInsights(treasuryId, userId);
    return {
      message: 'Insights retrieved successfully',
      data,
    };
  }

  @Get(':treasuryId/recommendations')
  @ApiOperation({ summary: 'Get AI proposed recommendations for a treasury' })
  @ApiResponse({ status: 200, description: 'Recommendations list' })
  async getRecommendations(
    @Param('treasuryId') treasuryId: string,
    @CurrentUser('userId') userId: string,
  ) {
    const data = await this.agentService.getRecommendations(
      treasuryId,
      userId,
    );
    return {
      message: 'Recommendations retrieved successfully',
      data,
    };
  }

  @Get(':treasuryId/messages')
  @ApiOperation({ summary: 'Get conversation history with AI Agent' })
  @ApiResponse({ status: 200, description: 'Chat message history' })
  async getMessages(
    @Param('treasuryId') treasuryId: string,
    @CurrentUser('userId') userId: string,
  ) {
    const data = await this.agentService.getMessages(treasuryId, userId);
    return {
      message: 'Chat history retrieved successfully',
      data,
    };
  }

  @Post(':treasuryId/analyze')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Run comprehensive anomaly detection and financial health analysis',
  })
  @ApiResponse({ status: 200, description: 'Analysis results' })
  async analyze(
    @Param('treasuryId') treasuryId: string,
    @CurrentUser('userId') userId: string,
  ) {
    const data = await this.agentService.analyzeTreasury(treasuryId, userId);
    return {
      message: 'Treasury analyzed successfully',
      data,
    };
  }

  // ==========================================
  // AGENT MANAGEMENT & PERMISSION POLICIES
  // ==========================================

  @Post(':treasuryId/agents')
  @ApiOperation({
    summary:
      'Register an AI Agent and configure spending permissions (Approved recipients, Instant approval limit, Approved tasks, Time window)',
  })
  @ApiResponse({ status: 201, description: 'Agent registered with security rules' })
  async createAgent(
    @Param('treasuryId') treasuryId: string,
    @CurrentUser('userId') userId: string,
    @Body() dto: CreateAgentDto,
  ) {
    const data = await this.permissionsService.createAgent(
      treasuryId,
      userId,
      dto,
    );
    return {
      message: 'AI Agent registered with configured security policies',
      data,
    };
  }

  @Get(':treasuryId/agents')
  @ApiOperation({ summary: 'List all registered AI Agents and their security rules' })
  @ApiResponse({ status: 200, description: 'List of agents' })
  async listAgents(
    @Param('treasuryId') treasuryId: string,
    @CurrentUser('userId') userId: string,
  ) {
    const data = await this.permissionsService.listAgents(treasuryId, userId);
    return {
      message: 'Agents retrieved successfully',
      data,
    };
  }

  @Get(':treasuryId/agents/:agentId')
  @ApiOperation({ summary: 'Get details and security rules for a specific AI agent' })
  @ApiResponse({ status: 200, description: 'Agent details' })
  async getAgentById(
    @Param('treasuryId') treasuryId: string,
    @Param('agentId') agentId: string,
    @CurrentUser('userId') userId: string,
  ) {
    const data = await this.permissionsService.getAgentById(
      treasuryId,
      agentId,
      userId,
    );
    return {
      message: 'Agent details retrieved successfully',
      data,
    };
  }

  @Patch(':treasuryId/agents/:agentId')
  @ApiOperation({ summary: 'Update security permissions and spending limits for an AI agent' })
  @ApiResponse({ status: 200, description: 'Agent updated' })
  async updateAgent(
    @Param('treasuryId') treasuryId: string,
    @Param('agentId') agentId: string,
    @CurrentUser('userId') userId: string,
    @Body() dto: UpdateAgentDto,
  ) {
    const data = await this.permissionsService.updateAgent(
      treasuryId,
      agentId,
      userId,
      dto,
    );
    return {
      message: 'Agent permissions updated successfully',
      data,
    };
  }

  @Delete(':treasuryId/agents/:agentId')
  @ApiOperation({ summary: 'Remove an AI agent from the treasury' })
  @ApiResponse({ status: 200, description: 'Agent deleted' })
  async deleteAgent(
    @Param('treasuryId') treasuryId: string,
    @Param('agentId') agentId: string,
    @CurrentUser('userId') userId: string,
  ) {
    const data = await this.permissionsService.deleteAgent(
      treasuryId,
      agentId,
      userId,
    );
    return data;
  }

  // ==========================================
  // 4 PERMISSIONS ENFORCEMENT & SPENDING GATEWAY
  // ==========================================

  @Public()
  @Post('spend-request')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Autonomous Agent Spend Gateway: Evaluates Approved Recipient, Transaction Approval Threshold, Task-Based, and Time-Based Permissions',
  })
  @ApiResponse({
    status: 200,
    description:
      'Evaluation result: AUTO_APPROVED (under threshold), PENDING_APPROVAL (over threshold), or BLOCKED_BY_POLICY',
  })
  async spendRequest(@Body() dto: AgentSpendRequestDto) {
    const result =
      await this.permissionsService.evaluateAndProcessSpendRequest(dto);
    return {
      message: result.evaluation.reason,
      data: result,
    };
  }

  @Get(':treasuryId/spend-requests')
  @ApiOperation({
    summary:
      'List all spend requests processed for this treasury with policy decisions and approval status',
  })
  @ApiResponse({ status: 200, description: 'List of spend requests' })
  async listSpendRequests(
    @Param('treasuryId') treasuryId: string,
    @CurrentUser('userId') userId: string,
  ) {
    const data = await this.permissionsService.listSpendRequests(
      treasuryId,
      userId,
    );
    return {
      message: 'Spend requests retrieved successfully',
      data,
    };
  }

  @Get(':treasuryId/spend-requests/:requestId')
  @ApiOperation({ summary: 'Get details of a specific agent spend request' })
  @ApiResponse({ status: 200, description: 'Spend request details' })
  async getSpendRequestById(
    @Param('treasuryId') treasuryId: string,
    @Param('requestId') requestId: string,
    @CurrentUser('userId') userId: string,
  ) {
    const data = await this.permissionsService.getSpendRequestById(
      treasuryId,
      requestId,
      userId,
    );
    return {
      message: 'Spend request details retrieved successfully',
      data,
    };
  }
}
