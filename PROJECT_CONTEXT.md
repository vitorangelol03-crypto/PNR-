# Contexto do Projeto

## Informações Gerais
- **Nome do Projeto**: Logistica Manager Pro
- **Descrição**: Sistema de gerenciamento logístico com dashboard e importação de dados
- **Data de Início**: 2025-12-08
- **Tecnologias Principais**:
  - React 18.2.0
  - TypeScript 5.2.2
  - Vite 5.1.5
  - Supabase (cliente JS 2.39.7)
  - Recharts 2.12.2 (gráficos)
  - Lucide React 0.344.0 (ícones)
  - Papa Parse 5.4.1 (importação CSV)

## Objetivo do Projeto
Sistema de gerenciamento logístico que permite visualizar dados através de um dashboard e realizar importação de dados via CSV. O sistema utiliza Supabase como backend e banco de dados.

## Estrutura do Projeto
```
/project
├── App.tsx                         # Componente principal com lógica de conexão
├── index.tsx                       # Entry point da aplicação
├── index.html                      # HTML principal
├── types.ts                        # Definições de tipos TypeScript
├── vite.config.ts                  # Configuração do Vite
├── package.json                    # Dependências e scripts
├── .env                            # Variáveis de ambiente
├── PROJECT_CONTEXT.md              # Arquivo de contexto do projeto
├── /components
│   ├── Dashboard.tsx               # Dashboard principal com KPIs e tabela
│   ├── ConnectionModal.tsx         # Modal de conexão com Supabase
│   └── ImportModal.tsx             # Modal de importação de dados CSV
└── /services
    └── supabaseService.ts          # Serviço de integração com Supabase
```

## Estado Atual do Projeto

### Funcionalidades Implementadas
- [x] Conexão com Supabase (manual e via variáveis de ambiente)
- [x] Modal de conexão customizável
- [x] Dashboard principal
- [x] Modal de importação de dados
- [x] Serviço de integração com Supabase

### Configuração Atual
- **Supabase URL**: https://rmaiejrslwbbizviqejx.supabase.co (hardcoded como fallback)
- **Conexão**: Auto-connect habilitado com credenciais de fallback
- **Build**: TypeScript + Vite

## Histórico de Alterações

### 2025-12-08 - Inicialização do Projeto
- **Modificações**: Criação do arquivo de contexto do projeto
- **Arquivos Afetados**: PROJECT_CONTEXT.md
- **Motivo**: Documentar contexto completo do projeto e manter histórico de alterações
- **Status**: Concluído

### 2025-12-08 - Correção de Erros de Build
- **Modificações**:
  - Removida pasta `/src` duplicada com componentes e serviços
  - Instalado plugin `@vitejs/plugin-react` que faltava nas dependências
  - Build agora compila com sucesso
- **Arquivos Afetados**:
  - Removidos: `/src/components/Dashboard.tsx`, `/src/services/supabaseService.ts`
  - Modificado: `package.json` (adicionado `@vitejs/plugin-react`)
- **Motivo**: Projeto tinha estrutura duplicada causando erros de importação no TypeScript
- **Status**: Concluído
- **Resultado**: Build executado com sucesso, projeto pronto para desenvolvimento

## Decisões Técnicas

### 2025-12-08 - Estrutura de Arquivos Duplicada (RESOLVIDO)
- **Contexto**: Existiam arquivos duplicados em `/components` e `/src/components`, e em `/services` e `/src/services`
- **Decisão**: Manter apenas a estrutura na raiz (`/components` e `/services`)
- **Motivo**: App.tsx importa de `./components` e `./services` (caminhos relativos à raiz)
- **Ação Tomada**: Removida completamente a pasta `/src` duplicada
- **Status**: Resolvido

### 2025-12-08 - Credenciais Hardcoded
- **Contexto**: Credenciais do Supabase estão hardcoded no App.tsx como fallback
- **Decisão**: Mantidas por enquanto para garantir funcionamento imediato
- **Risco de Segurança**: Alto - credenciais expostas no código
- **Recomendação**: Mover para variáveis de ambiente

## Próximos Passos
- [x] Consolidar estrutura de arquivos (eliminar duplicação) - CONCLUÍDO
- [x] Instalar dependências faltantes (@vitejs/plugin-react) - CONCLUÍDO
- [ ] Remover credenciais hardcoded do código
- [ ] Verificar e documentar esquema do banco de dados Supabase
- [ ] Implementar políticas de segurança (RLS) no Supabase
- [ ] Adicionar tratamento de erros mais robusto
- [ ] Otimizar tamanho do bundle (atualmente 776KB)

## Problemas Conhecidos
- ~~**Duplicação de Arquivos**: Componentes e serviços existem em duas localizações diferentes~~ ✅ RESOLVIDO
- **Segurança**: Credenciais expostas no código-fonte
- **Documentação**: Falta documentação sobre o esquema do banco de dados
- **Performance**: Bundle de produção com 776KB (considerar code-splitting)

## Notas Importantes
- O projeto está configurado para funcionar imediatamente com credenciais de fallback
- O sistema tenta primeiro usar variáveis de ambiente, depois usa fallback
- O modal de conexão permite conexão manual caso as credenciais padrão falhem
- A aplicação usa React 18 com TypeScript em modo estrito

## Sessão de Chat Atual

### Solicitação do Usuário
1. Responder sempre em português
2. Criar arquivo de contexto (MD) para registrar tudo do chat e atualizações do projeto
3. Ler este arquivo para nunca perder o contexto

### Status
- ✅ Arquivo PROJECT_CONTEXT.md criado
- ✅ Estrutura completa de documentação implementada
- ✅ Idioma configurado para português (pt-BR)
- ✅ Erros de build corrigidos
- ✅ Estrutura de arquivos consolidada
- ✅ Dependências instaladas
- ✅ Build executado com sucesso
