import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  HttpCode,
  HttpStatus,
  ValidationPipe,
  ParseUUIDPipe,
  UseGuards,
  Patch,
} from '@nestjs/common';
import { ProjectsService } from './projects.service';
import { CreateProjectDto } from './dto/create-project-dto';
import { UpdateProjectDto } from './dto/update-project-dto';
import { ApiResponse } from '../common/interfaces/api-response.interface';
import { ProjectResponseDto } from './dto/project-response-dto';
import { UserRole } from '@prisma/client';
import { User } from '../common/decorators/user.decorator';
import { AuthUser } from '../common/interfaces/auth-user.interface';
import { Roles } from '../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/Guards/jwt-auth.guard';
import { RolesGuard } from '../auth/Guards/roles.guard';

@Controller('projects')
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Body(ValidationPipe) createProjectDto: CreateProjectDto,
    @User() user: AuthUser,
  ): Promise<ApiResponse<ProjectResponseDto>> {
    return this.projectsService.create(createProjectDto, user.role);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async findAll(
    @User() user: AuthUser,
  ): Promise<ApiResponse<ProjectResponseDto[]>> {
    return this.projectsService.findAll(user.role, user.id);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @User() user: AuthUser,
  ): Promise<ApiResponse<ProjectResponseDto>> {
    const project = await this.projectsService.findOne(id, user.role, user.id);
    return {
      success: true,
      message: 'Project retrieved successfully',
      data: project,
    };
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(ValidationPipe) updateProjectDto: UpdateProjectDto,
    @User() user: AuthUser,
  ): Promise<ApiResponse<ProjectResponseDto>> {
    return this.projectsService.update(
      id,
      updateProjectDto,
      user.role,
      user.id,
    );
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
    @User() user: AuthUser,
  ): Promise<ApiResponse<null>> {
    return this.projectsService.remove(id, user.role);
  }

  @Patch(':id/complete')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async markProjectCompleted(
    @Param('id', ParseUUIDPipe) id: string,
    @User() user: AuthUser,
  ): Promise<ApiResponse<ProjectResponseDto>> {
    return this.projectsService.markAsCompleted(id, user.id, user.role);
  }

  @Patch(':id/assign')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  async assignProject(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('userId') userId: string,
  ): Promise<ApiResponse<ProjectResponseDto>> {
    return this.projectsService.assignProject(id, userId);
  }

  @Get('user/:userId')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async getUserProject(
    @Param('userId', ParseUUIDPipe) userId: string,
  ): Promise<ApiResponse<ProjectResponseDto | null>> {
    return this.projectsService.getUserProject(userId);
  }

  @Get('user/:userId/all')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async getAllUserProjects(
    @Param('userId', ParseUUIDPipe) userId: string,
  ): Promise<ApiResponse<ProjectResponseDto[]>> {
    return this.projectsService.getAllUserProjects(userId);
  }
}
