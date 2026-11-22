// =====================================================================
//  Regras do escritório: criação de projeto, fases, progresso,
//  situação dos recebimentos e dos complementares.
// =====================================================================
import { store, inserir, atualizar, porId, enviarArquivo } from './dados.js?v=202611221710';
import { itensDoGrupo, CATEGORIAS, TIPOS, INTERVENCOES, FASE_DA_CHAVE } from './modelos.js?v=202611221710';
import { hoje, diasAte } from './util.js?v=202611221710';

export const nomeCliente = (id) => porId('clientes', id)?.nome || 'Sem cliente';
export const nomeParceiro = (id) => porId('parceiros', id)?.nome || 'A definir';

export function descricaoTipo(p) {
  const tipo = TIPOS[p.categoria]?.[p.tipo] || '';
  const interv = p.intervencao ? ` · ${INTERVENCOES[p.intervencao]}` : '';
  return `${CATEGORIAS[p.categoria] || ''}${tipo && p.categoria !== 'complementares' ? ' · ' + tipo : ''}${interv}`;
}

export const etapasDo = (pid) => store.etapas.filter(e => e.projeto_id === pid).sort((a, b) => a.ordem - b.ordem);
export const itensDa = (eid) => store.itens.filter(i => i.etapa_id === eid).sort((a, b) => a.ordem - b.ordem);
export const recebimentosDo = (pid) => store.recebimentos.filter(r => r.projeto_id === pid)
  .sort((a, b) => (a.ordem ?? 0) - (b.ordem ?? 0));

const feito = (s) => s === 'concluido' || s === 'concluida' || s === 'na';

export function progressoEtapa(eid) {
  const it = itensDa(eid).filter(i => i.status !== 'na');
  const ok = it.filter(i => i.status === 'concluido').length;
  return { total: it.length, feitos: ok, pct: it.length ? Math.round(ok / it.length * 100) : 0 };
}

export function progressoProjeto(pid) {
  const et = etapasDo(pid).filter(e => e.status !== 'na');
  if (!et.length) return { pct: 0, etapasFeitas: 0, etapas: 0 };
  // cada etapa vale o mesmo; dentro da etapa conta o checklist
  let soma = 0;
  et.forEach(e => { soma += e.status === 'concluida' ? 100 : progressoEtapa(e.id).pct * 0.95; });
  return { pct: Math.round(soma / et.length), etapasFeitas: et.filter(e => e.status === 'concluida').length, etapas: et.length };
}

/** Primeira etapa ainda não concluída (fase em que o projeto está). */
export const faseAtual = (pid) => etapasDo(pid).find(e => !feito(e.status)) || null;

export function colunaDoQuadro(p) {
  if (p.status === 'concluido') return 'entrega';
  const f = faseAtual(p.id);
  if (!f) return 'entrega';
  if (f.chave && FASE_DA_CHAVE[f.chave]) return FASE_DA_CHAVE[f.chave];
  // etapa personalizada: usa a fase da etapa anterior com chave conhecida
  const anteriores = etapasDo(p.id).filter(e => e.ordem < f.ordem && e.chave && FASE_DA_CHAVE[e.chave]);
  return anteriores.length ? FASE_DA_CHAVE[anteriores[anteriores.length - 1].chave] : 'contratacao';
}

// ---------------------------------------------------------------- recebimentos
export function situacaoRecebimento(r) {
  if (r.status === 'pago') return { cod: 'pago', txt: 'Recebido' };
  if (r.gatilho === 'etapa') {
    const e = porId('etapas', r.etapa_id);
    if (!e) return { cod: 'previsto', txt: 'Etapa removida' };
    if (e.status === 'concluida') return { cod: 'liberado', txt: 'Liberado p/ cobrar' };
    return { cod: 'aguardando', txt: `Aguarda: ${e.nome}` };
  }
  if (r.vencimento && diasAte(r.vencimento) < 0) return { cod: 'atrasado', txt: 'Atrasado' };
  return { cod: 'previsto', txt: 'A vencer' };
}
/** Data de referência para ordenar/agrupar (vencimento, conclusão ou prazo da etapa). */
export function dataReferencia(r) {
  if (r.status === 'pago') return r.pago_em || r.vencimento;
  if (r.gatilho === 'etapa') {
    const e = porId('etapas', r.etapa_id);
    return e?.concluida_em || e?.prazo || null;
  }
  return r.vencimento;
}

