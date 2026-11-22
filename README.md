# Gestão Aline Bastos · Arquitetura Exclusiva

Aplicativo de gestão do escritório, com clientes, projetos e etapas, checklists baseados nas NBRs, financeiro, orçamentos, tarefas da equipe e projetos complementares com engenheiros parceiros.

Foi feito em HTML e JavaScript puro, sem etapa de compilação, e usa o **Supabase** para banco de dados, arquivos e login. Pode ser publicado no **GitHub Pages** ou no **Cloudflare Pages**.

## O que o app faz

| Tela | Para que serve |
|---|---|
| **Painel** | Projetos em andamento com a fase atual, o que cobrar agora, os próximos prazos (etapas, parceiros, tarefas e recebimentos) e os indicadores do mês. |
| **Projetos** | Quadro por fase, no estilo Trello, ou lista. O botão **Novo projeto** abre um assistente em 4 passos: cliente → tipo de projeto → etapas e prazos → contrato e pagamentos. |
| **Projeto** | Trilha das etapas e, em cada etapa, o checklist para ir concluindo. Os itens podem estar Pendente, Em andamento, Concluído ou Não se aplica. Dá para acrescentar etapas, grupos e itens próprios. Ao concluir uma etapa, os pagamentos ligados a ela são liberados para cobrança. O projeto também tem abas de Financeiro, Complementares, Tarefas, Arquivos e Dados. |
| **Clientes** | Cadastro do cliente, os projetos dele, os orçamentos, os documentos e o resumo financeiro. |
| **Financeiro** | A receber (por data certa ou por entrega de fase), recebidos, a pagar aos parceiros e a visão do ano mês a mês. |
| **Orçamentos** | Propostas com situação, taxa de aprovação e a proposta em PDF no papel timbrado. O botão **Aprovar → projeto** abre o cadastro do projeto já preenchido. |
| **Tarefas da equipe** | Quadro A fazer / Fazendo / Feito com cartões arrastáveis e filtro por pessoa (Aline, Julia). |
| **Parceiros** | Engenheiros parceiros e o que foi repassado a cada um: disciplina, informações enviadas, arquivos, prazo, valor e se já foi pago. |

### Tipos de projeto e caminhos (etapas)

Os caminhos estão em `js/modelos.js` e foram montados a partir do *Checklist de Desenvolvimento de Projetos* (NBR 16636-1, 16636-2, 16636-5 e NBR 6492):

- **Projeto Arquitetônico**
  - Residencial, comercial ou industrial, cada um como novo, reforma ou ampliação. Reforma e ampliação acrescentam o levantamento da edificação existente e a planta de demolir/construir. Comercial e industrial acrescentam os requisitos específicos (Vigilância Sanitária, NR-24, licenciamento ambiental etc.).
  - Paginação de piso.
  - Projeto de forro.
- **Projeto de Interiores**: residencial, comercial ou industrial.
- **Projetos Complementares**: sempre com engenheiros parceiros.

As etapas **Viabilidade**, **Licenciamento** e **Acompanhamento de obra** são opcionais e você marca no cadastro de cada projeto.

Os pagamentos padrão são 30% de entrada, 30% na apresentação do 3D e 40% na entrega final. Cada parcela pode ser cobrada **por data certa** ou **na conclusão de uma etapa**.

---

## Como colocar no ar

### 1. Supabase (banco de dados)

1. Em [supabase.com](https://supabase.com), clique em **New project** e use, por exemplo, o nome `Gestao_AlineBastos`, a região **South America (São Paulo)** e uma senha forte.
2. Abra **SQL Editor → New query**, cole todo o conteúdo de [`supabase/schema.sql`](supabase/schema.sql) e clique em **Run**.
3. Em **Authentication → Users → Add user → Create new user**, crie o login da Aline e o da Julia, com e-mail e senha. Marque *Auto Confirm User*.
4. Em **Authentication → Sign In / Providers → Email**, você pode desligar *Allow new users to sign up*, para que ninguém mais crie conta.
5. Em **Project Settings → API Keys**, copie a **Publishable key** (`sb_publishable_…`). A Project URL é `https://<id-do-projeto>.supabase.co`.

### 2. Configurar o app

Abra `js/config.js` e preencha:

```js
export const SUPABASE_URL = 'https://xxxxxxxx.supabase.co';
export const SUPABASE_ANON_KEY = 'sb_publishable_...';
```

A chave *publishable* pode ficar no código (nunca use a *secret*). Quem protege os dados é o login, pelas regras de segurança (RLS) criadas no `schema.sql`.

Enquanto o `config.js` estiver vazio, o app abre em **modo demonstração**, com dados de exemplo guardados só no navegador.

### 3. Publicar (GitHub Pages)

No repositório, vá em **Settings → Pages → Branch: `main` / root → Save**. Em poucos minutos o app fica disponível em
`https://alinecristinybastos-ux.github.io/gestao-aline-bastos-arquitetura/`.

No celular, abra o endereço e use **Adicionar à tela de início**. O app abre como um aplicativo, com o ícone da marca.

---

## Estrutura dos arquivos

```
index.html            página única
css/estilo.css        identidade visual (cores, fonte Questrial)
assets/               logos, padrões e fonte
js/config.js          dados do Supabase e equipe
js/modelos.js         etapas e checklists de cada tipo de projeto (edite aqui)
js/dados.js           comunicação com o Supabase / modo demonstração
js/negocio.js         regras: progresso, fases, pagamentos liberados
js/componentes.js     formulários e anexos compartilhados
js/telas/*.js         uma tela por arquivo
js/exemplo.js         dados do modo demonstração
supabase/schema.sql   estrutura do banco
```

**Depois de alterar qualquer arquivo**, rode `sh versao.sh` antes de enviar ao GitHub. Ele marca uma versão nova para o navegador não usar cópias antigas.

Para testar no computador, rode `python3 -m http.server` na pasta e abra `http://localhost:8000`.
