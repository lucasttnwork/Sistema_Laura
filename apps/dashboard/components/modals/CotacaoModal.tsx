import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { SmartForm, SmartInput, SmartTextarea, SmartSelect } from '../ui/smart-form';
import { useFornecedores, useSolicitacoes } from '../../lib/hooks/use-api';
import { Loader2, Calendar, Building, Package, FileText, DollarSign, Clock, CreditCard } from 'lucide-react';

interface CotacaoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CotacaoFormData) => Promise<void>;
  cotacao?: Cotacao | null;
}

interface CotacaoFormData {
  solicitacaoId: string;
  fornecedorId: string;
  valorUnitario: number;
  prazoDias: number;
  pagamentoTermo: string;
  observacoes?: string;
}

interface Cotacao {
  id: string;
  solicitacaoId: string;
  fornecedorId: string;
  valorUnitario: number;
  valorTotal: number;
  prazoDias: number;
  pagamentoTermo: string;
  status: string;
  observacoes?: string;
  createdAt: string;
  solicitacao: {
    item: string;
    obra: {
      nome: string;
    };
  };
  fornecedor: {
    nome: string;
  };
}

interface CotacaoDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  cotacao: Cotacao | null;
}

const PAGAMENTO_TERMOS = [
  { value: 'VISTA', label: 'À Vista' },
  { value: 'DEPOSITO', label: 'Depósito' },
  { value: 'PIX', label: 'PIX' },
  { value: 'BOLETO', label: 'Boleto' },
  { value: 'CHEQUE', label: 'Cheque' },
  { value: 'CARTAO_CREDITO', label: 'Cartão de Crédito' },
  { value: 'CARTAO_DEBITO', label: 'Cartão de Débito' },
  { value: 'TRANSFERENCIA', label: 'Transferência' },
];

export function CotacaoModal({ isOpen, onClose, onSubmit, cotacao }: CotacaoModalProps) {
  const isEditing = !!cotacao;
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { data: solicitacoes = [], loading: loadingSolicitacoes } = useSolicitacoes();
  const { data: fornecedores = [], loading: loadingFornecedores } = useFornecedores();

  const handleSubmit = async (data: CotacaoFormData) => {
    setIsSubmitting(true);
    try {
      await onSubmit(data);
      onClose();
    } catch (error) {
      console.error('Erro ao processar cotação:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Garantir que solicitacoes e fornecedores sejam sempre arrays
  const safeSolicitacoes = Array.isArray(solicitacoes) ? solicitacoes : [];
  const safeFornecedores = Array.isArray(fornecedores) ? fornecedores : [];

  const solicitacaoOptions = safeSolicitacoes.map((solicitacao: any) => ({
    value: solicitacao.id,
    label: `${solicitacao.item} (${solicitacao.obra?.nome || 'Obra não informada'})`,
  }));

  const fornecedorOptions = safeFornecedores.map((fornecedor: any) => ({
    value: fornecedor.id,
    label: fornecedor.nome,
  }));

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Editar Cotação' : 'Nova Cotação'}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? 'Atualize os dados da cotação selecionada.'
              : 'Preencha os dados abaixo para criar uma nova cotação.'
            }
          </DialogDescription>
        </DialogHeader>

        <SmartForm
          onSubmit={handleSubmit}
          schema={{
            solicitacaoId: { required: 'Selecione uma solicitação' },
            fornecedorId: { required: 'Selecione um fornecedor' },
            valorUnitario: {
              required: 'Valor unitário é obrigatório',
              min: { value: 0.01, message: 'Valor deve ser maior que 0' }
            },
            prazoDias: {
              required: 'Prazo é obrigatório',
              min: { value: 1, message: 'Prazo deve ser pelo menos 1 dia' }
            },
            pagamentoTermo: { required: 'Selecione uma forma de pagamento' },
            observacoes: {
              maxLength: { value: 500, message: 'Observações devem ter no máximo 500 caracteres' }
            },
          }}
          defaultValues={{
            solicitacaoId: cotacao?.solicitacaoId || '',
            fornecedorId: cotacao?.fornecedorId || '',
            valorUnitario: cotacao?.valorUnitario || 0,
            prazoDias: cotacao?.prazoDias || 1,
            pagamentoTermo: cotacao?.pagamentoTermo || '',
            observacoes: cotacao?.observacoes || '',
          }}
        >
          {(form) => (
            <>
              <div className="space-y-4 py-4">
                <SmartSelect
                  form={form}
                  name="solicitacaoId"
                  label="Solicitação"
                  placeholder="Selecione uma solicitação"
                  required
                  options={solicitacaoOptions}
                />

                <SmartSelect
                  form={form}
                  name="fornecedorId"
                  label="Fornecedor"
                  placeholder="Selecione um fornecedor"
                  required
                  options={fornecedorOptions}
                />

                <div className="grid grid-cols-2 gap-4">
                  <SmartInput
                    form={form}
                    name="valorUnitario"
                    label="Valor Unitário (R$)"
                    type="number"
                    placeholder="0.00"
                    step="0.01"
                    min="0.01"
                    required
                  />

                  <SmartInput
                    form={form}
                    name="prazoDias"
                    label="Prazo (dias)"
                    type="number"
                    placeholder="0"
                    min="1"
                    required
                  />
                </div>

                <SmartSelect
                  form={form}
                  name="pagamentoTermo"
                  label="Forma de Pagamento"
                  placeholder="Selecione a forma de pagamento"
                  required
                  options={PAGAMENTO_TERMOS}
                />

                <SmartTextarea
                  form={form}
                  name="observacoes"
                  label="Observações"
                  placeholder="Observações adicionais sobre a cotação..."
                  rows={3}
                />
              </div>

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={onClose}
                  disabled={isSubmitting}
                >
                  Cancelar
                </Button>
                <Button type="submit" disabled={isSubmitting || loadingSolicitacoes || loadingFornecedores}>
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {isEditing ? 'Atualizando...' : 'Criando...'}
                    </>
                  ) : (
                    isEditing ? 'Atualizar Cotação' : 'Criar Cotação'
                  )}
                </Button>
              </DialogFooter>
            </>
          )}
        </SmartForm>
      </DialogContent>
    </Dialog>
  );
}

