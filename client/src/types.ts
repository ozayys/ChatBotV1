// Model türü
export type ModelType = 'api' | 'custom' | 'mistral';

// Kullanıcı tipi
export interface User {
  id: number;
  username: string;
  email: string;
  profilePicture?: string;
}

// Ayarlar tipi
export interface UserSettings {
  theme: 'light' | 'dark';
  language: string;
  preferredModel: ModelType;
  notificationsEnabled: boolean;
}

// İstatistikler tipi
export interface UserStatistics {
  totalConversations: number;
  totalMessages: number;
  mathQuestionsCount: number;
  generalQuestionsCount: number;
  apiModelUses: number;
  customModelUses: number;
  lastActiveAt: string;
}

// Sohbet mesajı tipi
export interface Message {
  id: number;
  message: string;
  response: string;
  modelType: ModelType;
  isMathRelated: boolean;
  createdAt: string;
}

// Sohbet tipi
export interface Conversation {
  id: number;
  title: string;
  modelType: ModelType;
  messageCount: number;
  isPinned: boolean;
  lastMessage?: string;
  lastResponse?: string;
  createdAt: string;
  updatedAt: string;
} 