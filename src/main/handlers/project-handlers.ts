import { existsSync } from 'fs';
import { mkdir } from 'fs/promises';
import { join } from 'path';
import { ipcMain } from 'electron';

import { getWorkspaceDir } from '../lib/config';
import {
  createConversation,
  getConversation,
  listProjects,
  type Conversation
} from '../lib/conversation-db';
import { getCurrentProjectPath, setCurrentProjectPath } from '../lib/session';

/**
 * Generates a short unique ID for project folder names.
 * Format: 6 alphanumeric characters
 */
function generateShortId(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * Sanitizes a project name for use in folder names.
 * Removes special characters and replaces spaces with hyphens.
 */
function sanitizeName(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '') // Remove special characters
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-') // Remove consecutive hyphens
    .substring(0, 50); // Limit length
}

export interface Project {
  id: string;
  title: string;
  projectPath: string;
  createdAt: number;
  updatedAt: number;
}

export function registerProjectHandlers(): void {
  // Create a new project
  ipcMain.handle('project:create', async (_event, projectName: string) => {
    const workspace = getWorkspaceDir();

    if (!workspace) {
      return {
        success: false,
        error: 'Workspace not configured.'
      };
    }

    if (!projectName?.trim()) {
      return {
        success: false,
        error: 'Project name is required'
      };
    }

    try {
      // Projects are always created at {workspace}/projects/
      const projectsDirectory = join(workspace, 'projects');

      // Ensure projects directory exists
      if (!existsSync(projectsDirectory)) {
        await mkdir(projectsDirectory, { recursive: true });
      }

      const shortId = generateShortId();
      const sanitizedName = sanitizeName(projectName);
      const folderName = sanitizedName ? `${sanitizedName}-${shortId}` : shortId;
      const projectPath = join(projectsDirectory, folderName);

      // Check if folder already exists (unlikely with ID)
      if (existsSync(projectPath)) {
        return {
          success: false,
          error: 'Project folder already exists. Please try again.'
        };
      }

      // Create the project folder
      await mkdir(projectPath, { recursive: true });

      // Create conversation linked to this project
      const conversation = createConversation({
        title: projectName.trim(),
        messages: [],
        projectPath
      });

      console.log('Project created:', {
        id: conversation.id,
        title: conversation.title,
        projectPath: conversation.projectPath
      });

      // Set current project path (scopes agent's cwd to this directory)
      setCurrentProjectPath(projectPath);

      // NOTE: Sessions continue running in background - new sessions will use new projectPath

      const project: Project = {
        id: conversation.id,
        title: conversation.title,
        projectPath: projectPath,
        createdAt: conversation.createdAt,
        updatedAt: conversation.updatedAt
      };

      return {
        success: true,
        project
      };
    } catch (error) {
      console.error('Failed to create project:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create project'
      };
    }
  });

  // List all projects
  ipcMain.handle('project:list', async (_event, limit: number = 50) => {
    try {
      const conversations = listProjects(limit);
      console.log('project:list - raw conversations from DB:', conversations.length);
      conversations.forEach((c) =>
        console.log('  -', { id: c.id, title: c.title, projectPath: c.projectPath })
      );

      const projects: Project[] = conversations
        .filter((c): c is Conversation & { projectPath: string } => !!c.projectPath)
        .map((c) => ({
          id: c.id,
          title: c.title,
          projectPath: c.projectPath,
          createdAt: c.createdAt,
          updatedAt: c.updatedAt
        }));

      console.log('project:list - returning projects:', projects.length);

      return {
        success: true,
        projects
      };
    } catch (error) {
      console.error('Failed to list projects:', error);
      return {
        success: false,
        projects: [],
        error: error instanceof Error ? error.message : 'Failed to list projects'
      };
    }
  });

  // Switch to a project (load conversation + set workspace)
  ipcMain.handle('project:switch', async (_event, projectId: string) => {
    try {
      console.log('project:switch called with projectId:', projectId, 'type:', typeof projectId);
      const conversation = getConversation(projectId);
      console.log(
        'getConversation result:',
        conversation ? { id: conversation.id, title: conversation.title } : null
      );

      if (!conversation) {
        // Debug: list all projects to see what IDs are in DB
        const allProjects = listProjects(100);
        console.error('Project not found for id:', projectId);
        console.log(
          'Available project IDs in DB:',
          allProjects.map((p) => p.id)
        );
        return {
          success: false,
          error: 'Project not found'
        };
      }

      if (!conversation.projectPath) {
        return {
          success: false,
          error: 'Conversation is not associated with a project'
        };
      }

      // Check if project folder exists
      if (!existsSync(conversation.projectPath)) {
        return {
          success: false,
          error: 'Project folder no longer exists'
        };
      }

      // Set current project path (scopes agent's cwd to this directory)
      setCurrentProjectPath(conversation.projectPath);

      // NOTE: Sessions continue running in background when switching projects
      // Sessions are keyed by conversationId and run independently
      // New sessions will use the new projectPath, existing sessions continue with their original cwd

      const project: Project = {
        id: conversation.id,
        title: conversation.title,
        projectPath: conversation.projectPath,
        createdAt: conversation.createdAt,
        updatedAt: conversation.updatedAt
      };

      return {
        success: true,
        project,
        conversation: {
          id: conversation.id,
          title: conversation.title,
          messages: conversation.messages,
          sessionId: conversation.sessionId
        }
      };
    } catch (error) {
      console.error('Failed to switch project:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to switch project'
      };
    }
  });

  // Get current project info (if a project is active)
  ipcMain.handle('project:current', async () => {
    try {
      const currentPath = getCurrentProjectPath();

      if (!currentPath) {
        return {
          success: true,
          project: null
        };
      }

      // Find the project matching the current path
      const projects = listProjects(100);
      const currentProject = projects.find((p) => p.projectPath === currentPath);

      if (currentProject && currentProject.projectPath) {
        return {
          success: true,
          project: {
            id: currentProject.id,
            title: currentProject.title,
            projectPath: currentProject.projectPath,
            createdAt: currentProject.createdAt,
            updatedAt: currentProject.updatedAt
          } as Project
        };
      }

      return {
        success: true,
        project: null
      };
    } catch (error) {
      console.error('Failed to get current project:', error);
      return {
        success: false,
        project: null,
        error: error instanceof Error ? error.message : 'Failed to get current project'
      };
    }
  });

  // Close/leave current project (return to workspace root)
  ipcMain.handle('project:close', async () => {
    try {
      // Clear current project path
      setCurrentProjectPath(null);

      // NOTE: Sessions continue running in background - new sessions will use workspace cwd

      return {
        success: true
      };
    } catch (error) {
      console.error('Failed to close project:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to close project'
      };
    }
  });
}
