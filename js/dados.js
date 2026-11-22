// =====================================================================
//  CAMADA DE DADOS
//  - Com SUPABASE_URL preenchido: usa o Supabase (banco + arquivos + login)
//  - Sem configuração: modo demonstração (localStorage deste navegador)
//  Todas as tabelas ficam em memória em `store` para as telas lerem.
// =====================================================================
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './config.js?v=202611221736';

export const TABELAS = ['clientes', 'projetos', 'etapas', 'itens', 'recebimentos',
  'orcamentos', 'parceiros', 'complementares', 'pagamentos_parceiros', 'pendencias', 'servicos', 'despesas', 'tarefas', 'anexos', 'config'];

export const store = Object.fromEntries(TABELAS.map(t => [t, []]));
export const modoDemo = !SUPABASE_URL || !SUPABASE_ANON_KEY;

let sb = null;          // cliente supabase
const CHAVE_DEMO = 'ab_gestao_demo_v1';
const CHAVE_ARQ_DEMO = 'ab_gestao_demo_arquivos_v1';

export const uid = () => (crypto.randomUUID ? crypto.randomUUID()
  : 'id-' + Date.now().toString(36) + Math.random().toString(36).slice(2));

// ---------------------------------------------------------------- início
export async function iniciar() {
  if (modoDemo) {
    lerDemo();
    return { logado: true, usuario: { email: 'demonstracao' } };
  }
  const { createClient } = await import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.118.0/+esm');
  sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  const { data } = await sb.auth.getSession();
  return { logado: !!data.session, usuario: data.session?.user };
}

export async function entrar(email, senha) {
  let data, error;
  try { ({ data, error } = await sb.auth.signInWithPassword({ email, password: senha })); }
  catch { throw new Error('Não foi possível conectar ao servidor. Verifique a internet e tente de novo.'); }
  if (error) {
    if (error.message === 'Invalid login credentials') throw new Error('E-mail ou senha incorretos.');
    if (/fetch|network/i.test(error.message)) throw new Error('Não foi possível conectar ao servidor. Verifique a internet e tente de novo.');
    throw new Error(error.message);
  }
  return data.user;
}
export async function sair() { if (sb) await sb.auth.signOut(); location.reload(); }

// ---------------------------------------------------------------- leitura
// O Supabase devolve no máximo 1.000 linhas por consulta: lê em páginas até acabar.
const PAGINA = 1000;
async function lerTabelaInteira(tabela) {
  const linhas = [];
  for (let de = 0; ; de += PAGINA) {
    const { data, error } = await sb.from(tabela).select('*').order('id').range(de, de + PAGINA - 1);
    if (error) return { error };
    linhas.push(...(data || []));
    if (!data || data.length < PAGINA) return { data: linhas };
  }
}

export async function carregarTudo() {
  if (modoDemo) return;
  const res = await Promise.all(TABELAS.map(lerTabelaInteira));
  const faltando = [];
  res.forEach((r, i) => {
    if (r.error) {
      // tabela nova ainda não criada no banco: segue funcionando sem ela
      if (/does not exist|could not find the table|schema cache/i.test(r.error.message)) { faltando.push(TABELAS[i]); store[TABELAS[i]] = []; return; }
      throw new Error(`Erro ao ler ${TABELAS[i]}: ${r.error.message}`);
    }
    store[TABELAS[i]] = r.data || [];
  });
  tabelasFaltando.splice(0, tabelasFaltando.length, ...faltando);
}

/** Tabelas que ainda não existem no banco (precisa rodar o SQL de atualização). */
export const tabelasFaltando = [];

export const porId = (tabela, id) => store[tabela].find(r => r.id === id);

// ---------------------------------------------------------------- escrita
function erroBanco(error) {
  if (/column|schema cache|does not exist|could not find the table/i.test(error.message)) {
    return new Error('O banco precisa de uma atualização. Rode o SQL de atualização no Supabase e tente de novo.');
  }
  return new Error(error.message);
}

function limpar(obj) {
  const o = {};
  for (const [k, v] of Object.entries(obj)) o[k] = v === '' ? null : v;
  return o;
}

