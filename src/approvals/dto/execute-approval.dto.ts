import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class ExecuteApprovalDto {
  @ApiProperty({
    description: 'Submitted NEAR transaction hash (Base58)',
    example: 'E4bVn9V5dCq3aK7vUf9ZtP2xM1sH4jL8rY6wQ3eA7bC',
  })
  @IsString()
  @IsNotEmpty()
  txHash: string;
}
