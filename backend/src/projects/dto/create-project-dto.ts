import {
  IsNotEmpty,
  IsString,
  IsOptional,
  IsDateString,
  IsISO8601,
} from 'class-validator';
import { ProjectStatus } from '../interfaces/project.interface';

export class CreateProjectDto {
  @IsNotEmpty()
  @IsString()
  name!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsISO8601()
  @IsNotEmpty({ message: 'endDate should not be empty' })
  @IsDateString()
  endDate!: string;

  @IsString()
  @IsOptional()
  assigneeId?: string;

  @IsString()
  @IsOptional()
  status?: ProjectStatus;
}
