import { ZAPIClient } from './zapi-client';
import { logger } from '@bmad/observability';

export interface WhatsAppMessage {
  id: string;
  from: string;
  to: string;
  body: string;
  timestamp: number;
  type: string;
}

export class WhatsAppMessageHandler {
  private zapiClient: ZAPIClient;

  constructor(zapiClient: ZAPIClient) {
    this.zapiClient = zapiClient;
  }

  /**
   * Process incoming message
   */
  async processMessage(message: WhatsAppMessage): Promise<void> {
    try {
      logger.info('Processing WhatsApp message', {
        from: message.from,
        type: message.type,
        messageId: message.id
      });

      // Basic message processing logic for Laura 01
      const response = await this.generateResponse(message);

      if (response) {
        await this.zapiClient.sendMessage(message.from, response);
      }
    } catch (error) {
      logger.error('Error processing message', { message, error });
    }
  }

  /**
   * Generate response based on message content
   */
  private async generateResponse(message: WhatsAppMessage): Promise<string | null> {
    const body = message.body.toLowerCase();

    // Basic responses for Laura 01 workflow
    if (body.includes('solicitação') || body.includes('material')) {
      return 'Olá! Sou Laura 01, responsável pelas compras da Kabbatec. Para processar sua solicitação, preciso dos seguintes dados: item, quantidade, especificações e fornecedores para cotação.';
    }

    if (body.includes('orcamento') || body.includes('cotação')) {
      return 'Vou enviar a solicitação de orçamento para os fornecedores indicados. Assim que receber as respostas, preparo o mapa de cotação para sua aprovação.';
    }

    if (body.includes('status') || body.includes('situação')) {
      return 'Vou verificar o status da sua solicitação e retorno em breve com as informações atualizadas.';
    }

    // Default response
    return 'Olá! Sou Laura 01, agente de compras da Kabbatec. Como posso ajudar com suas necessidades de materiais e suprimentos?';
  }

  /**
   * Send formatted quotation map
   */
  async sendQuotationMap(phone: string, quotationData: any): Promise<void> {
    try {
      const message = this.formatQuotationMap(quotationData);
      await this.zapiClient.sendMessage(phone, message);
    } catch (error) {
      logger.error('Error sending quotation map', { phone, error });
    }
  }

  /**
   * Format quotation data into readable message
   */
  private formatQuotationMap(data: any): string {
    let message = '📋 *MAPA DE COTAÇÃO - KABBATEC*\n\n';

    message += `🏗️ Obra: ${data.obra}\n`;
    message += `📦 Item: ${data.item}\n`;
    message += `🔢 Quantidade: ${data.quantidade}\n\n`;

    if (data.fornecedores && data.fornecedores.length > 0) {
      message += '*FORNECEDORES:*\n\n';

      data.fornecedores.forEach((fornecedor: any, index: number) => {
        message += `${index + 1}. *${fornecedor.nome}*\n`;
        message += `   💰 Valor unitário: R$ ${fornecedor.valorUnitario}\n`;
        message += `   💵 Valor total: R$ ${fornecedor.valorTotal}\n`;
        message += `   📅 Prazo: ${fornecedor.prazo}\n`;
        message += `   💳 Pagamento: ${fornecedor.pagamento}\n\n`;
      });
    }

    message += '✅ *Aguardando sua aprovação para prosseguir.*';

    return message;
  }
}