export function CotacaoDetailsModal({ isOpen, onClose, cotacao }: CotacaoDetailsModalProps) {
  if (!cotacao) return null;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ENVIADA':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'RECEBIDA':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'EM_ANALISE':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'APROVADA':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'REPROVADA':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'EXPIRADA':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'ENVIADA':
        return 'Enviada';
      case 'RECEBIDA':
        return 'Recebida';
      case 'EM_ANALISE':
        return 'Em Análise';
      case 'APROVADA':
        return 'Aprovada';
      case 'REPROVADA':
        return 'Reprovada';
      case 'EXPIRADA':
        return 'Expirada';
      default:
        return status;
    }
  };

  const getPagamentoTermoText = (termo: string) => {
    const option = PAGAMENTO_TERMOS.find(opt => opt.value === termo);
    return option ? option.label : termo.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase());
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Detalhes da Cotação
          </DialogTitle>
          <DialogDescription>
            Informações completas sobre a cotação #{cotacao.id}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Status */}
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-600">Status</span>
            <Badge variant="outline" className={getStatusColor(cotacao.status)}>
              {getStatusText(cotacao.status)}
            </Badge>
          </div>

          {/* Data de Criação */}
          <div className="flex items-center gap-3">
            <Calendar className="h-4 w-4 text-gray-400" />
            <div>
              <span className="text-sm font-medium text-gray-600">Criada em</span>
              <p className="text-sm text-gray-900">
                {new Date(cotacao.createdAt).toLocaleDateString('pt-BR', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </p>
            </div>
          </div>

          {/* Solicitação */}
          <div className="flex items-start gap-3">
            <Package className="h-4 w-4 text-gray-400 mt-0.5" />
            <div className="flex-1">
              <span className="text-sm font-medium text-gray-600">Item Solicitado</span>
              <p className="text-sm text-gray-900 mt-1">{cotacao.solicitacao?.item || 'Item não informado'}</p>
              <p className="text-xs text-gray-500 mt-1">
                Obra: {cotacao.solicitacao?.obra?.nome || 'Não informada'}
              </p>
            </div>
          </div>

          {/* Fornecedor */}
          <div className="flex items-center gap-3">
            <Building className="h-4 w-4 text-gray-400" />
            <div>
              <span className="text-sm font-medium text-gray-600">Fornecedor</span>
              <p className="text-sm text-gray-900">{cotacao.fornecedor?.nome || 'Não informado'}</p>
            </div>
          </div>

          {/* Valores */}
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center gap-3">
              <DollarSign className="h-4 w-4 text-gray-400" />
              <div>
                <span className="text-sm font-medium text-gray-600">Valor Unitário</span>
                <p className="text-sm text-gray-900">R$ {cotacao.valorUnitario.toFixed(2)}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <DollarSign className="h-4 w-4 text-gray-400" />
              <div>
                <span className="text-sm font-medium text-gray-600">Valor Total</span>
                <p className="text-sm text-gray-900">R$ {cotacao.valorTotal.toFixed(2)}</p>
              </div>
            </div>
          </div>

          {/* Prazo */}
          <div className="flex items-center gap-3">
            <Clock className="h-4 w-4 text-gray-400" />
            <div>
              <span className="text-sm font-medium text-gray-600">Prazo de Entrega</span>
              <p className="text-sm text-gray-900">{cotacao.prazoDias} dias</p>
            </div>
          </div>

          {/* Forma de Pagamento */}
          <div className="flex items-center gap-3">
            <CreditCard className="h-4 w-4 text-gray-400" />
            <div>
              <span className="text-sm font-medium text-gray-600">Forma de Pagamento</span>
              <p className="text-sm text-gray-900">{getPagamentoTermoText(cotacao.pagamentoTermo)}</p>
            </div>
          </div>

          {/* Observações */}
          {cotacao.observacoes && (
            <div className="flex items-start gap-3">
              <FileText className="h-4 w-4 text-gray-400 mt-0.5" />
              <div className="flex-1">
                <span className="text-sm font-medium text-gray-600">Observações</span>
                <p className="text-sm text-gray-900 mt-1 whitespace-pre-wrap">{cotacao.observacoes}</p>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
