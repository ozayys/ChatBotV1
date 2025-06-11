import { Request, Response } from 'express';
import pool from '../config/db';
import AIService from '../services/aiService';

// MySQL hata tipini tanımlayalım
interface MySQLError extends Error {
  code?: string;
  sqlState?: string;
  sqlMessage?: string;
}

// Extend Request interface to include user property
interface AuthRequest extends Request {
  user?: {
    id: number;
    username: string;
    email: string;
  };
}

// Get user's chat history grouped by conversations
export const getChatHistory = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    // Get all conversations for the user
    const [conversations]: any = await pool.query(
      `SELECT id, title, model_type, message_count, is_pinned, created_at, updated_at
       FROM conversations 
       WHERE user_id = ? 
       ORDER BY updated_at DESC`,
      [userId]
    );

    // For each conversation, get the last message
    const conversationsWithPreview = await Promise.all(
      conversations.map(async (conversation: any) => {
        const [messages]: any = await pool.query(
          `SELECT message, response 
           FROM chat_history 
           WHERE conversation_id = ? 
           ORDER BY created_at DESC LIMIT 1`,
          [conversation.id]
        );

        const preview = messages.length > 0 
          ? { lastMessage: messages[0].message, lastResponse: messages[0].response }
          : { lastMessage: '', lastResponse: '' };

        return {
          ...conversation,
          ...preview
        };
      })
    );

    res.status(200).json({ conversations: conversationsWithPreview });
  } catch (err) {
    const error = err as Error;
    console.error('Error fetching chat history:', error);
    res.status(500).json({ 
      message: 'Server error during fetching chat history',
      error: error.message 
    });
  }
};

// Get messages for a specific conversation
export const getConversationMessages = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const conversationId = req.params.conversationId;

    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    // Check if conversation belongs to the user and get conversation details
    const [conversations]: any = await pool.query(
      `SELECT id, model_type, title FROM conversations WHERE id = ? AND user_id = ?`,
      [conversationId, userId]
    );

    if (conversations.length === 0) {
      return res.status(403).json({ message: 'Conversation not found or access denied' });
    }

    const conversation = conversations[0];

    // Get all messages for the conversation
    const [messages]: any = await pool.query(
      `SELECT id, message, response, model_type, is_math_related, created_at 
       FROM chat_history 
       WHERE conversation_id = ? 
       ORDER BY created_at ASC`,
      [conversationId]
    );

    res.status(200).json({ 
      messages,
      conversation: {
        id: conversation.id,
        modelType: conversation.model_type,
        title: conversation.title
      }
    });
  } catch (err) {
    const error = err as Error;
    console.error('Error fetching conversation messages:', error);
    res.status(500).json({ 
      message: 'Server error during fetching conversation messages',
      error: error.message 
    });
  }
};

// Create a new conversation
export const createConversation = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const { title, modelType } = req.body;

    console.log('Creating conversation with:', { userId, title, modelType });

    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    // Validate model type
    if (!modelType) {
      return res.status(400).json({ message: 'Model type is required' });
    }
    
    // Allow 'api', 'custom', or 'mistral' model types
    if (modelType !== 'api' && modelType !== 'custom' && modelType !== 'mistral') {
      return res.status(400).json({ message: `Invalid model type: ${modelType}. Must be 'api', 'custom', or 'mistral'` });
    }

    // Create new conversation
    const [result]: any = await pool.query(
      `INSERT INTO conversations (user_id, title, model_type) 
       VALUES (?, ?, ?)`,
      [userId, title || 'New Conversation', modelType]
    );

    console.log('Conversation created with ID:', result.insertId);

    // Update user statistics
    await pool.query(
      `INSERT INTO user_statistics (user_id, total_conversations) 
       VALUES (?, 1) 
       ON DUPLICATE KEY UPDATE 
       total_conversations = total_conversations + 1,
       last_active_at = CURRENT_TIMESTAMP`,
      [userId]
    );

    const response = {
      conversationId: result.insertId,
      title: title || 'New Conversation',
      modelType,
      createdAt: new Date()
    };
    
    console.log('Sending response:', response);
    res.status(201).json(response);
  } catch (err) {
    const error = err as Error;
    console.error('Error creating conversation:', error);
    res.status(500).json({ 
      message: 'Server error while creating conversation',
      error: error.message 
    });
  }
};

