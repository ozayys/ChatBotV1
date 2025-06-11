CREATE DATABASE IF NOT EXISTS mydb;
USE mydb;

-- Users Table (Kullanıcılar)
CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(50) NOT NULL,
  email VARCHAR(100) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  profile_picture VARCHAR(255) DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- User Settings Table (Kullanıcı Ayarları)
CREATE TABLE IF NOT EXISTS user_settings (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  theme VARCHAR(20) DEFAULT 'light', -- light/dark
  language VARCHAR(10) DEFAULT 'tr',
  preferred_model ENUM('api', 'custom') DEFAULT 'api',
  notifications_enabled BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Conversations Table (Sohbetler - gruplandırma için)
CREATE TABLE IF NOT EXISTS conversations (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  title VARCHAR(255) DEFAULT 'New Conversation',
  model_type ENUM('api', 'custom') NOT NULL,
  message_count INT DEFAULT 0,
  is_pinned BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Chat History Table (Sohbet Geçmişi - her bir mesaj-cevap çifti)
CREATE TABLE IF NOT EXISTS chat_history (
  id INT AUTO_INCREMENT PRIMARY KEY,
  conversation_id INT NOT NULL,
  user_id INT NOT NULL,
  message TEXT NOT NULL,
  response TEXT NOT NULL,
  is_math_related BOOLEAN DEFAULT FALSE,
  model_type ENUM('api', 'custom') NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
);

-- User Statistics Table (Kullanıcı İstatistikleri)
CREATE TABLE IF NOT EXISTS user_statistics (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  total_conversations INT DEFAULT 0,
  total_messages INT DEFAULT 0,
  math_questions_count INT DEFAULT 0,
  general_questions_count INT DEFAULT 0,
  api_model_uses INT DEFAULT 0,
  custom_model_uses INT DEFAULT 0,
  last_active_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Model Feedback Table (Model Geribildirimleri)
CREATE TABLE IF NOT EXISTS model_feedback (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  message_id INT NOT NULL,
  rating TINYINT NOT NULL, -- 1-5 arası değer
  feedback_text TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (message_id) REFERENCES chat_history(id) ON DELETE CASCADE
);

-- Add indexes for performance
CREATE INDEX idx_chat_history_user_id ON chat_history(user_id);
CREATE INDEX idx_chat_history_conversation_id ON chat_history(conversation_id);
CREATE INDEX idx_conversations_user_id ON conversations(user_id);
CREATE INDEX idx_user_settings_user_id ON user_settings(user_id);
CREATE INDEX idx_users_email ON users(email); 