// ---------------------------------------------------------------- complementares
export const STATUS_COMPL = {
  a_enviar: 'A enviar', enviado: 'Enviado', andamento: 'Em andamento', revisao: 'Em revisão', entregue: 'Entregue',
};
/**
 * Conta corrente do parceiro: soma o que ele cobrou nos complementares e
 * abate os pagamentos lançados, do complementar mais antigo para o mais novo.
 */
export function contaParceiro(parceiroId) {
  const compl = store.complementares.filter(c => c.parceiro_id === parceiroId && Number(c.valor) > 0)
    .sort((a, b) => String(a.enviado_em || a.criado_em || a.prazo || '').localeCompare(String(b.enviado_em || b.criado_em || b.prazo || '')));
  const pagamentos = store.pagamentos_parceiros.filter(p => p.parceiro_id === parceiroId)
    .sort((a, b) => String(b.data).localeCompare(String(a.data)));
  const total = compl.reduce((s, c) => s + Number(c.valor), 0);
  const pago = pagamentos.reduce((s, p) => s + Number(p.valor || 0), 0);
  let resta = pago;
  const quitacao = {};
  compl.forEach(c => { const v = Math.min(Number(c.valor), Math.max(0, resta)); quitacao[c.id] = v; resta -= v; });
  return { total, pago, saldo: +(total - pago).toFixed(2), credito: Math.max(0, +(pago - total).toFixed(2)), quitacao, pagamentos, compl };
}

/** Situação de pagamento de um complementar dentro da conta do parceiro. */
export function pagamentoCompl(c) {
  if (!Number(c.valor)) return { cod: 'sem_valor', pago: 0, falta: 0 };
  if (!c.parceiro_id) return { cod: 'apagar', pago: 0, falta: Number(c.valor) };
  const pago = contaParceiro(c.parceiro_id).quitacao[c.id] || 0;
  const falta = +(Number(c.valor) - pago).toFixed(2);
  return { cod: falta <= 0.009 ? 'pago' : pago > 0 ? 'parcial' : 'apagar', pago, falta };
}

// ---------------------------------------------------------------- pendências do cliente
export const TIPOS_PENDENCIA = {
  aprovacao: 'Aprovação (layout, estudo, projeto)',
  pagamento: 'Pagamento',
  acabamento: 'Escolha de acabamento / material',
  informacao: 'Envio de informação / documento',
  outro: 'Outra decisão',
};
export const pendenciasAbertas = (pid) => store.pendencias
  .filter(x => x.status !== 'resolvida' && (!pid || x.projeto_id === pid))
  .sort((a, b) => String(a.prazo || '9').localeCompare(String(b.prazo || '9')));

/** Complementares do projeto ainda não entregues pelos parceiros. */
export function esperaComplementares(pid) {
  const todos = store.complementares.filter(c => c.projeto_id === pid);
  const pendentes = todos.filter(c => c.status !== 'entregue');
  return { total: todos.length, recebidos: todos.length - pendentes.length, pendentes };
}
/** O projeto está parado na compatibilização esperando os parceiros? */
export function aguardandoParceiros(pid) {
  const f = faseAtual(pid);
  if (!f || f.chave !== 'compatibilizacao') return null;
  const esp = esperaComplementares(pid);
  return esp.pendentes.length ? esp : null;
}

/**
 * Cor de situação do projeto (borda dos cartões):
 * vermelho = etapa atual com prazo vencido
 * laranja  = aguardando cliente / parceiros / contrato assinado / cobrança liberada
 * verde    = tudo certo
 */
