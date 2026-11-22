// =====================================================================
//  Regras do escritório: criação de projeto, fases, progresso,
//  situação dos recebimentos e dos complementares.
// =====================================================================
import { store, inserir, atualizar, porId, enviarArquivo } from './dados.js?v=202611221305';
import { itensDoGrupo, CATEGORIAS, TIPOS, INTERVENCOES, FASE_DA_CHAVE } from './modelos.js?v=202611221305';
import { hoje, diasAte } from './util.js?v=202611221305';

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
export function complAtrasado(c) { return c.status !== 'entregue' && c.prazo && diasAte(c.prazo) < 0; }

// ---------------------------------------------------------------- criação de projeto
function proximoCodigo() {
  const ano = hoje().slice(0, 4);
  const n = store.projetos.filter(p => (p.codigo || '').includes(ano)).length + 1;
  return `AB-${ano}-${String(n).padStart(3, '0')}`;
}

/**
 * Cria projeto + etapas + checklist + recebimentos (+ contrato anexado).
 * etapas: [{chave,nome,entrega,data_inicio,prazo,grupos}]
 * recebimentos: [{descricao,valor,gatilho,vencimento,etapaIndice}]
 */
export async function criarProjeto({ projeto, etapas, recebimentos = [], contrato = null }) {
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

  if (contrato) {
    const arq = await enviarArquivo(contrato, `projetos/${p.id}`);
    await atualizar('projetos', p.id, { contrato_path: arq.path, contrato_nome: arq.nome });
    await inserir('anexos', { ref_tipo: 'projeto', ref_id: p.id, categoria: 'Contrato', nome: arq.nome, path: arq.path, tamanho: arq.tamanho });
  }
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
