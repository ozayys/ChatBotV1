import OpenAI from 'openai';
import axios from 'axios';

// OpenAI client configuration
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Custom model configuration
const CUSTOM_MODEL_URL = process.env.CUSTOM_MODEL_URL || 'http://localhost:8000/chat';
const MISTRAL_MODEL_URL = process.env.MISTRAL_MODEL_URL || 'http://localhost:8002/chat';

interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface AIResponse {
  content: string;
  model: string;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export class AIService {
  // OpenAI API kullanarak cevap al
  static async getOpenAIResponse(
    message: string, 
    previousMessages: ChatMessage[] = [],
    isMathRelated: boolean = false
  ): Promise<AIResponse> {
    try {
      // System message'ı matematik odaklı yap
      const systemMessage: ChatMessage = {
        role: 'system',
        content: isMathRelated 
          ? 'You are a helpful AI assistant specialized in mathematics. Provide clear, step-by-step solutions to mathematical problems and explain concepts thoroughly.'
          : 'You are a helpful AI assistant. Provide clear, accurate, and helpful responses to user questions.'
      };

      // Mesaj geçmişini oluştur
      const messages: ChatMessage[] = [
        systemMessage,
        ...previousMessages.slice(-10), // Son 10 mesajı al (token limiti için)
        { role: 'user', content: message }
      ];

      const completion = await openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: messages,
        max_tokens: 1000,
        temperature: 0.7,
      });

      const response = completion.choices[0]?.message?.content || 'Sorry, I could not generate a response.';

      return {
        content: response,
        model: 'gpt-3.5-turbo',
        usage: {
          prompt_tokens: completion.usage?.prompt_tokens || 0,
          completion_tokens: completion.usage?.completion_tokens || 0,
          total_tokens: completion.usage?.total_tokens || 0,
        }
      };
    } catch (error) {
      console.error('OpenAI API Error:', error);
      throw new Error('OpenAI API request failed. Please check your API key and try again.');
    }
  }

  // Custom model kullanarak cevap al
  static async getCustomModelResponse(
    message: string, 
    isMathRelated: boolean = false
  ): Promise<AIResponse> {
    try {
      console.log('🤖 Trying FLAN-T5-CodeParrot Model for message:', message);
      
      // T5 fine-tuned modelini kullan
      const result = await this.callT5Model(message);
      
      console.log('✅ CodeParrot Model Response received:', result.model);
      return result;
      
          } catch (error) {
        console.error('❌ CodeParrot Model Error:', error);
        console.log('🔄 Falling back to demo response while CodeParrot service is starting...');
      
      // CodeParrot model servisi henüz başlamadıysa demo response ver
      return {
        content: `🤖 **CodeParrot Model Demo Response:**\n\nFLAN-T5-CodeParrot modeliniz henüz yükleniyor veya başlatılmadı.\n\n**Mesajınız:** "${message}"\n\n**Demo Yanıt:** Bu, CodeParrot modelinizin yerini tutan geçici bir yanıttır. Gerçek CodeParrot modelinizi kullanmak için:\n\n1. Model servisini başlatın: \`model_service/start_model.bat\`\n2. Port 8000'de servisiyi çalıştırın\n3. Bu mesajı tekrar gönderin\n\n*Bu demo yanıtı CodeParrot model servisi çalışmaya başladığında otomatik olarak gerçek model yanıtlarıyla değişecektir.*`,
        model: 'CodeParrot-Demo-Fallback'
      };
    }
  }

  // T5 Fine-tuned modelini çağır
  private static async callT5Model(message: string): Promise<AIResponse> {
    try {
      console.log(`🔗 Making request to T5 model at: ${CUSTOM_MODEL_URL}`);
      console.log(`📝 Message: "${message}"`);
      
      const response = await axios.post(CUSTOM_MODEL_URL, {
        message: message,
        max_length: 512
      }, {
        timeout: 30000, // 30 second timeout
        headers: {
          'Content-Type': 'application/json'
        }
      });

      console.log('📡 T5 Model Response Status:', response.status);
      console.log('📡 T5 Model Response Data:', response.data);

      if (response.data && response.data.response) {
        const result = {
          content: response.data.response,
          model: response.data.model || 'T5-Fine-tuned'
        };
        
        console.log('✅ Successfully processed T5 response:', result.model);
        return result;
      } else {
        throw new Error('Invalid response structure from T5 model service');
      }
    } catch (error) {
      if (axios.isAxiosError(error)) {
        if (error.code === 'ECONNREFUSED') {
          throw new Error('🚫 T5 model service is not running on port 8000. Please start: model_service/start_model.bat');
        } else if (error.response) {
          console.log('❌ T5 Service Error Response:', error.response.data);
          throw new Error(`T5 service error (${error.response.status}): ${error.response.data?.error || error.message}`);
        } else if (error.request) {
          throw new Error('🌐 Network timeout - T5 model service not responding');
        } else {
          throw new Error(`Request setup error: ${error.message}`);
        }
      }
      throw error;
    }
  }

  // Mistral 7B model kullanarak cevap al
  static async getMistralResponse(
    message: string, 
    previousMessages: ChatMessage[] = []
  ): Promise<AIResponse> {
    try {
      console.log('🚀 Trying Mistral 7B Model for message:', message);
      
      // Mistral 7B modelini kullan
      const result = await this.callMistralModel(message);
      
      console.log('✅ Mistral 7B Model Response received:', result.model);
      return result;
      
    } catch (error) {
      console.error('❌ Mistral 7B Model Error - FULL ERROR:', error);
      
      // Daha detaylı hata log'u
      if (error instanceof Error) {
        console.error('Error message:', error.message);
        console.error('Error stack:', error.stack);
      }
      
      // Network error ise Ollama servisini kontrol et
      if (error instanceof Error && error.message.includes('Network error')) {
        console.log('🔄 Network error detected, trying to restart Ollama connection...');
        
        // 2 saniye bekle ve tekrar dene
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        try {
          console.log('🔄 Retrying Mistral request...');
          const retryResult = await this.callMistralModel(message);
          console.log('✅ Mistral retry successful!');
          return retryResult;
        } catch (retryError) {
          console.error('❌ Mistral retry failed:', retryError);
        }
      }
      
      console.log('🔄 Falling back to demo response...');
    
      // Mistral model servisi henüz başlamadıysa demo response ver
      return {
        content: `🚀 **Mistral 7B Model Demo Response:**\n\nMistral 7B modeliniz henüz yükleniyor veya başlatılmadı.\n\n**Mesajınız:** "${message}"\n\n**Demo Yanıt:** Bu, Mistral 7B modelinizin yerini tutan geçici bir yanıttır. Gerçek Mistral 7B modelinizi kullanmak için:\n\n1. Model servisini başlatın: \`model_service/start_ollama_mistral.bat\`\n2. Port 8002'de servisi çalıştırın\n3. Bu mesajı tekrar gönderin\n\n**Hata detayı:** ${error instanceof Error ? error.message : 'Bilinmeyen hata'}\n\n*Servislerin çalışıp çalışmadığını kontrol edin: http://localhost:8002/health*`,
        model: 'Mistral-7B-Demo-Fallback'
      };
    }
  }

  // Mistral 7B modelini çağır
  private static async callMistralModel(message: string): Promise<AIResponse> {
    try {
      console.log(`🔗 Making request to Mistral 7B model at: ${MISTRAL_MODEL_URL}`);
      console.log(`📝 Message: "${message}"`);
      
      const response = await axios.post(MISTRAL_MODEL_URL, {
        message: message,
        max_tokens: 1024
      }, {
        timeout: 120000, // 120 second timeout for complex questions
        headers: {
          'Content-Type': 'application/json'
        }
      });

      console.log('📡 Mistral 7B Model Response Status:', response.status);
      console.log('📡 Mistral 7B Model Response Data:', response.data);

      if (response.data && response.data.response) {
        const result = {
          content: response.data.response,
          model: response.data.model || 'Mistral-7B-Instruct-v0.3'
        };
        
        console.log('✅ Successfully processed Mistral 7B response:', result.model);
        return result;
      } else {
        throw new Error('Invalid response structure from Mistral model service');
      }
    } catch (error) {
      console.log('🔍 Mistral Error Analysis:', {
        isAxiosError: axios.isAxiosError(error),
        errorCode: error instanceof Error ? (error as any).code : 'unknown',
        errorMessage: error instanceof Error ? error.message : 'unknown'
      });

      if (axios.isAxiosError(error)) {
        if (error.code === 'ECONNREFUSED') {
          throw new Error('🚫 Mistral 7B model service is not running on port 8002. Please start: model_service/start_mistral.bat');
        } else if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
          // Timeout errors - don't give up immediately for complex questions
          console.log('⏱️ Timeout detected, but this might be a complex question. Extending wait time...');
          throw new Error('⏱️ Mistral is processing a complex question (this may take longer than usual)');
        } else if (error.response) {
          console.log('❌ Mistral Service Error Response:', error.response.data);
          throw new Error(`Mistral service error (${error.response.status}): ${error.response.data?.error || error.message}`);
        } else if (error.request) {
          console.log('🌐 Network request failed, but service might be running...');
          throw new Error('🌐 Network communication error - please check if Mistral service is responding');
        } else {
          throw new Error(`Request setup error: ${error.message}`);
        }
      }
      throw error;
    }
  }

  // Matematik sorularını özel olarak ele al
  private static async handleMathQuestion(message: string): Promise<AIResponse> {
    const lowerMessage = message.toLowerCase();
    
    // Basit matematik işlemleri
    const mathOperations = message.match(/(\d+(?:\.\d+)?)\s*([+\-*/])\s*(\d+(?:\.\d+)?)/);
    if (mathOperations) {
      const [, num1, operator, num2] = mathOperations;
      const a = parseFloat(num1);
      const b = parseFloat(num2);
      let result: number;
      let operation: string;

      switch (operator) {
        case '+':
          result = a + b;
          operation = 'toplama';
          break;
        case '-':
          result = a - b;
          operation = 'çıkarma';
          break;
        case '*':
          result = a * b;
          operation = 'çarpma';
          break;
        case '/':
          result = b !== 0 ? a / b : NaN;
          operation = 'bölme';
          break;
        default:
          result = NaN;
          operation = 'bilinmeyen';
      }

      if (!isNaN(result)) {
        return {
          content: `🧮 **Matematik Çözümü:**\n\n**Soru:** ${a} ${operator} ${b}\n**İşlem:** ${operation}\n**Sonuç:** ${result}\n\n✅ Bu ${operation} işleminin sonucu **${result}**'dir.`,
          model: 'MathChat-Custom-v1.0'
        };
      }
    }

    // Geometri soruları
    if (lowerMessage.includes('alan') || lowerMessage.includes('çevre') || lowerMessage.includes('hacim')) {
      return {
        content: `📐 **Geometri Yardımcısı:**\n\nGeometri sorunuz için size yardımcı olmak istiyorum!\n\n**Yaygın formüller:**\n• Kare alanı: a²\n• Dikdörtgen alanı: a × b\n• Daire alanı: π × r²\n• Üçgen alanı: (taban × yükseklik) ÷ 2\n\nDaha spesifik bir soru sorarsanız detaylı çözüm verebilirim.`,
        model: 'MathChat-Custom-v1.0'
      };
    }

    // Cebir soruları
    if (lowerMessage.includes('denklem') || lowerMessage.includes('x') || lowerMessage.includes('çöz')) {
      return {
        content: `🔢 **Cebir Uzmanı:**\n\nCebir sorunuzla ilgili yardım edebilirim!\n\n**Temel yöntemler:**\n• Değişkenleri bir tarafa topla\n• Sabitleri diğer tarafa geçir\n• Her iki tarafı da aynı sayıyla böl/çarp\n\nDenkleминizi yazarsanız adım adım çözebilirim.`,
        model: 'MathChat-Custom-v1.0'
      };
    }

    // Genel matematik yardımı
    return {
      content: `🎓 **MathChat Özel Modeli:**\n\nMatematik sorunuzla ilgili yardımcı olmak istiyorum!\n\n**Uzmanlaştığım alanlar:**\n• Temel aritmetik işlemler (4 işlem)\n• Geometri (alan, çevre, hacim)\n• Temel cebir (denklem çözme)\n• Yüzde hesaplamaları\n\nSorunuzu daha detaylı yazarsanız size özel bir çözüm hazırlayabilirim.`,
      model: 'MathChat-Custom-v1.0'
    };
  }

  // Genel soruları ele al
  private static async handleGeneralQuestion(message: string): Promise<AIResponse> {
    const lowerMessage = message.toLowerCase();
    
    // Selamlama
    if (lowerMessage.includes('merhaba') || lowerMessage.includes('selam') || lowerMessage.includes('hello')) {
      return {
        content: `👋 **Merhaba!**\n\nMathChat özel modeline hoş geldiniz! Ben matematik odaklı bir asistanım.\n\n**Size nasıl yardımcı olabilirim:**\n• Matematik problemleri çözme\n• Formül açıklamaları\n• Adım adım çözüm yolları\n• Geometri ve cebir yardımı\n\nBir matematik sorunuz var mı?`,
        model: 'MathChat-Custom-v1.0'
      };
    }

    // Kim olduğunu sorma
    if (lowerMessage.includes('kimsin') || lowerMessage.includes('nedir') || lowerMessage.includes('tanıt')) {
      return {
        content: `🤖 **MathChat Özel Modeli v1.0:**\n\nBen özel olarak matematik problemleri için eğitilmiş bir yapay zeka modeliyim.\n\n**Özelliklerim:**\n• Matematik problemleri çözme\n• Adım adım açıklamalar\n• Türkçe matematik desteği\n• Hızlı hesaplamalar\n• Görsel formül açıklamaları\n\nMatematik konularında size nasıl yardımcı olabilirim?`,
        model: 'MathChat-Custom-v1.0'
      };
    }

    // Genel yardım
    return {
      content: `💡 **MathChat Özel Modeli:**\n\nBen matematik odaklı bir asistanım. Size en iyi şekilde yardımcı olabilmek için matematik soruları sormaya odaklanmanızı öneririm.\n\n**Deneyebileceğiniz sorular:**\n• "25 + 17 kaç eder?"\n• "Dairenin alanı nasıl hesaplanır?"\n• "2x + 5 = 15 denklemini çöz"\n\nMatematik dışındaki sorular için **API Model** seçeneğini kullanabilirsiniz.`,
      model: 'MathChat-Custom-v1.0'
    };
  }

  // Önceki mesajları ChatMessage formatına çevir
  static formatPreviousMessages(messages: any[]): ChatMessage[] {
    const formatted: ChatMessage[] = [];
    
    for (const msg of messages) {
      formatted.push({ role: 'user', content: msg.message });
      formatted.push({ role: 'assistant', content: msg.response });
    }
    
    return formatted;
  }
}

export default AIService; 