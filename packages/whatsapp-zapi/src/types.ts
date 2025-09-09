// TypeScript types for WhatsApp Z-API integration

export interface ZAPIMessage {
  id: string;
  from: string;
  to: string;
  body: string;
  timestamp: number;
  type: 'text' | 'media' | 'location' | 'contact';
  mediaUrl?: string;
  caption?: string;
}

export interface ZAPIWebhook {
  event: string;
  instanceId: string;
  data: ZAPIMessage;
}

export interface QuotationData {
  obra: string;
  item: string;
  quantidade: string;
  fornecedores: QuotationSupplier[];
}

export interface QuotationSupplier {
  nome: string;
  valorUnitario: string;
  valorTotal: string;
  prazo: string;
  pagamento: string;
  contato?: string;
}

export interface Laura01Config {
  zapi: {
    apiUrl: string;
    apiToken: string;
    instanceId: string;
  };
  database: {
    url: string;
  };
  redis: {
    url: string;
  };
}