// Send a new message in a conversation
export const sendMessage = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const { message, modelType, conversationId, isMathRelated = false } = req.body;

    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    if (!message) {
      return res.status(400).json({ message: 'Message is required' });
    }

    if (!modelType || (modelType !== 'api' && modelType !== 'custom' && modelType !== 'mistral')) {
      return res.status(400).json({ message: 'Valid model type is required (api, custom, or mistral)' });
    }

    let activeConversationId = conversationId;

    // If no conversation ID provided, create a new one
    if (!activeConversationId) {
      const [convResult]: any = await pool.query(
        `INSERT INTO conversations (user_id, model_type) 
         VALUES (?, ?)`,
        [userId, modelType]
      );
      activeConversationId = convResult.insertId;
    } else {
      // Check if conversation belongs to user and fix NULL model_type if exists
      const [conversations]: any = await pool.query(
        `SELECT id, model_type FROM conversations WHERE id = ? AND user_id = ?`,
        [activeConversationId, userId]
      );

      if (conversations.length === 0) {
        return res.status(403).json({ message: 'Conversation not found or access denied' });
      }

      // Fix NULL model_type for existing conversations
      const conversation = conversations[0];
      if (!conversation.model_type) {
        console.log(`⚠️ Fixing NULL model_type for conversation ${activeConversationId}, setting to: ${modelType}`);
        await pool.query(
          `UPDATE conversations SET model_type = ? WHERE id = ?`,
          [modelType, activeConversationId]
        );
      }
    }

    // Get previous messages for context (last 5 messages)
    const [previousMessages]: any = await pool.query(
      `SELECT message, response 
       FROM chat_history 
       WHERE conversation_id = ? 
       ORDER BY created_at DESC 
       LIMIT 5`,
      [activeConversationId]
    );

    // Call the appropriate AI model based on modelType
    let response: string;
    let aiResponse;
    
    if (modelType === 'api') {
      // Call OpenAI API
      const formattedPreviousMessages = AIService.formatPreviousMessages(previousMessages.reverse());
      aiResponse = await AIService.getOpenAIResponse(message, formattedPreviousMessages, isMathRelated);
      response = aiResponse.content;
      
      // Update statistics for API model usage
      await pool.query(
        `UPDATE user_statistics 
         SET api_model_uses = api_model_uses + 1
         WHERE user_id = ?`,
        [userId]
      );
            } else if (modelType === 'custom') {
      // Use custom model
      aiResponse = await AIService.getCustomModelResponse(message, isMathRelated);
      response = aiResponse.content;
      
      // Update statistics for custom model usage
      await pool.query(
        `UPDATE user_statistics 
         SET custom_model_uses = custom_model_uses + 1
         WHERE user_id = ?`,
        [userId]
      );
    } else if (modelType === 'mistral') {
      // Use Mistral 7B model
      const formattedPreviousMessages = AIService.formatPreviousMessages(previousMessages.reverse());
      aiResponse = await AIService.getMistralResponse(message, formattedPreviousMessages);
      response = aiResponse.content;
      
      // Update statistics for Mistral model usage (we can add a new column or use custom_model_uses)
      await pool.query(
        `UPDATE user_statistics 
         SET custom_model_uses = custom_model_uses + 1
         WHERE user_id = ?`,
        [userId]
      );
    } else {
      // This should never happen due to validation above, but needed for TypeScript
      return res.status(400).json({ message: 'Invalid model type' });
    }

    // Save the message and response to the database
    const [result]: any = await pool.query(
      `INSERT INTO chat_history (conversation_id, user_id, message, response, model_type, is_math_related) 
       VALUES (?, ?, ?, ?, ?, ?)`,
      [activeConversationId, userId, message, response, modelType, isMathRelated]
    );

    // Update conversation message count and timestamp
    await pool.query(
      `UPDATE conversations 
       SET message_count = message_count + 1, updated_at = CURRENT_TIMESTAMP 
       WHERE id = ?`,
      [activeConversationId]
    );

    // Update user statistics
    await pool.query(
      `UPDATE user_statistics 
       SET total_messages = total_messages + 1,
           math_questions_count = math_questions_count + ?,
           general_questions_count = general_questions_count + ?,
           last_active_at = CURRENT_TIMESTAMP
       WHERE user_id = ?`,
      [isMathRelated ? 1 : 0, isMathRelated ? 0 : 1, userId]
    );

    res.status(200).json({
      id: result.insertId,
      conversationId: activeConversationId,
      message,
      response,
      modelType,
      isMathRelated,
      createdAt: new Date()
    });
  } catch (err) {
    const error = err as Error;
    console.error('Error sending message:', error);
    res.status(500).json({ 
      message: 'Server error while processing message',
      error: error.message 
    });
  }
};