export function saudeProjeto(p) {
  if (!['ativo', 'pausado'].includes(p.status)) return { cor: 'neutro', motivos: [] };
  const motivos = [];
  const f = faseAtual(p.id);
  const atrasado = f?.prazo && diasAte(f.prazo) < 0;
  if (atrasado) motivos.push(`Etapa "${f.nome}" atrasada ${-diasAte(f.prazo)} dia(s)`);
  const pend = pendenciasAbertas(p.id);
  if (pend.length) motivos.push(`Aguardando cliente: ${pend.map(x => x.descricao).join('; ')}`);
  const esp = aguardandoParceiros(p.id);
  if (esp) motivos.push(`Aguardando parceiros (${esp.recebidos}/${esp.total} recebidos)`);
  if (!p.contrato_assinado) motivos.push('Contrato assinado ainda não recebido');
  const cobrar = store.recebimentos.filter(r => r.projeto_id === p.id && ['liberado', 'atrasado'].includes(situacaoRecebimento(r).cod));
  if (cobrar.length) motivos.push(`Pagamento para cobrar: ${cobrar.map(r => r.descricao).join(', ')}`);
  const cor = atrasado ? 'vermelho' : motivos.length ? 'laranja' : 'verde';
  return { cor, motivos: motivos.length ? motivos : ['Tudo em dia'] };
}
export const NOMES_SAUDE = { verde: 'Tudo certo', laranja: 'Aguardando', vermelho: 'Em atraso' };

export function complAtrasado(c) { return c.status !== 'entregue' && c.prazo && diasAte(c.prazo) < 0; }

// ---------------------------------------------------------------- criação de projeto
function proximoCodigo() {
  const ano = hoje().slice(0, 4);
  const n = store.projetos.filter(p => (p.codigo || '').includes(ano)).length + 1;
  return `AB-${ano}-${String(n).padStart(3, '0')}`;
}

/**
 * Cria projeto + etapas + checklist + recebimentos.
 * etapas: [{chave,nome,entrega,data_inicio,prazo,grupos}]
 * recebimentos: [{descricao,valor,gatilho,vencimento,etapaIndice}]
 */
export async function criarProjeto({ projeto, etapas, recebimentos = [] }) {
  const [p] = await inserir('projetos', { codigo: proximoCodigo(), status: 'ativo', ...projeto });

  const etapasRows = etapas.map((e, i) => ({
    projeto_id: p.id, ordem: (i + 1) * 10, chave: e.chave || null, nome: e.nome,
    entrega: e.entrega || null, data_inicio: e.data_inicio || null, prazo: e.prazo || null,
    status: i === 0 ? 'andamento' : 'pendente',
  }));
  const salvas = await inserir('etapas', etapasRows);

  const itens = [];
  etapas.forEach((e, i) => {
    let ordem = 0;
    Object.entries(e.grupos || {}).forEach(([grupo, txt]) => {
      itensDoGrupo(txt).forEach(t => itens.push({
        etapa_id: salvas[i].id, projeto_id: p.id, grupo, texto: t, ordem: (ordem += 10), status: 'pendente',
      }));
    });
  });
  await inserir('itens', itens);

  await inserir('recebimentos', recebimentos.map((r, i) => ({
    projeto_id: p.id, descricao: r.descricao, valor: r.valor || 0, gatilho: r.gatilho,
    vencimento: r.gatilho === 'data' ? r.vencimento || null : null,
    etapa_id: r.gatilho === 'etapa' ? salvas[r.etapaIndice]?.id || null : null,
    status: r.status || 'previsto', pago_em: r.pago_em || null, ordem: i,
  })));

  return p;
}

/** Conclui a etapa, inicia a próxima e devolve os recebimentos liberados por ela. */
export async function concluirEtapa(etapa) {
  await atualizar('etapas', etapa.id, { status: 'concluida', concluida_em: hoje() });
  const prox = etapasDo(etapa.projeto_id).find(e => e.ordem > etapa.ordem && e.status === 'pendente');
  if (prox) await atualizar('etapas', prox.id, { status: 'andamento' });
  if (!faseAtual(etapa.projeto_id)) await atualizar('projetos', etapa.projeto_id, { status: 'concluido' });
  return store.recebimentos.filter(r => r.etapa_id === etapa.id && r.status !== 'pago');
}

export async function reabrirEtapa(etapa) {
  await atualizar('etapas', etapa.id, { status: 'andamento', concluida_em: null });
  const p = porId('projetos', etapa.projeto_id);
  if (p?.status === 'concluido') await atualizar('projetos', p.id, { status: 'ativo' });
}
