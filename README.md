# 🤖 ChatBot V1

[![React](https://img.shields.io/badge/React-19.1.0-blue.svg)](https://reactjs.org/)
[![Node.js](https://img.shields.io/badge/Node.js-Backend-green.svg)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-Strongly%20Typed-blue.svg)](https://www.typescriptlang.org/)

Modern web tabanlı ChatBot uygulaması - React frontend, Node.js backend ve çoklu AI model desteği.

## ✨ Özellikler

- 💬 **Gerçek Zamanlı Sohbet** - Anlık mesajlaşma arayüzü
- 🤖 **3 AI Model Desteği** - T5 CodeParrot, Mistral 7B, ChatGPT
- 💾 **Sohbet Geçmişi** - MySQL veritabanında saklanır
- 🎨 **Modern UI** - Material-UI ile responsive tasarım
- 🔒 **Güvenli** - JWT authentication

## 🚀 Hızlı Başlangıç

```bash
# Tek komutla başlat
START_CHATBOT.bat
```

**Bu komut:**
- Tüm servisleri otomatik başlatır
- Tarayıcıyı http://localhost:3000 açar
- T5 ve Mistral modellerini yükler

## 🛠️ Teknoloji Stack

**Frontend:** React + TypeScript + Material-UI  
**Backend:** Node.js + Express + MySQL  
**AI Models:** T5 CodeParrot + Mistral 7B + ChatGPT API  

## 📂 Proje Yapısı

```
ChatBotV1/
├── client/              # React Frontend (Port: 3000)
├── server/              # Node.js Backend (Port: 5000)
├── model_service/       # AI Models (Port: 8000, 8002)
├── flan-t5-codeparrot-model/  # T5 Model Files
└── START_CHATBOT.bat    # Tek tıkla başlatıcı
```

## 📋 Sistem Gereksinimleri

- **Node.js** v16+
- **Python** v3.8+
- **MySQL** v8.0+
- **RAM** 8GB+ (AI modeller için)

## 🔧 Manuel Kurulum

### 1. Backend
```bash
cd server
npm install
# .env dosyasını düzenle (DB bilgileri, OpenAI API key)
npm run dev
```

### 2. Frontend
```bash
cd client
npm install
npm start
```

### 3. AI Services
```bash
cd model_service
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
python app.py
```

## 📱 Kullanım

1. `START_CHATBOT.bat` çalıştır
2. http://localhost:3000 açılacak
3. AI model seç (T5/Mistral/ChatGPT)
4. Sohbet başlat

## 🔗 Erişim Noktaları

- **Ana Uygulama:** http://localhost:3000
- **Backend API:** http://localhost:5000
- **T5 Model:** http://localhost:8000
- **Mistral Model:** http://localhost:8002

## 🐛 Sorun Giderme

**Port kullanımda hatası:**
```bash
netstat -ano | findstr :3000
taskkill /PID [PID] /F
```

**Model yüklenmedi:**
```bash
cd model_service
pip install -r requirements.txt --force-reinstall
```

**Veritabanı bağlantısı:**
```sql
CREATE DATABASE chatbot_db;
-- .env dosyasında DB bilgilerini kontrol et
```

## 📝 Environment Variables

`.env` dosyası örneği:
```env
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=chatbot_db
OPENAI_API_KEY=your_api_key
JWT_SECRET=your_secret
```

## 🎯 Model Karşılaştırması

| Model | Özellik | Hız |
|-------|---------|-----|
| T5 CodeParrot | Kod yazma | ⚡ Hızlı |
| Mistral 7B | Genel AI | ⚡⚡ Orta |
| ChatGPT | Kapsamlı | ⚡⚡⚡ Yavaş |

---

**💡 İpucu:** İlk çalıştırmada modellerin yüklenmesi 1-2 dakika sürebilir.

Made with ❤️ - ChatBot V1 