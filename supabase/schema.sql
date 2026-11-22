-- =====================================================================
--  Gestão Aline Bastos Arquitetura — estrutura do banco (Supabase)
--  Como usar: Supabase > SQL Editor > New query > cole tudo > Run
--  Pode ser executado mais de uma vez sem problemas.
-- =====================================================================

create extension if not exists "pgcrypto";

-- ---------- CLIENTES ----------
create table if not exists clientes (
  id uuid primary key default gen_random_uuid(),
  tipo_pessoa text default 'fisica', -- fisica | juridica
  nome text not null,        -- nome completo ou razão social
  documento text,            -- CPF / CNPJ
  responsaveis jsonb default '[]'::jsonb, -- empresa: [{nome, cargo, telefone, email}]
  familia jsonb default '[]'::jsonb,      -- pessoa física: [{nome, parentesco, idade, idade_em, profissao, obs}]
  telefone text,
  email text,
  endereco text,
  cidade text,
  aniversario date,
  origem text,               -- indicação, Instagram, etc.
  observacoes text,
  criado_em timestamptz default now()
);

-- atualização (para bancos criados antes): tipo de pessoa e responsáveis
alter table clientes add column if not exists tipo_pessoa text default 'fisica';
alter table clientes add column if not exists responsaveis jsonb default '[]'::jsonb;
alter table clientes add column if not exists familia jsonb default '[]'::jsonb;

-- ---------- PROJETOS ----------
create table if not exists projetos (
  id uuid primary key default gen_random_uuid(),
  codigo text,
  cliente_id uuid references clientes(id) on delete set null,
  nome text not null,
  categoria text not null,   -- arquitetonico | interiores | complementares
  tipo text,                 -- residencial | comercial | industrial | paginacao_piso | forro
  intervencao text,          -- novo | reforma | ampliacao
  endereco_obra text,
  area_m2 numeric,
  valor_contrato numeric,
  data_assinatura date,
  data_inicio date,
  data_prevista date,
  status text default 'ativo', -- ativo | pausado | concluido | cancelado
  contrato_path text,
  contrato_nome text,
  observacoes text,
  criado_em timestamptz default now()
);

-- ---------- ETAPAS DO PROJETO ----------
create table if not exists etapas (
  id uuid primary key default gen_random_uuid(),
  projeto_id uuid references projetos(id) on delete cascade,
  ordem int default 0,
  chave text,                -- fase de referência (briefing, estudo, anteprojeto...)
  nome text not null,
  descricao text,
  entrega text,
  data_inicio date,
  prazo date,
  status text default 'pendente', -- pendente | andamento | concluida | na
  concluida_em date
);

-- ---------- ITENS DO CHECKLIST ----------
create table if not exists itens (
  id uuid primary key default gen_random_uuid(),
  etapa_id uuid references etapas(id) on delete cascade,
  projeto_id uuid references projetos(id) on delete cascade,
  grupo text,
  texto text not null,
  ordem int default 0,
  status text default 'pendente', -- pendente | andamento | concluido | na
  responsavel text,
  data date,
  obs text
);

-- ---------- RECEBIMENTOS (pagamentos programados do cliente) ----------
create table if not exists recebimentos (
  id uuid primary key default gen_random_uuid(),
  projeto_id uuid references projetos(id) on delete cascade,
  descricao text not null,
  valor numeric default 0,
  gatilho text default 'data', -- data | etapa
  vencimento date,
  etapa_id uuid references etapas(id) on delete set null,
  status text default 'previsto', -- previsto | pago
  pago_em date,
  forma text,
  obs text,
  ordem int default 0
);

-- ---------- ORÇAMENTOS ----------
create table if not exists orcamentos (
  id uuid primary key default gen_random_uuid(),
  numero text,
  cliente_id uuid references clientes(id) on delete set null,
  cliente_nome text,
  telefone text,
  email text,
  categoria text,
  tipo text,
  intervencao text,
  area_m2 numeric,
  descricao text,
  escopo text,
  valor numeric default 0,
  condicoes text,
  data date default current_date,
  validade date,
  status text default 'rascunho', -- rascunho | enviado | aprovado | recusado
  projeto_id uuid references projetos(id) on delete set null,
  obs text,
  criado_em timestamptz default now()
);

-- ---------- PARCEIROS (engenheiros dos projetos complementares) ----------
create table if not exists parceiros (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  empresa text,
  especialidade text,
  registro text,      -- CREA / CAU
  telefone text,
  email text,
  pix text,
  obs text,
  criado_em timestamptz default now()
);