// Streaming message endpoint
export const sendStreamingMessage = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const { message, modelType, conversationId, isMathRelated = false } = req.body;

    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    if (!message) {
      return res.status(400).json({ message: 'Message is required' });
    }

    if (!modelType || (modelType !== 'api' && modelType !== 'custom' && modelType !== 'mistral')) {
      return res.status(400).json({ message: 'Valid model type is required (api, custom, or mistral)' });
    }

    let activeConversationId = conversationId;

    // If no conversation ID provided, create a new one
    if (!activeConversationId) {
      const [convResult]: any = await pool.query(
        `INSERT INTO conversations (user_id, model_type) 
         VALUES (?, ?)`,
        [userId, modelType]
      );
      activeConversationId = convResult.insertId;
    } else {
      // Check if conversation belongs to user and fix NULL model_type if exists
      const [conversations]: any = await pool.query(
        `SELECT id, model_type FROM conversations WHERE id = ? AND user_id = ?`,
        [activeConversationId, userId]
      );

      if (conversations.length === 0) {
        return res.status(403).json({ message: 'Conversation not found or access denied' });
      }

      // Fix NULL model_type for existing conversations
      const conversation = conversations[0];
      if (!conversation.model_type) {
        console.log(`⚠️ Fixing NULL model_type for conversation ${activeConversationId}, setting to: ${modelType}`);
        await pool.query(
          `UPDATE conversations SET model_type = ? WHERE id = ?`,
          [modelType, activeConversationId]
        );
      }
    }

    // Setup SSE headers
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Cache-Control'
    });

    // Get previous messages for context
    const [previousMessages]: any = await pool.query(
      `SELECT message, response 
       FROM chat_history 
       WHERE conversation_id = ? 
       ORDER BY created_at DESC 
       LIMIT 5`,
      [activeConversationId]
    );

    try {
      let fullResponse = '';
      
      // Call the appropriate AI model
      if (modelType === 'api' || modelType === 'mistral') {
        const formattedPreviousMessages = AIService.formatPreviousMessages(previousMessages.reverse());
        
        // Simulate streaming for now (we'll improve this later)
        let aiResponse;
        if (modelType === 'api') {
          aiResponse = await AIService.getOpenAIResponse(message, formattedPreviousMessages, isMathRelated);
        } else {
          aiResponse = await AIService.getMistralResponse(message, formattedPreviousMessages);
        }
        
        fullResponse = aiResponse.content;
        
        // Send response word by word for streaming effect
        const words = fullResponse.split(' ');
        let currentResponse = '';
        
        for (let i = 0; i < words.length; i++) {
          currentResponse += (i > 0 ? ' ' : '') + words[i];
          
          res.write(`data: ${JSON.stringify({
            type: 'chunk',
            content: currentResponse,
            conversationId: activeConversationId
          })}\n\n`);
          
          // Small delay for streaming effect
          await new Promise(resolve => setTimeout(resolve, 50));
        }
        
      } else if (modelType === 'custom') {
        const aiResponse = await AIService.getCustomModelResponse(message, isMathRelated);
        fullResponse = aiResponse.content;
        
        // Send complete response for custom model (usually faster)
        res.write(`data: ${JSON.stringify({
          type: 'chunk',
          content: fullResponse,
          conversationId: activeConversationId
        })}\n\n`);
      }

      // Save to database
      const [result]: any = await pool.query(
        `INSERT INTO chat_history (conversation_id, user_id, message, response, model_type, is_math_related) 
         VALUES (?, ?, ?, ?, ?, ?)`,
        [activeConversationId, userId, message, fullResponse, modelType, isMathRelated]
      );

      // Update conversation
      await pool.query(
        `UPDATE conversations 
         SET message_count = message_count + 1, updated_at = CURRENT_TIMESTAMP 
         WHERE id = ?`,
        [activeConversationId]
      );

      // Update statistics
      await pool.query(
        `UPDATE user_statistics 
         SET total_messages = total_messages + 1,
             ${modelType === 'api' ? 'api_model_uses' : 'custom_model_uses'} = ${modelType === 'api' ? 'api_model_uses' : 'custom_model_uses'} + 1,
             math_questions_count = math_questions_count + ?,
             general_questions_count = general_questions_count + ?,
             last_active_at = CURRENT_TIMESTAMP
         WHERE user_id = ?`,
        [isMathRelated ? 1 : 0, isMathRelated ? 0 : 1, userId]
      );

      // Send completion signal
      res.write(`data: ${JSON.stringify({
        type: 'complete',
        messageId: result.insertId,
        conversationId: activeConversationId,
        message,
        response: fullResponse,
        modelType,
        createdAt: new Date()
      })}\n\n`);

      res.end();

    } catch (streamError) {
      console.error('Streaming error:', streamError);
      res.write(`data: ${JSON.stringify({
        type: 'error',
        message: 'AI model error occurred'
      })}\n\n`);
      res.end();
    }

  } catch (err) {
    const error = err as Error;
    console.error('Error in streaming message:', error);
    if (!res.headersSent) {
      res.status(500).json({ 
        message: 'Server error while processing streaming message',
        error: error.message 
      });
    }
  }
};

