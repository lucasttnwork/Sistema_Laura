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
import { useObras } from '../../lib/hooks/use-api';
import { Loader2, Calendar, Building, Package, FileText } from 'lucide-react';

interface SolicitacaoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: SolicitacaoFormData) => Promise<void>;
  solicitacao?: Solicitacao | null;
}

interface SolicitacaoFormData {
  obraId: string;
  item: string;
  quantidade: number;
  especificacoes?: string;
}

interface Solicitacao {
  id: string;
  obraId: string;
  item: string;
  quantidade: number;
  especificacoes?: string;
  status: string;
  createdAt: string;
  obra: {
    nome: string;
  };
}

interface SolicitacaoDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  solicitacao: Solicitacao | null;
}

export function SolicitacaoModal({ isOpen, onClose, onSubmit, solicitacao }: SolicitacaoModalProps) {
  const isEditing = !!solicitacao;
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { data: obras = [], loading: loadingObras } = useObras();

  const handleSubmit = async (data: SolicitacaoFormData) => {
    setIsSubmitting(true);
    try {
      await onSubmit(data);
      onClose();
    } catch (error) {
      console.error('Erro ao criar solicitação:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Garantir que obras seja sempre um array
  const safeObras = Array.isArray(obras) ? obras : [];

  const obraOptions = safeObras.map((obra: any) => ({
    value: obra.id,
    label: obra.nome,
  }));

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Editar Solicitação' : 'Nova Solicitação'}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? 'Atualize os dados da solicitação selecionada.'
              : 'Preencha os dados abaixo para criar uma nova solicitação de materiais.'
            }
          </DialogDescription>
        </DialogHeader>

        <SmartForm
          onSubmit={handleSubmit}
          schema={{
            obraId: { required: 'Selecione uma obra' },
            item: {
              required: 'Nome do item é obrigatório',
              minLength: { value: 3, message: 'Nome deve ter pelo menos 3 caracteres' }
            },
            quantidade: {
              required: 'Quantidade é obrigatória',
              min: { value: 1, message: 'Quantidade deve ser maior que 0' }
            },
            especificacoes: {
              maxLength: { value: 500, message: 'Especificações devem ter no máximo 500 caracteres' }
            },
          }}
          defaultValues={{
            obraId: solicitacao?.obraId || '',
            item: solicitacao?.item || '',
            quantidade: solicitacao?.quantidade || 1,
            especificacoes: solicitacao?.especificacoes || '',
          }}
        >
          {(form) => (
            <>
              <div className="space-y-4 py-4">
                <SmartSelect
                  form={form}
                  name="obraId"
                  label="Obra"
                  placeholder="Selecione uma obra"
                  required
                  options={obraOptions}
                />

                <SmartInput
                  form={form}
                  name="item"
                  label="Item/Material"
                  placeholder="Ex: Cimento CP-II, Tijolo 9x19x19..."
                  required
                />

                <SmartInput
                  form={form}
                  name="quantidade"
                  label="Quantidade"
                  type="number"
                  placeholder="0"
                  required
                  min="1"
                />

                <SmartTextarea
                  form={form}
                  name="especificacoes"
                  label="Especificações Técnicas"
                  placeholder="Detalhes técnicos, marca preferida, normas, etc."
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
                <Button type="submit" disabled={isSubmitting || loadingObras}>
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {isEditing ? 'Atualizando...' : 'Criando...'}
                    </>
                  ) : (
                    isEditing ? 'Atualizar Solicitação' : 'Criar Solicitação'
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

export function SolicitacaoDetailsModal({ isOpen, onClose, solicitacao }: SolicitacaoDetailsModalProps) {
  if (!solicitacao) return null;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PENDENTE':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'EM_COTACAO':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'AGUARDANDO_APROVACAO':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'APROVADA':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'REPROVADA':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'FINALIZADA':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'PENDENTE':
        return 'Pendente';
      case 'EM_COTACAO':
        return 'Em Cotação';
      case 'AGUARDANDO_APROVACAO':
        return 'Aguardando Aprovação';
      case 'APROVADA':
        return 'Aprovada';
      case 'REPROVADA':
        return 'Reprovada';
      case 'FINALIZADA':
        return 'Finalizada';
      default:
        return status;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Detalhes da Solicitação
          </DialogTitle>
          <DialogDescription>
            Informações completas sobre a solicitação #{solicitacao.id}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Status */}
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-600">Status</span>
            <Badge variant="outline" className={getStatusColor(solicitacao.status)}>
              {getStatusText(solicitacao.status)}
            </Badge>
          </div>

          {/* Data de Criação */}
          <div className="flex items-center gap-3">
            <Calendar className="h-4 w-4 text-gray-400" />
            <div>
              <span className="text-sm font-medium text-gray-600">Criada em</span>
              <p className="text-sm text-gray-900">
                {new Date(solicitacao.createdAt).toLocaleDateString('pt-BR', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </p>
            </div>
          </div>

          {/* Obra */}
          <div className="flex items-center gap-3">
            <Building className="h-4 w-4 text-gray-400" />
            <div>
              <span className="text-sm font-medium text-gray-600">Obra</span>
              <p className="text-sm text-gray-900">{solicitacao.obra?.nome || 'Não informada'}</p>
            </div>
          </div>

          {/* Item */}
          <div className="flex items-start gap-3">
            <Package className="h-4 w-4 text-gray-400 mt-0.5" />
            <div className="flex-1">
              <span className="text-sm font-medium text-gray-600">Item/Material</span>
              <p className="text-sm text-gray-900 mt-1">{solicitacao.item}</p>
            </div>
          </div>

          {/* Quantidade */}
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-600">Quantidade</span>
            <span className="text-sm text-gray-900 font-medium">{solicitacao.quantidade}</span>
          </div>

          {/* Especificações */}
          {solicitacao.especificacoes && (
            <div className="flex items-start gap-3">
              <FileText className="h-4 w-4 text-gray-400 mt-0.5" />
              <div className="flex-1">
                <span className="text-sm font-medium text-gray-600">Especificações Técnicas</span>
                <p className="text-sm text-gray-900 mt-1 whitespace-pre-wrap">{solicitacao.especificacoes}</p>
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
