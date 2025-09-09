import axios, { AxiosInstance } from 'axios';
import { logger } from '@bmad/observability';

export interface ZAPIConfig {
  apiUrl: string;
  apiToken: string;
  instanceId: string;
}

export class ZAPIClient {
  private client: AxiosInstance;
  private config: ZAPIConfig;

  constructor(config: ZAPIConfig) {
    this.config = config;

    this.client = axios.create({
      baseURL: `${config.apiUrl}/instances/${config.instanceId}`,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.apiToken}`
      },
      timeout: 30000
    });

    // Add request/response interceptors for logging
    this.client.interceptors.request.use(
      (config) => {
        logger.info('Z-API Request', {
          url: config.url,
          method: config.method,
          data: config.data
        });
        return config;
      },
      (error) => {
        logger.error('Z-API Request Error', error);
        return Promise.reject(error);
      }
    );

    this.client.interceptors.response.use(
      (response) => {
        logger.info('Z-API Response', {
          status: response.status,
          data: response.data
        });
        return response;
      },
      (error) => {
        logger.error('Z-API Response Error', error);
        return Promise.reject(error);
      }
    );
  }

  /**
   * Send text message
   */
  async sendMessage(phone: string, message: string): Promise<any> {
    try {
      const response = await this.client.post('/send-text', {
        phone,
        message
      });
      return response.data;
    } catch (error) {
      logger.error('Failed to send message', { phone, error });
      throw error;
    }
  }

  /**
   * Send media message
   */
  async sendMedia(phone: string, mediaUrl: string, caption?: string): Promise<any> {
    try {
      const response = await this.client.post('/send-media', {
        phone,
        media: mediaUrl,
        caption
      });
      return response.data;
    } catch (error) {
      logger.error('Failed to send media', { phone, mediaUrl, error });
      throw error;
    }
  }

  /**
   * Get instance status
   */
  async getStatus(): Promise<any> {
    try {
      const response = await this.client.get('/status');
      return response.data;
    } catch (error) {
      logger.error('Failed to get status', { error });
      throw error;
    }
  }

  /**
   * Get QR Code for instance connection
   */
  async getQRCode(): Promise<any> {
    try {
      const response = await this.client.get('/qrcode');
      return response.data;
    } catch (error) {
      logger.error('Failed to get QR code', { error });
      throw error;
    }
  }
}