export async function inserir(tabela, dados) {
  const lista = (Array.isArray(dados) ? dados : [dados]).map(d => limpar({ id: uid(), ...d }));
  if (!lista.length) return [];
  if (modoDemo) {
    const agora = new Date().toISOString();
    lista.forEach(r => { if (!('criado_em' in r)) r.criado_em = agora; });
    store[tabela].push(...lista); salvarDemo();
    return lista;
  }
  // envia em blocos (checklists podem ter centenas de itens)
  const salvos = [];
  for (let i = 0; i < lista.length; i += 400) {
    const { data, error } = await sb.from(tabela).insert(lista.slice(i, i + 400)).select();
    if (error) throw erroBanco(error);
    salvos.push(...data);
  }
  store[tabela].push(...salvos);
  return salvos;
}

export async function atualizar(tabela, id, patch) {
  patch = limpar(patch);
  if (!modoDemo) {
    const { error } = await sb.from(tabela).update(patch).eq('id', id);
    if (error) throw erroBanco(error);
  }
  const r = porId(tabela, id);
  if (r) Object.assign(r, patch);
  if (modoDemo) salvarDemo();
  return r;
}

export async function remover(tabela, id) {
  if (!modoDemo) {
    const { error } = await sb.from(tabela).delete().eq('id', id);
    if (error) throw new Error(error.message);
  }
  store[tabela] = store[tabela].filter(r => r.id !== id);
  // remoções em cascata (espelha o banco)
  const cascata = {
    projetos: [['etapas', 'projeto_id'], ['itens', 'projeto_id'], ['recebimentos', 'projeto_id'], ['complementares', 'projeto_id'], ['pendencias', 'projeto_id'], ['servicos', 'projeto_id']],
    etapas: [['itens', 'etapa_id']],
  }[tabela] || [];
  cascata.forEach(([t, campo]) => { store[t] = store[t].filter(r => r[campo] !== id); });
  if (modoDemo) salvarDemo();
}

// ---------------------------------------------------------------- arquivos
export async function enviarArquivo(file, pasta) {
  const nomeSeguro = file.name.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^\w.\-]+/g, '_');
  const path = `${pasta}/${Date.now()}_${nomeSeguro}`;
  if (modoDemo) {
    if (file.size > 1.5 * 1024 * 1024) {
      // no modo demonstração só guardamos o nome de arquivos grandes
      return { path, nome: file.name, tamanho: file.size };
    }
    const dataUrl = await new Promise((ok, erro) => {
      const fr = new FileReader(); fr.onload = () => ok(fr.result); fr.onerror = erro; fr.readAsDataURL(file);
    });
    const arqs = lerJSON(CHAVE_ARQ_DEMO, {});
    arqs[path] = dataUrl;
    try { localStorage.setItem(CHAVE_ARQ_DEMO, JSON.stringify(arqs)); } catch { /* sem espaço: guarda só o nome */ }
    return { path, nome: file.name, tamanho: file.size };
  }
  const { error } = await sb.storage.from('arquivos').upload(path, file, { upsert: false });
  if (error) throw new Error('Falha ao enviar arquivo: ' + error.message);
  return { path, nome: file.name, tamanho: file.size };
}

export async function urlArquivo(path) {
  if (modoDemo) return lerJSON(CHAVE_ARQ_DEMO, {})[path] || null;
  const { data, error } = await sb.storage.from('arquivos').createSignedUrl(path, 60 * 10);
  if (error) throw new Error(error.message);
  return data.signedUrl;
}

export async function apagarArquivo(path) {
  if (modoDemo) {
    const arqs = lerJSON(CHAVE_ARQ_DEMO, {}); delete arqs[path];
    try { localStorage.setItem(CHAVE_ARQ_DEMO, JSON.stringify(arqs)); } catch { /* ignora */ }
    return;
  }
  await sb.storage.from('arquivos').remove([path]);
}

// ---------------------------------------------------------------- demo
function lerJSON(chave, padrao) {
  try { return JSON.parse(localStorage.getItem(chave)) ?? padrao; } catch { return padrao; }
}
function lerDemo() {
  const d = lerJSON(CHAVE_DEMO, null);
  if (d) TABELAS.forEach(t => { store[t] = d[t] || []; });
}
export const demoVazio = () => modoDemo && !lerJSON(CHAVE_DEMO, null);
function salvarDemo() {
  try { localStorage.setItem(CHAVE_DEMO, JSON.stringify(store)); } catch { /* navegador sem armazenamento */ }
}
export function zerarDemo() {
  try { localStorage.removeItem(CHAVE_DEMO); localStorage.removeItem(CHAVE_ARQ_DEMO); } catch { /* ignora */ }
  location.reload();
}