// Clear chat history for a specific conversation
export const clearConversation = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const { conversationId } = req.params;

    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    // Check if conversation belongs to user
    const [conversations]: any = await pool.query(
      `SELECT id FROM conversations WHERE id = ? AND user_id = ?`,
      [conversationId, userId]
    );

    if (conversations.length === 0) {
      return res.status(403).json({ message: 'Conversation not found or access denied' });
    }

    // Delete messages from this conversation
    await pool.query(
      'DELETE FROM chat_history WHERE conversation_id = ?',
      [conversationId]
    );

    // Reset message count
    await pool.query(
      `UPDATE conversations 
       SET message_count = 0
       WHERE id = ?`,
      [conversationId]
    );

    res.status(200).json({ message: 'Conversation cleared successfully' });
  } catch (err) {
    const error = err as Error;
    console.error('Error clearing conversation:', error);
    res.status(500).json({ 
      message: 'Server error while clearing conversation',
      error: error.message 
    });
  }
};

// Delete an entire conversation
export const deleteConversation = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const { conversationId } = req.params;

    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    // Check if conversation belongs to user
    const [conversations]: any = await pool.query(
      `SELECT id FROM conversations WHERE id = ? AND user_id = ?`,
      [conversationId, userId]
    );

    if (conversations.length === 0) {
      return res.status(403).json({ message: 'Conversation not found or access denied' });
    }

    // Delete the conversation (this will cascade delete the messages due to foreign key)
    await pool.query(
      'DELETE FROM conversations WHERE id = ?',
      [conversationId]
    );

    // Update user statistics
    await pool.query(
      `UPDATE user_statistics 
       SET total_conversations = GREATEST(total_conversations - 1, 0)
       WHERE user_id = ?`,
      [userId]
    );

    res.status(200).json({ message: 'Conversation deleted successfully' });
  } catch (err) {
    const error = err as Error;
    console.error('Error deleting conversation:', error);
    res.status(500).json({ 
      message: 'Server error while deleting conversation',
      error: error.message 
    });
  }
};

// Clear all chat history for a user
export const clearChatHistory = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    // First get all conversation IDs for this user
    const [conversations]: any = await pool.query(
      'SELECT id FROM conversations WHERE user_id = ?',
      [userId]
    );

    // Delete all chat messages for these conversations
    if (conversations.length > 0) {
      const conversationIds = conversations.map((conv: any) => conv.id);
      
      if (conversationIds.length > 0) {
        // Convert array to comma-separated string for SQL IN clause
        const idList = conversationIds.join(',');
        await pool.query(
          `DELETE FROM chat_history WHERE conversation_id IN (${idList})`
        );
        
        // Reset message counts
        await pool.query(
          `UPDATE conversations 
           SET message_count = 0
           WHERE id IN (${idList})`
        );
      }
    }

    res.status(200).json({ message: 'All chat history cleared successfully' });
  } catch (err) {
    const error = err as Error;
    console.error('Error clearing chat history:', error);
    res.status(500).json({ 
      message: 'Server error while clearing chat history',
      error: error.message 
    });
  }
};

