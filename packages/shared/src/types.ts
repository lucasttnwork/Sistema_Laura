// Shared TypeScript types for BMAD project

import { z } from 'zod';

// User schema
export const UserSchema = z.object({
  id: z.string().cuid(),
  nome: z.string().min(1),
  cargo: z.string().min(1),
  whatsapp: z
    .string()
    .regex(/^\+?[1-9]\d{1,14}$/, 'Número deve estar no formato E.164 (com ou sem "+" de entrada)'),
  password: z.string().min(6),
  createdAt: z.date(),
  updatedAt: z.date()
});

export type User = z.infer<typeof UserSchema>;

// Obra (Construction Project) schema
export const ObraSchema = z.object({
  id: z.string().cuid(),
  nome: z.string().min(1),
  fiscalId: z.string().min(1),
  status: z.enum(['ativo', 'inativo', 'concluido']).default('ativo'),
  createdAt: z.date(),
  updatedAt: z.date()
});

export type Obra = z.infer<typeof ObraSchema>;

// Solicitação (Request) schema
export const SolicitacaoSchema = z.object({
  id: z.string().cuid(),
  obraId: z.string().min(1),
  item: z.string().min(1),
  quantidade: z.string().min(1),
  especificacoes: z.string().optional(),
  status: z.enum(['pendente', 'em_andamento', 'aprovada', 'reprovada', 'concluida']).default('pendente'),
  createdAt: z.date(),
  updatedAt: z.date()
});

export type Solicitacao = z.infer<typeof SolicitacaoSchema>;

// WhatsApp message schema
export const WhatsAppMessageSchema = z.object({
  id: z.string(),
  from: z.string(),
  to: z.string(),
  body: z.string(),
  timestamp: z.number(),
  type: z.enum(['text', 'media', 'location', 'contact'])
});

export type WhatsAppMessage = z.infer<typeof WhatsAppMessageSchema>;

// API Response schema
export const APIResponseSchema = z.object({
  ok: z.boolean(),
  data: z.unknown().optional(),
  error: z.string().optional(),
  message: z.string().optional()
});

export type APIResponse = z.infer<typeof APIResponseSchema>;
