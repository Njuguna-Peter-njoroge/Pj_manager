import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  InternalServerErrorException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';
import { CreateProjectDto } from './dto/create-project-dto';
import { UpdateProjectDto } from './dto/update-project-dto';
import { ProjectResponseDto } from './dto/project-response-dto';
import { UserRole, ProjectStatus, EmailStatus } from '@prisma/client';
import { ApiResponse } from '../common/interfaces/api-response.interface';

@Injectable()
export class ProjectsService {
  constructor(
    private prisma: PrismaService,
    private emailService: EmailService,
  ) {}

  async create(
    createProjectDto: CreateProjectDto,
    userRole: UserRole,
  ): Promise<ApiResponse<ProjectResponseDto>> {
    if (userRole !== UserRole.ADMIN) {
      throw new ForbiddenException('Only admins can create projects');
    }

    try {
      const existingProject = await this.prisma.project.findFirst({
        where: { name: createProjectDto.name },
      });

      if (existingProject) {
        throw new ConflictException('A project with this name already exists');
      }

      const project = await this.prisma.project.create({
        data: {
          name: createProjectDto.name,
          description: createProjectDto.description,
          startDate: new Date(),
          endDate: createProjectDto.endDate,
          status: ProjectStatus.IN_PROGRESS,
          emailStatus: EmailStatus.NOT_SENT,
        },
        include: {
          assignee: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });

      return {
        success: true,
        message: 'Project created successfully',
        data: project,
      };
    } catch (error) {
      if (error instanceof ConflictException) {
        throw error;
      }
      throw new InternalServerErrorException('Failed to create project');
    }
  }

  async getUserProject(
    userId: string,
  ): Promise<ApiResponse<ProjectResponseDto | null>> {
    const project = await this.prisma.project.findFirst({
      where: {
        assigneeId: userId,
        status: { not: 'COMPLETED' },
      },
    });
    return {
      success: true,
      message: project ? 'Project found' : 'No active project',
      data: project,
    };
  }

  async markAsCompleted(
    id: string,
    userId: string,
    userRole: UserRole,
  ): Promise<ApiResponse<ProjectResponseDto>> {
    const project = await this.findOne(id, userRole, userId);

    if (userRole === UserRole.USER && project.assigneeId !== userId) {
      throw new ForbiddenException(
        'You can only complete your assigned projects',
      );
    }

    if (project.status === ProjectStatus.COMPLETED) {
      throw new ConflictException('Project is already completed');
    }

    try {
      const updatedProject = await this.prisma.project.update({
        where: { id },
        data: {
          status: ProjectStatus.COMPLETED,
          updatedAt: new Date(),
        },
        include: {
          assignee: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });

      const assigneeName = updatedProject.assignee?.name ?? 'Unknown User';
      await this.emailService.sendProjectCompletionEmail(
        updatedProject.name,
        assigneeName,
      );

      return {
        success: true,
        message: 'Project marked as completed successfully',
        data: updatedProject,
      };
    } catch (error) {
      if (
        error instanceof ForbiddenException ||
        error instanceof ConflictException ||
        error instanceof NotFoundException
      ) {
        throw error;
      }
      throw new InternalServerErrorException(
        `Failed to complete project: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  async findAll(
    userRole: UserRole,
    userId: string,
  ): Promise<ApiResponse<ProjectResponseDto[]>> {
    try {
      const whereClause =
        userRole === UserRole.USER
          ? {
              OR: [
                { assigneeId: userId },
                {
                  AND: [
                    { status: ProjectStatus.COMPLETED },
                    { assigneeId: null },
                  ],
                },
              ],
            }
          : {};

      const projects = await this.prisma.project.findMany({
        where: whereClause,
        include: {
          assignee: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      if (userRole === UserRole.USER) {
        const assignedProject = projects.find((p) => p.assigneeId === userId);
        const message = assignedProject
          ? `You have an ${assignedProject.status.toLowerCase()} project`
          : 'You can take on a new project';

        return {
          success: true,
          message,
          data: projects as ProjectResponseDto[],
        };
      }

      return {
        success: true,
        message: 'Projects retrieved successfully',
        data: projects as ProjectResponseDto[],
      };
    } catch (error) {
      if (error instanceof ConflictException) {
        throw error;
      }
      throw new InternalServerErrorException(
        `Failed to retrieve projects: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }

  async findOne(
    id: string,
    userRole: UserRole,
    userId: string,
  ): Promise<ProjectResponseDto> {
    const project = await this.prisma.project.findUnique({
      where: { id },
      include: {
        assignee: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    if (!project) {
      throw new NotFoundException(`Project with ID ${id} not found`);
    }

    if (userRole === UserRole.USER && project.assigneeId !== userId) {
      throw new ForbiddenException('You can only view your assigned projects');
    }

    return project as ProjectResponseDto;
  }

  async update(
    id: string,
    updateProjectDto: UpdateProjectDto,
    userRole: UserRole,
    userId: string,
  ): Promise<ApiResponse<ProjectResponseDto>> {
    const project = await this.findOne(id, userRole, userId);

    if (userRole === UserRole.USER && project.assigneeId !== userId) {
      throw new ForbiddenException(
        'You can only update your assigned projects',
      );
    }

    try {
      if (updateProjectDto.assigneeId) {
        if (userRole !== UserRole.ADMIN) {
          throw new ForbiddenException('Only admins can assign projects');
        }

        const assignee = await this.prisma.user.findUnique({
          where: { id: updateProjectDto.assigneeId },
          select: { email: true, name: true },
        });

        if (!assignee) {
          throw new NotFoundException('Assignee not found');
        }

        const existingProject = await this.prisma.project.findFirst({
          where: {
            assigneeId: updateProjectDto.assigneeId,
            status: { not: ProjectStatus.COMPLETED },
          },
        });

        if (existingProject) {
          throw new ConflictException(
            'User already has an active project. Must complete current project first.',
          );
        }

        const emailSent = await this.emailService.sendProjectAssignmentEmail(
          assignee,
          project.name,
        );

        const updatedProject = await this.prisma.project.update({
          where: { id },
          data: {
            ...updateProjectDto,
            emailStatus: emailSent ? EmailStatus.SENT : EmailStatus.NOT_SENT,
          },
          include: {
            assignee: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        });

        return {
          success: true,
          message: `Project assigned successfully${
            !emailSent ? ' (email notification failed)' : ''
          }`,
          data: updatedProject,
        };
      }

      // Handle other updates
      const updatedProject = await this.prisma.project.update({
        where: { id },
        data: updateProjectDto,
        include: {
          assignee: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });

      return {
        success: true,
        message: 'Project updated successfully',
        data: updatedProject,
      };
    } catch (error) {
      if (
        error instanceof ForbiddenException ||
        error instanceof ConflictException ||
        error instanceof NotFoundException
      ) {
        throw error;
      }
      throw new InternalServerErrorException('Failed to update project');
    }
  }

  async remove(id: string, userRole: UserRole): Promise<ApiResponse<null>> {
    if (userRole !== UserRole.ADMIN) {
      throw new ForbiddenException('Only admins can delete projects');
    }

    const project = await this.prisma.project.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        status: true,
        assigneeId: true,
      },
    });

    if (!project) {
      throw new NotFoundException(`Project with ID ${id} not found`);
    }

    if (project.assigneeId && project.status !== ProjectStatus.COMPLETED) {
      throw new ForbiddenException(
        'Cannot delete assigned project before completion',
      );
    }

    try {
      await this.prisma.project.delete({ where: { id } });
      return {
        success: true,
        message: `Project "${project.name}" (ID: ${project.id}) has been deleted successfully`,
        data: null,
      };
    } catch (error) {
      if (error instanceof ConflictException) {
        throw error;
      }
      throw new InternalServerErrorException(
        `Failed to delete project: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  async assignProject(
    projectId: string,
    userId: string | null,
  ): Promise<ApiResponse<ProjectResponseDto>> {
    try {
      // Check if project exists
      const project = await this.prisma.project.findUnique({
        where: { id: projectId },
      });
      if (!project) {
        throw new NotFoundException(`Project with ID ${projectId} not found`);
      }

      // Check if user exists
      if (userId) {
        const user = await this.prisma.user.findUnique({
          where: { id: userId },
        });
        if (!user) {
          throw new NotFoundException('User not found');
        }
        // Check if user already has an active project
        const existingProject = await this.prisma.project.findFirst({
          where: {
            assigneeId: userId,
            status: { not: ProjectStatus.COMPLETED },
          },
        });
        if (existingProject) {
          throw new ConflictException(
            'User already has an active project. Must complete current project first.',
          );
        }
      }

      // Assign or unassign
      const updated = await this.prisma.project.update({
        where: { id: projectId },
        data: { assigneeId: userId || null },
        include: {
          assignee: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });

      return {
        success: true,
        message: userId ? 'Project assigned' : 'Project unassigned',
        data: updated,
      };
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof ConflictException
      ) {
        throw error;
      }
      throw new InternalServerErrorException(
        error instanceof Error ? error.message : String(error),
      );
    }
  }

  async getAllUserProjects(
    userId: string,
  ): Promise<ApiResponse<ProjectResponseDto[]>> {
    const projects = await this.prisma.project.findMany({
      where: { assigneeId: userId },
      orderBy: { createdAt: 'desc' },
    });
    return {
      success: true,
      message: 'All user projects fetched',
      data: projects,
    };
  }
}
