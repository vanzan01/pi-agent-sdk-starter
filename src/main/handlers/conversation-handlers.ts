import { ipcMain } from 'electron';

import {
  closeDatabase,
  createConversation,
  deleteConversation,
  generateTitleFromMessages,
  getConversation,
  getDatabaseStats,
  getDatabaseStatus,
  initializeDatabase,
  listConversations,
  updateConversation
} from '../lib/conversation-db';

export function registerConversationHandlers(): void {
  // Initialize database on app start
  initializeDatabase();

  ipcMain.handle('conversation:list', async () => {
    try {
      const conversations = listConversations();
      return { success: true, conversations };
    } catch (error) {
      console.error('Error listing conversations:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  });

  ipcMain.handle(
    'conversation:create',
    async (_event, messages: unknown[], sessionId?: string | null) => {
      try {
        const title = generateTitleFromMessages(messages);
        const conversation = createConversation(title, messages, sessionId);
        return { success: true, conversation };
      } catch (error) {
        console.error('Error creating conversation:', error);
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error occurred'
        };
      }
    }
  );

  ipcMain.handle('conversation:get', async (_event, id: string) => {
    try {
      const conversation = getConversation(id);
      if (!conversation) {
        return { success: false, error: 'Conversation not found' };
      }
      return { success: true, conversation };
    } catch (error) {
      console.error('Error getting conversation:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  });

  ipcMain.handle(
    'conversation:update',
    async (_event, id: string, title?: string, messages?: unknown[], sessionId?: string | null) => {
      try {
        updateConversation(id, title, messages, sessionId);
        return { success: true };
      } catch (error) {
        console.error('Error updating conversation:', error);
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error occurred'
        };
      }
    }
  );

  ipcMain.handle('conversation:delete', async (_event, id: string) => {
    try {
      deleteConversation(id);
      return { success: true };
    } catch (error) {
      console.error('Error deleting conversation:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  });

  ipcMain.handle('conversation:dbStatus', async () => {
    try {
      return { success: true, status: getDatabaseStatus() };
    } catch (error) {
      console.error('Error getting database status:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  });

  ipcMain.handle('conversation:dbStats', async () => {
    try {
      return { success: true, stats: getDatabaseStats() };
    } catch (error) {
      console.error('Error getting database stats:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  });
}

// Cleanup on app quit
process.on('exit', () => {
  closeDatabase();
});