// Get user settings
export const getUserSettings = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const [settings]: any = await pool.query(
      'SELECT * FROM user_settings WHERE user_id = ?',
      [userId]
    );

    if (settings.length === 0) {
      // Create default settings if not exists
      await pool.query(
        'INSERT INTO user_settings (user_id) VALUES (?)',
        [userId]
      );
      
      // Return default settings
      res.status(200).json({
        theme: 'light',
        language: 'tr',
        preferredModel: 'api',
        notificationsEnabled: true
      });
    } else {
      res.status(200).json({
        theme: settings[0].theme,
        language: settings[0].language,
        preferredModel: settings[0].preferred_model,
        notificationsEnabled: settings[0].notifications_enabled
      });
    }
  } catch (err) {
    const error = err as Error;
    console.error('Error getting user settings:', error);
    res.status(500).json({ 
      message: 'Server error while retrieving user settings',
      error: error.message 
    });
  }
};

// Update user settings
export const updateUserSettings = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const { theme, language, preferredModel, notificationsEnabled } = req.body;

    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    // Check if settings exist
    const [settings]: any = await pool.query(
      'SELECT id FROM user_settings WHERE user_id = ?',
      [userId]
    );

    if (settings.length === 0) {
      // Create settings if not exists
      await pool.query(
        `INSERT INTO user_settings 
         (user_id, theme, language, preferred_model, notifications_enabled) 
         VALUES (?, ?, ?, ?, ?)`,
        [userId, theme, language, preferredModel, notificationsEnabled]
      );
    } else {
      // Update existing settings
      await pool.query(
        `UPDATE user_settings 
         SET theme = ?, language = ?, preferred_model = ?, notifications_enabled = ?
         WHERE user_id = ?`,
        [theme, language, preferredModel, notificationsEnabled, userId]
      );
    }

    res.status(200).json({ 
      message: 'Settings updated successfully',
      settings: {
        theme,
        language,
        preferredModel,
        notificationsEnabled
      }
    });
  } catch (err) {
    const error = err as Error;
    console.error('Error updating user settings:', error);
    res.status(500).json({ 
      message: 'Server error while updating user settings',
      error: error.message 
    });
  }
};

// Get user statistics
export const getUserStatistics = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const [stats]: any = await pool.query(
      'SELECT * FROM user_statistics WHERE user_id = ?',
      [userId]
    );

    if (stats.length === 0) {
      // Create default stats if not exists
      await pool.query(
        'INSERT INTO user_statistics (user_id) VALUES (?)',
        [userId]
      );
      
      // Return default stats
      res.status(200).json({
        totalConversations: 0,
        totalMessages: 0,
        mathQuestionsCount: 0,
        generalQuestionsCount: 0,
        apiModelUses: 0,
        customModelUses: 0,
        lastActiveAt: new Date()
      });
    } else {
      res.status(200).json({
        totalConversations: stats[0].total_conversations,
        totalMessages: stats[0].total_messages,
        mathQuestionsCount: stats[0].math_questions_count,
        generalQuestionsCount: stats[0].general_questions_count,
        apiModelUses: stats[0].api_model_uses,
        customModelUses: stats[0].custom_model_uses,
        lastActiveAt: stats[0].last_active_at
      });
    }
  } catch (err) {
    const error = err as Error;
    console.error('Error getting user statistics:', error);
    res.status(500).json({ 
      message: 'Server error while retrieving user statistics',
      error: error.message 
    });
  }
};

// Fix NULL model_type conversations for a user
export const fixConversationModelTypes = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    // Find conversations with NULL model_type
    const [nullConversations]: any = await pool.query(
      `SELECT id, title FROM conversations WHERE user_id = ? AND model_type IS NULL`,
      [userId]
    );

    if (nullConversations.length === 0) {
      return res.status(200).json({ 
        message: 'No conversations with NULL model_type found',
        fixed: 0
      });
    }

    // Update NULL conversations to 'custom' as default (user can change later)
    const [result]: any = await pool.query(
      `UPDATE conversations SET model_type = 'custom' WHERE user_id = ? AND model_type IS NULL`,
      [userId]
    );

    console.log(`✅ Fixed ${result.affectedRows} conversations with NULL model_type for user ${userId}`);

    res.status(200).json({
      message: `Fixed ${result.affectedRows} conversations`,
      fixed: result.affectedRows,
      conversationsFixed: nullConversations.map((c: any) => ({
        id: c.id,
        title: c.title,
        newModelType: 'custom'
      }))
    });
  } catch (err) {
    const error = err as Error;
    console.error('Error fixing conversation model types:', error);
    res.status(500).json({ 
      message: 'Server error during fixing conversation model types',
      error: error.message 
    });
  }
}; 