-- ---------- PROJETOS COMPLEMENTARES (repassados aos parceiros) ----------
create table if not exists complementares (
  id uuid primary key default gen_random_uuid(),
  projeto_id uuid references projetos(id) on delete cascade,
  parceiro_id uuid references parceiros(id) on delete set null,
  disciplina text not null,
  informacoes text,
  enviado_em date,
  prazo date,
  entregue_em date,
  valor numeric default 0,
  status text default 'a_enviar', -- a_enviar | enviado | andamento | revisao | entregue
  pago boolean default false,
  pago_em date,
  obs text,
  criado_em timestamptz default now()
);

-- ---------- PAGAMENTOS AOS PARCEIROS (lançados por data, abatem o saldo) ----------
create table if not exists pagamentos_parceiros (
  id uuid primary key default gen_random_uuid(),
  parceiro_id uuid references parceiros(id) on delete cascade,
  data date not null default current_date,
  valor numeric not null default 0,
  forma text,
  obs text,
  criado_em timestamptz default now()
);
create index if not exists idx_pagparc_parceiro on pagamentos_parceiros(parceiro_id);

-- ---------- PENDÊNCIAS DO CLIENTE (projeto aguardando decisão/ação do cliente) ----------
create table if not exists pendencias (
  id uuid primary key default gen_random_uuid(),
  projeto_id uuid references projetos(id) on delete cascade,
  etapa_id uuid references etapas(id) on delete set null,
  tipo text,                 -- aprovacao | pagamento | acabamento | informacao | outro
  descricao text not null,
  solicitado_em date default current_date,
  prazo date,                -- até quando cobrar o cliente
  status text default 'aberta', -- aberta | resolvida
  resolvido_em date,
  cobrancas int default 0,   -- quantas vezes foi cobrado
  ultima_cobranca date,
  obs text,
  criado_em timestamptz default now()
);
create index if not exists idx_pend_projeto on pendencias(projeto_id);

-- ---------- TAREFAS DA EQUIPE ----------
create table if not exists tarefas (
  id uuid primary key default gen_random_uuid(),
  titulo text not null,
  descricao text,
  responsavel text,
  projeto_id uuid references projetos(id) on delete set null,
  prazo date,
  prioridade text default 'media', -- baixa | media | alta
  status text default 'afazer',     -- afazer | fazendo | feito
  ordem int default 0,
  criado_em timestamptz default now()
);

-- ---------- ANEXOS (arquivos) ----------
create table if not exists anexos (
  id uuid primary key default gen_random_uuid(),
  ref_tipo text not null,   -- projeto | complementar | cliente | orcamento
  ref_id uuid not null,
  categoria text,           -- contrato | arquivo | entrega ...
  nome text not null,
  path text not null,
  tamanho bigint,
  criado_em timestamptz default now()
);

create index if not exists idx_etapas_projeto on etapas(projeto_id);
create index if not exists idx_itens_etapa on itens(etapa_id);
create index if not exists idx_receb_projeto on recebimentos(projeto_id);
create index if not exists idx_compl_projeto on complementares(projeto_id);
create index if not exists idx_anexos_ref on anexos(ref_tipo, ref_id);

-- ---------- SEGURANÇA: só usuárias logadas (Aline, Julia) acessam ----------
-- permissões de acesso às tabelas (projetos novos do Supabase não liberam automaticamente)
grant usage on schema public to authenticated;
grant select, insert, update, delete on all tables in schema public to authenticated;
alter default privileges in schema public
  grant select, insert, update, delete on tables to authenticated;

do $$
declare t text;
begin
  foreach t in array array['clientes','projetos','etapas','itens','recebimentos','orcamentos','parceiros','complementares','pagamentos_parceiros','pendencias','tarefas','anexos']
  loop
    execute format('alter table %I enable row level security', t);
    execute format('drop policy if exists "equipe_total" on %I', t);
    execute format('create policy "equipe_total" on %I for all to authenticated using (true) with check (true)', t);
  end loop;
end $$;

-- ---------- ARMAZENAMENTO DE ARQUIVOS (contratos, plantas, PDFs) ----------
insert into storage.buckets (id, name, public)
values ('arquivos', 'arquivos', false)
on conflict (id) do nothing;

drop policy if exists "equipe_arquivos_ler" on storage.objects;
drop policy if exists "equipe_arquivos_enviar" on storage.objects;
drop policy if exists "equipe_arquivos_alterar" on storage.objects;
drop policy if exists "equipe_arquivos_apagar" on storage.objects;
create policy "equipe_arquivos_ler"    on storage.objects for select to authenticated using (bucket_id = 'arquivos');
create policy "equipe_arquivos_enviar" on storage.objects for insert to authenticated with check (bucket_id = 'arquivos');
create policy "equipe_arquivos_alterar" on storage.objects for update to authenticated using (bucket_id = 'arquivos');
create policy "equipe_arquivos_apagar" on storage.objects for delete to authenticated using (bucket_id = 'arquivos');
