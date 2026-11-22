// =====================================================================
//  PROJETO — etapas com checklist, financeiro, complementares,
//  tarefas, arquivos e dados do projeto
// =====================================================================
import { store, porId, inserir, atualizar, remover } from '../dados.js?v=202611221357';
import { h, icone, moeda, data, hoje, formModal, confirmar, aviso, tentar, diasAte } from '../util.js?v=202611221357';
import { nav } from '../nav.js?v=202611221357';
import { EQUIPE } from '../config.js?v=202611221357';
import { CATEGORIAS } from '../modelos.js?v=202611221357';
import {
  nomeCliente, descricaoTipo, etapasDo, itensDa, progressoEtapa, progressoProjeto, faseAtual,
  recebimentosDo, concluirEtapa, reabrirEtapa, situacaoRecebimento, esperaComplementares, nomeParceiro, complAtrasado, STATUS_COMPL, pendenciasAbertas,
} from '../negocio.js?v=202611221357';
import {
  tagPrazo, formRecebimento, tagRecebimento, marcarRecebido, formComplementar, linhaComplementar,
  ligarLinhasComplementares, formComplementaresContratados, formPendencia, linhaPendencia, ligarPendencias, formTarefa, avatar, blocoAnexos, ligarBlocoAnexos, opcoesClientes, opcoesEquipe, responsaveisDe, familiaDe, idadeAtual,
} from '../componentes.js?v=202611221357';
import { STATUS_PROJ } from './projetos.js?v=202611221357';

const estado = { projeto: null, aba: 'etapas', etapa: null };
const ST_ITEM = { pendente: 'Pendente', andamento: 'Em andamento', concluido: 'Concluído', na: 'Não se aplica' };
const ST_ETAPA = { pendente: 'Não iniciada', andamento: 'Em andamento', concluida: 'Concluída', na: 'Não se aplica' };

export function render(el, [id, aba]) {
  const p = porId('projetos', id);
  if (!p) { el.innerHTML = `<div class="cartao vazio">Projeto não encontrado. <br><a href="#/projetos">Voltar aos projetos</a></div>`; return; }
  if (estado.projeto !== id) { estado.projeto = id; estado.etapa = null; estado.aba = 'etapas'; estado.hash = ''; }
  // aba vinda do link (#/projeto/id/financeiro) só é aplicada ao entrar
  if (aba && estado.hash !== location.hash) estado.aba = aba;
  estado.hash = location.hash;
  const etapas = etapasDo(id);
  if (!estado.etapa || !etapas.some(e => e.id === estado.etapa)) estado.etapa = (faseAtual(id) || etapas[etapas.length - 1])?.id || null;

  const pr = progressoProjeto(id);
  const cli = porId('clientes', p.cliente_id);
  const nCompl = store.complementares.filter(c => c.projeto_id === id).length;
  const nTar = store.tarefas.filter(t => t.projeto_id === id && t.status !== 'feito').length;
  const nArq = store.anexos.filter(a => a.ref_tipo === 'projeto' && a.ref_id === id).length;
  const cobrar = recebimentosDo(id).filter(r => ['liberado', 'atrasado'].includes(situacaoRecebimento(r).cod)).length;

  el.innerHTML = `
    <a class="migalha" href="#/projetos">${icone('voltar', 15)} Projetos</a>
    <div class="cartao proj-cab">
      <div>
        <div class="cod">${h(p.codigo || '')} · ${h(descricaoTipo(p))}</div>
        <h1>${h(p.nome)}</h1>
        <div class="linha-info">
          <span>${icone('clientes', 15)} ${cli ? `<a href="#/cliente/${cli.id}">${h(cli.nome)}</a>` : 'Sem cliente'}${responsaveisDe(cli).length ? ` · resp.: ${responsaveisDe(cli).map(r => h(r.nome)).join(', ')}` : ''}</span>
          ${p.endereco_obra ? `<span>${icone('projetos', 15)} ${h(p.endereco_obra)}</span>` : ''}
          ${p.area_m2 ? `<span>${h(p.area_m2)} m²</span>` : ''}
          <span>${icone('calendario', 15)} entrega prevista ${data(p.data_prevista)}</span>
          <span><select id="status-proj" class="entrada" style="padding:3px 8px;width:auto">${Object.entries(STATUS_PROJ).map(([k, v]) => `<option value="${k}" ${p.status === k ? 'selected' : ''}>${v}</option>`).join('')}</select></span>
          ${p.contrato_path ? `<span class="tag tag-ok">${icone('check', 12)} Contrato anexado</span>` : `<span class="tag tag-alerta">Contrato não anexado</span>`}
        </div>
      </div>
      <div style="display:flex;flex-direction:column;align-items:center;gap:10px">
        <div class="anel" style="--p:${pr.pct}"><div><div><b>${pr.pct}%</b><br><small>${pr.etapasFeitas}/${pr.etapas} etapas</small></div></div></div>
        <button class="btn btn-peq btn-terracota" id="nova-pend" title="Registrar que o projeto está esperando uma decisão ou ação do cliente">${icone('alerta', 14)} Aguardando cliente</button>
      </div>
    </div>
    ${pendenciasAbertas(id).length ? `<div class="alerta-cliente"><div class="cab-alerta">${icone('alerta', 16)} Aguardando o cliente (${pendenciasAbertas(id).length})</div>
      ${pendenciasAbertas(id).map(x => linhaPendencia(x)).join('')}</div>` : ''}

    <div class="trilha">${etapas.map((e, i) => {
      const cls = e.status === 'concluida' ? 'feito' : e.status === 'na' ? 'na' : e.id === faseAtual(id)?.id ? 'atual' : '';
      const atras = e.prazo && e.status !== 'concluida' && e.status !== 'na' && diasAte(e.prazo) < 0;
      return `<div class="passo ${cls} ${e.id === estado.etapa ? 'selecionado' : ''}" data-ir-etapa="${e.id}" title="${h(e.nome)}">
        <div class="bola">${e.status === 'concluida' ? icone('check', 14) : i + 1}</div>
        <span class="nm">${h(e.nome.length > 34 ? e.nome.slice(0, 32) + '…' : e.nome)}</span>
        <span class="pz ${atras ? 'atrasado' : ''}">${e.status === 'concluida' ? 'concluída ' + data(e.concluida_em).slice(0, 5) : e.prazo ? data(e.prazo).slice(0, 5) : ''}</span></div>`;
    }).join('')}</div>

    <div class="abas">
      ${[['etapas', 'Etapas e checklist'], ['financeiro', 'Financeiro', cobrar], ['complementares', 'Complementares', nCompl], ['tarefas', 'Tarefas', nTar], ['arquivos', 'Arquivos', nArq], ['dados', 'Dados do projeto']]
        .map(([k, n, c]) => `<button data-aba="${k}" class="${estado.aba === k ? 'ativo' : ''}">${n}${c ? ` <span class="contagem">${c}</span>` : ''}</button>`).join('')}
    </div>
    <div id="aba-conteudo"></div>`;

  const area = el.querySelector('#aba-conteudo');
  ({ etapas: abaEtapas, financeiro: abaFinanceiro, complementares: abaComplementares, tarefas: abaTarefas, arquivos: abaArquivos, dados: abaDados })[estado.aba](area, p);

  el.querySelectorAll('[data-aba]').forEach(b => b.addEventListener('click', () => { estado.aba = b.dataset.aba; render(el, [id]); }));
  el.querySelectorAll('[data-ir-etapa]').forEach(b => b.addEventListener('click', () => { estado.etapa = b.dataset.irEtapa; estado.aba = 'etapas'; render(el, [id]); }));
  el.querySelector('#nova-pend').addEventListener('click', () => formPendencia(null, { projeto_id: id, etapa_id: estado.etapa }));
  ligarPendencias(el);
  el.querySelector('#status-proj').addEventListener('change', async e => {
    await tentar(() => atualizar('projetos', id, { status: e.target.value }), 'Situação atualizada'); nav.recarregar();
  });
}

// =====================================================================
//  ABA ETAPAS
// =====================================================================
function abaEtapas(area, p) {
  const etapas = etapasDo(p.id);
  const e = porId('etapas', estado.etapa);
  area.innerHTML = `<div class="etapas-layout">
    <div class="cartao lista-etapas">
      ${etapas.map((et, i) => {
        const pg = progressoEtapa(et.id);
        return `<div class="et ${et.status} ${et.id === estado.etapa ? 'sel' : ''}" data-sel-etapa="${et.id}">
          <div class="marca-et">${et.status === 'concluida' ? icone('check', 13) : ''}</div>
          <div><div class="nm">${i + 1}. ${h(et.nome)}</div>
            <div class="sb">${et.status === 'concluida' ? `concluída ${data(et.concluida_em)}` : et.status === 'na' ? 'não se aplica' : tagPrazo(et.prazo)}<span>${pg.feitos}/${pg.total}</span></div>
            ${pendenciasAbertas(p.id).some(x => x.etapa_id === et.id) ? `<div class="sb"><span class="tag tag-terracota">${icone('alerta', 11)} aguardando cliente</span></div>` : ''}
            ${et.chave === 'compatibilizacao' && et.status !== 'concluida' && et.status !== 'na' && esperaComplementares(p.id).pendentes.length
              ? `<div class="sb"><span class="tag tag-terracota">${icone('enviar', 11)} aguardando parceiros · ${esperaComplementares(p.id).recebidos}/${esperaComplementares(p.id).total} recebidos</span></div>` : ''}
            ${et.status !== 'na' ? `<div class="progresso"><span style="width:${et.status === 'concluida' ? 100 : pg.pct}%"></span></div>` : ''}</div>
        </div>`;
      }).join('')}
      <button class="btn btn-leve add" id="add-etapa">${icone('mais', 15)} Acrescentar etapa</button>
    </div>
    <div>${e ? detalheEtapa(e, etapas) : '<div class="cartao vazio">Este projeto ainda não tem etapas. <br><button class="btn btn-primario" id="add-etapa2">Acrescentar etapa</button></div>'}</div>
  </div>`;

  area.querySelectorAll('[data-sel-etapa]').forEach(d => d.addEventListener('click', () => { estado.etapa = d.dataset.selEtapa; nav.recarregar(); }));
  area.querySelector('#add-etapa').addEventListener('click', () => formEtapa(null, p));
  area.querySelector('#add-etapa2')?.addEventListener('click', () => formEtapa(null, p));
  if (e) ligarEtapa(area, e, p);
}

function detalheEtapa(e, etapas) {
  const itens = itensDa(e.id);
  const pg = progressoEtapa(e.id);
  const grupos = [];
  itens.forEach(i => { let g = grupos.find(x => x.nome === (i.grupo || 'Itens')); if (!g) grupos.push(g = { nome: i.grupo || 'Itens', itens: [] }); g.itens.push(i); });
  const pendentes = itens.filter(i => i.status === 'pendente' || i.status === 'andamento').length;
  const idx = etapas.findIndex(x => x.id === e.id);
  const pagamentos = store.recebimentos.filter(r => r.etapa_id === e.id);

  return `<div class="cartao etapa-det">
    <div class="cartao-cab">
      <h2>${idx + 1}. ${h(e.nome)}</h2>
      <span class="tag ${e.status === 'concluida' ? 'tag-ok' : e.status === 'andamento' ? 'tag-terracota' : 'tag-neutro'}">${ST_ETAPA[e.status]}</span>
      <button class="btn btn-peq btn-leve" data-acao-etapa="pendencia" title="Etapa parada esperando o cliente">${icone('alerta', 14)} Aguardando cliente</button>
      <button class="btn-icone" data-acao-etapa="editar" title="Editar etapa">${icone('editar', 16)}</button>
      <button class="btn-icone" data-acao-etapa="subir" title="Mover para cima" ${idx === 0 ? 'disabled' : ''}>${icone('cima', 16)}</button>
      <button class="btn-icone" data-acao-etapa="descer" title="Mover para baixo" ${idx === etapas.length - 1 ? 'disabled' : ''}>${icone('baixo', 16)}</button>
      <button class="btn-icone" data-acao-etapa="excluir" title="Excluir etapa">${icone('lixo', 16)}</button>
    </div>
    <div class="cartao-corpo">
      <div class="etapa-meta">
        <label>Início <input type="date" data-data-etapa="data_inicio" value="${e.data_inicio || ''}"></label>
        <label>Prazo <input type="date" data-data-etapa="prazo" value="${e.prazo || ''}"></label>
        ${e.status !== 'concluida' && e.status !== 'na' ? tagPrazo(e.prazo) : ''}
        <span>${pg.feitos} de ${pg.total} itens concluídos</span>
      </div>
      ${e.entrega ? `<div class="entrega">${icone('check', 16)}<div><b style="font-weight:400">Entrega da etapa:</b> ${h(e.entrega)}</div></div>` : ''}
      ${e.chave === 'compatibilizacao' ? caixaEspera(e) : ''}
      ${pagamentos.length ? `<div class="entrega" style="background:var(--terracota-clara);color:var(--terracota)">${icone('financeiro', 16)}<div>Ao concluir esta etapa libera: ${pagamentos.map(r => `${h(r.descricao)} (${moeda(r.valor)}) ${r.status === 'pago' ? '— recebido' : ''}`).join(' · ')}</div></div>` : ''}
      <div class="progresso grosso" style="margin-bottom:14px"><span style="width:${e.status === 'concluida' ? 100 : pg.pct}%"></span></div>
      <div class="legenda-status"><span><i></i>Pendente</span><span><i class="a"></i>Em andamento</span><span><i class="c"></i>Concluído</span><span><i class="n"></i>Não se aplica</span><span>· clique na caixa para concluir; no lápis para mais opções</span></div>

      ${grupos.map(g => {
        const ok = g.itens.filter(i => i.status === 'concluido' || i.status === 'na').length;
        return `<div class="grupo-check">
          <h5>${h(g.nome)} <span class="n">${ok}/${g.itens.length}</span>
            <button class="btn-icone" data-grupo-todos="${h(g.nome)}" title="Marcar todos como concluídos">${icone('check', 14)}</button>
            <button class="btn-icone" data-grupo-na="${h(g.nome)}" title="Grupo não se aplica">–</button></h5>
          ${g.itens.map(itemHTML).join('')}
          <form class="novo-item" data-novo-item="${h(g.nome)}"><input placeholder="+ acrescentar item em ${h(g.nome)}" aria-label="Novo item"></form>
        </div>`;
      }).join('')}
      <button class="btn btn-peq" id="novo-grupo">${icone('mais', 14)} Novo grupo de itens</button>
    </div>
    <div class="modal-rodape" style="border-top:1px solid var(--linha)">
      ${e.status === 'concluida'
        ? `<span class="fraco">Concluída em ${data(e.concluida_em)}</span><span class="espaco"></span><button class="btn" data-acao-etapa="reabrir">Reabrir etapa</button>`
        : `<button class="btn btn-leve" data-acao-etapa="na">${e.status === 'na' ? 'Voltar a aplicar' : 'Etapa não se aplica'}</button><span class="espaco"></span>
           ${pendentes === 0 && itens.length ? '<span class="tag tag-ok">Todos os itens concluídos</span>' : ''}
           ${e.status !== 'na' ? `<button class="btn btn-primario" data-acao-etapa="concluir">${icone('check', 16)} Concluir etapa</button>` : ''}`}
    </div>
  </div>`;
}

function caixaEspera(e) {
  const esp = esperaComplementares(e.projeto_id);
  if (!esp.total) return `<div class="espera vazia">${icone('enviar', 16)}<div>Nenhum complementar registrado para este projeto.
    <a href="#/projeto/${e.projeto_id}/complementares">Marcar complementares contratados</a></div></div>`;
  if (!esp.pendentes.length) return `<div class="espera ok">${icone('check', 16)}<div><b>Todos os ${esp.total} complementares foram recebidos.</b> Pode seguir com a compatibilização.</div></div>`;
  const ultimo = esp.pendentes.map(c => c.prazo).filter(Boolean).sort().pop();
  return `<div class="espera">
    <div class="espera-cab">${icone('enviar', 16)}<div><b>Aguardando os parceiros</b> — ${esp.recebidos} de ${esp.total} complementares recebidos${ultimo ? ` · último prazo ${data(ultimo)}` : ''}.
      <div class="fraco">Enquanto espera, o projeto fica nesta etapa. Marque cada um como recebido quando chegar.</div></div></div>
    <table class="tabela"><tbody>${esp.pendentes.map(c => `<tr>
      <td>${h(c.disciplina)}<div class="fraco">${h(nomeParceiro(c.parceiro_id))}</div></td>
      <td><span class="tag ${complAtrasado(c) ? 'tag-atrasado' : 'tag-areia'}">${h(STATUS_COMPL[c.status] || c.status)}</span></td>
      <td>${tagPrazo(c.prazo)}</td>
      <td class="num"><button class="btn btn-peq" data-compl-recebido="${c.id}">${icone('check', 14)} Recebido</button></td></tr>`).join('')}</tbody></table>
  </div>`;
}

function itemHTML(i) {
  const det = [i.responsavel && `${i.responsavel}`, i.data && data(i.data), i.obs && `“${i.obs}”`].filter(Boolean);
  return `<div class="item ${i.status}">
    <button class="caixa" data-item-toggle="${i.id}" title="${ST_ITEM[i.status]} — clique para ${i.status === 'concluido' ? 'desmarcar' : 'concluir'}">${i.status === 'concluido' ? icone('check', 13) : ''}</button>
    <div><div class="tx" data-item-editar="${i.id}">${h(i.texto)}</div>${det.length ? `<div class="det">${det.map(h).join(' · ')}</div>` : ''}</div>
    <div class="acoes-item">
      <button class="btn-icone" data-item-status="${i.id}" data-st="andamento" title="Em andamento">◐</button>
      <button class="btn-icone" data-item-status="${i.id}" data-st="na" title="Não se aplica">–</button>
      <button class="btn-icone" data-item-editar="${i.id}" title="Detalhes">${icone('editar', 14)}</button>
    </div>
  </div>`;
}

function ligarEtapa(area, e, p) {
  const salvarItem = async (id, patch) => { await tentar(() => atualizar('itens', id, patch)); nav.recarregar(); };

  area.querySelectorAll('[data-item-toggle]').forEach(b => b.addEventListener('click', () => {
    const i = porId('itens', b.dataset.itemToggle);
    const novo = i.status === 'concluido' ? 'pendente' : 'concluido';
    salvarItem(i.id, { status: novo, data: novo === 'concluido' ? hoje() : null, responsavel: i.responsavel || (novo === 'concluido' ? EQUIPE[0] : null) });
  }));
  area.querySelectorAll('[data-item-status]').forEach(b => b.addEventListener('click', () => {
    const i = porId('itens', b.dataset.itemStatus);
    salvarItem(i.id, { status: i.status === b.dataset.st ? 'pendente' : b.dataset.st });
  }));
  area.querySelectorAll('[data-item-editar]').forEach(b => b.addEventListener('click', () => formItem(porId('itens', b.dataset.itemEditar))));
  area.querySelectorAll('[data-novo-item]').forEach(f => f.addEventListener('submit', async ev => {
    ev.preventDefault();
    const txt = f.querySelector('input').value.trim(); if (!txt) return;
    const doGrupo = itensDa(e.id).filter(i => (i.grupo || 'Itens') === f.dataset.novoItem);
    const ordem = (doGrupo.length ? doGrupo[doGrupo.length - 1].ordem : 0) + 1;
    await tentar(() => inserir('itens', { etapa_id: e.id, projeto_id: p.id, grupo: f.dataset.novoItem, texto: txt, ordem, status: 'pendente' }));
    nav.recarregar();
    setTimeout(() => document.querySelector(`[data-novo-item="${CSS.escape(f.dataset.novoItem)}"] input`)?.focus(), 30);
  }));
  area.querySelectorAll('[data-grupo-todos]').forEach(b => b.addEventListener('click', async () => {
    const lista = itensDa(e.id).filter(i => (i.grupo || 'Itens') === b.dataset.grupoTodos && i.status !== 'concluido' && i.status !== 'na');
    await tentar(async () => { for (const i of lista) await atualizar('itens', i.id, { status: 'concluido', data: hoje(), responsavel: i.responsavel || EQUIPE[0] }); });
    nav.recarregar();
  }));
  area.querySelectorAll('[data-grupo-na]').forEach(b => b.addEventListener('click', async () => {
    const lista = itensDa(e.id).filter(i => (i.grupo || 'Itens') === b.dataset.grupoNa);
    const todosNa = lista.every(i => i.status === 'na');
    await tentar(async () => { for (const i of lista) await atualizar('itens', i.id, { status: todosNa ? 'pendente' : 'na' }); });
    nav.recarregar();
  }));
  area.querySelectorAll('[data-compl-recebido]').forEach(b => b.addEventListener('click', async () => {
    const c = porId('complementares', b.dataset.complRecebido);
    await tentar(() => atualizar('complementares', c.id, { status: 'entregue', entregue_em: hoje() }));
    const esp = esperaComplementares(p.id);
    aviso(esp.pendentes.length ? `${c.disciplina} recebido. Faltam ${esp.pendentes.length}.` : 'Todos os complementares recebidos! Pode seguir com a compatibilização.');
    nav.recarregar();
  }));
  area.querySelector('#novo-grupo').addEventListener('click', () => formModal({
    titulo: 'Novo grupo de itens', campos: [{ nome: 'grupo', rotulo: 'Nome do grupo', obrigatorio: true }, { nome: 'itens', rotulo: 'Itens (um por linha)', tipo: 'textarea', linhas: 6 }],
    onSalvar: async d => {
      const linhas = d.itens.split('\n').map(s => s.trim()).filter(Boolean);
      const base = itensDa(e.id).reduce((m, i) => Math.max(m, i.ordem || 0), 0);
      await inserir('itens', (linhas.length ? linhas : ['Novo item']).map((t, k) => ({ etapa_id: e.id, projeto_id: p.id, grupo: d.grupo, texto: t, ordem: base + (k + 1) * 10, status: 'pendente' })));
      nav.recarregar();
    },
  }));
  area.querySelectorAll('[data-data-etapa]').forEach(inp => inp.addEventListener('change', async () => {
    await tentar(() => atualizar('etapas', e.id, { [inp.dataset.dataEtapa]: inp.value || null }), 'Data atualizada');
    nav.recarregar();
  }));

  area.querySelectorAll('[data-acao-etapa]').forEach(b => b.addEventListener('click', async () => {
    const acao = b.dataset.acaoEtapa;
    const etapas = etapasDo(p.id); const idx = etapas.findIndex(x => x.id === e.id);
    if (acao === 'editar') return formEtapa(e, p);
    if (acao === 'pendencia') return formPendencia(null, { projeto_id: p.id, etapa_id: e.id });
    if (acao === 'excluir') {
      if (!await confirmar(`Excluir a etapa "${e.nome}" e todos os seus itens?`, { ok: 'Excluir', perigo: true })) return;
      await tentar(() => remover('etapas', e.id), 'Etapa excluída'); estado.etapa = null; return nav.recarregar();
    }
    if (acao === 'subir' || acao === 'descer') {
      const outro = etapas[acao === 'subir' ? idx - 1 : idx + 1]; if (!outro) return;
      await tentar(async () => { const o = e.ordem; await atualizar('etapas', e.id, { ordem: outro.ordem }); await atualizar('etapas', outro.id, { ordem: o }); });
      return nav.recarregar();
    }
    if (acao === 'na') {
      await tentar(() => atualizar('etapas', e.id, { status: e.status === 'na' ? 'pendente' : 'na' })); return nav.recarregar();
    }
    if (acao === 'reabrir') { await tentar(() => reabrirEtapa(e), 'Etapa reaberta'); return nav.recarregar(); }
    if (acao === 'concluir') {
      const pend = itensDa(e.id).filter(i => i.status === 'pendente' || i.status === 'andamento').length;
      if (pend && !await confirmar(`Ainda há ${pend} ${pend === 1 ? 'item pendente' : 'itens pendentes'} nesta etapa. Concluir mesmo assim?`, { ok: 'Concluir etapa' })) return;
      const liberados = await tentar(() => concluirEtapa(e));
      if (!liberados) return;
      const prox = faseAtual(p.id);
      if (prox) estado.etapa = prox.id;
      nav.recarregar();
      if (liberados.length) {
        aviso(`Pagamento liberado para cobrança: ${liberados.map(r => `${r.descricao} (${moeda(r.valor)})`).join(', ')}`, 'dinheiro');
      } else aviso(prox ? `Etapa concluída. Próxima: ${prox.nome}` : 'Todas as etapas concluídas! Projeto finalizado.');
    }
  }));
}

function formItem(i) {
  const m = formModal({
    titulo: 'Item do checklist',
    campos: [
      { nome: 'texto', rotulo: 'Descrição', obrigatorio: true },
      { nome: 'status', rotulo: 'Situação', tipo: 'select', vazio: false, opcoes: Object.entries(ST_ITEM), largura: 'meia' },
      { nome: 'responsavel', rotulo: 'Responsável', tipo: 'select', opcoes: opcoesEquipe(), largura: 'meia' },
      { nome: 'data', rotulo: 'Data', tipo: 'date', largura: 'meia' },
      { nome: 'grupo', rotulo: 'Grupo', largura: 'meia' },
      { nome: 'obs', rotulo: 'Observações', tipo: 'textarea' },
    ],
    valores: i,
    extraRodape: `<button class="btn btn-leve" type="button" data-excluir>${icone('lixo', 16)} Excluir item</button>`,
    onSalvar: async d => { await atualizar('itens', i.id, d); nav.recarregar(); },
  });
  m.el.querySelector('[data-excluir]').addEventListener('click', async () => {
    await tentar(() => remover('itens', i.id), 'Item excluído'); m.fechar(); nav.recarregar();
  });
}

function formEtapa(e, p) {
  const etapas = etapasDo(p.id);
  const campos = [
    { nome: 'nome', rotulo: 'Nome da etapa', obrigatorio: true, placeholder: 'Ex.: Aprovação no condomínio' },
    ...(!e ? [{ nome: 'depois', rotulo: 'Posição', tipo: 'select', vazio: 'No início', opcoes: etapas.map(x => [x.id, `Depois de: ${x.nome}`]), padrao: etapas[etapas.length - 1]?.id }] : []),
    { nome: 'data_inicio', rotulo: 'Início', tipo: 'date', largura: 'meia' },
    { nome: 'prazo', rotulo: 'Prazo', tipo: 'date', largura: 'meia' },
    { nome: 'entrega', rotulo: 'Entrega da etapa', tipo: 'textarea', linhas: 2 },
    ...(!e ? [{ nome: 'itens', rotulo: 'Itens do checklist (um por linha)', tipo: 'textarea', linhas: 5 }] : []),
  ];
  formModal({
    titulo: e ? 'Editar etapa' : 'Acrescentar etapa', campos, valores: e || {},
    onSalvar: async d => {
      if (e) { await atualizar('etapas', e.id, { nome: d.nome, data_inicio: d.data_inicio, prazo: d.prazo, entrega: d.entrega }); nav.recarregar(); return; }
      const ref = etapas.find(x => x.id === d.depois);
      const prox = ref ? etapas.find(x => x.ordem > ref.ordem) : etapas[0];
      const ordem = ref ? (prox ? (ref.ordem + prox.ordem) / 2 : ref.ordem + 10) : (prox ? prox.ordem - 10 : 10);
      const [nova] = await inserir('etapas', { projeto_id: p.id, ordem, nome: d.nome, data_inicio: d.data_inicio, prazo: d.prazo, entrega: d.entrega, status: 'pendente' });
      // renumera para manter números inteiros
      const ord = etapasDo(p.id);
      for (let k = 0; k < ord.length; k++) if (ord[k].ordem !== (k + 1) * 10) await atualizar('etapas', ord[k].id, { ordem: (k + 1) * 10 });
      const linhas = (d.itens || '').split('\n').map(s => s.trim()).filter(Boolean);
      if (linhas.length) await inserir('itens', linhas.map((t, k) => ({ etapa_id: nova.id, projeto_id: p.id, grupo: d.nome, texto: t, ordem: (k + 1) * 10, status: 'pendente' })));
      estado.etapa = nova.id; aviso('Etapa acrescentada'); nav.recarregar();
    },
  });
}

// =====================================================================
//  ABA FINANCEIRO
// =====================================================================
function abaFinanceiro(area, p) {
  const recs = recebimentosDo(p.id);
  const recebido = recs.filter(r => r.status === 'pago').reduce((s, r) => s + Number(r.valor || 0), 0);
  const previsto = recs.reduce((s, r) => s + Number(r.valor || 0), 0);
  const custoParceiros = store.complementares.filter(c => c.projeto_id === p.id).reduce((s, c) => s + Number(c.valor || 0), 0);
  area.innerHTML = `
    <div class="resumo-fin">
      <div><div class="rot">Valor do contrato</div><div class="val">${moeda(p.valor_contrato)}</div>${Math.abs(previsto - (p.valor_contrato || 0)) > 0.01 ? `<div class="fraco">parcelas somam ${moeda(previsto)}</div>` : ''}</div>
      <div><div class="rot">Recebido</div><div class="val">${moeda(recebido)}</div></div>
      <div><div class="rot">A receber</div><div class="val">${moeda(previsto - recebido)}</div>${custoParceiros ? `<div class="fraco">custo com parceiros: ${moeda(custoParceiros)}</div>` : ''}</div>
    </div>
    <div class="cartao">
      <div class="cartao-cab"><h2>Pagamentos programados</h2><button class="btn btn-peq btn-primario" id="add-rec">${icone('mais', 14)} Pagamento</button></div>
      ${recs.length ? `<div class="tabela-envolve"><table class="tabela"><thead><tr><th>Descrição</th><th>Condição</th><th>Situação</th><th class="num">Valor</th><th></th></tr></thead><tbody>
      ${recs.map(r => {
        const et = porId('etapas', r.etapa_id);
        return `<tr><td>${h(r.descricao)}${r.obs ? `<div class="fraco">${h(r.obs)}</div>` : ''}</td>
          <td class="fraco">${r.gatilho === 'etapa' ? `Entrega da fase: ${h(et?.nome || '—')}` : `Data certa: ${data(r.vencimento)}`}</td>
          <td>${tagRecebimento(r)}${r.status === 'pago' ? `<div class="fraco">${data(r.pago_em)}${r.forma ? ' · ' + h(r.forma) : ''}</div>` : ''}</td>
          <td class="num">${moeda(r.valor)}</td>
          <td class="num">${r.status !== 'pago' ? `<button class="btn btn-peq" data-receber="${r.id}">${icone('check', 14)} Recebido</button>` : ''}
            <button class="btn-icone" data-editar-rec="${r.id}" title="Editar">${icone('editar', 15)}</button></td></tr>`;
      }).join('')}</tbody></table></div>` : '<div class="vazio">Nenhum pagamento programado.</div>'}
    </div>`;
  area.querySelector('#add-rec').addEventListener('click', () => formRecebimento(null, p.id));
  area.querySelectorAll('[data-editar-rec]').forEach(b => b.addEventListener('click', () => formRecebimento(porId('recebimentos', b.dataset.editarRec), p.id)));
  area.querySelectorAll('[data-receber]').forEach(b => b.addEventListener('click', async () => {
    await tentar(() => marcarRecebido(porId('recebimentos', b.dataset.receber))); nav.recarregar();
  }));
}

// =====================================================================
//  ABA COMPLEMENTARES
// =====================================================================
function abaComplementares(area, p) {
  const lista = store.complementares.filter(c => c.projeto_id === p.id);
  area.innerHTML = `<div class="cartao">
    <div class="cartao-cab"><h2>Projetos complementares com engenheiros parceiros</h2>
      <button class="btn btn-peq" id="ctr-compl">${icone('check', 14)} Complementares contratados</button>
      <button class="btn btn-peq btn-primario" id="add-compl">${icone('mais', 14)} Outro complementar</button></div>
    ${lista.length ? `<div class="cartao-corpo" style="padding-bottom:4px"><div class="legenda">
      <span>${lista.filter(c => c.status === 'entregue').length} de ${lista.length} entregues</span>
      <span>${lista.filter(c => !c.parceiro_id).length ? `<span class="tag tag-alerta">${lista.filter(c => !c.parceiro_id).length} sem parceiro definido</span>` : ''}</span>
      <span>clique em uma linha para escolher o parceiro, prazo, valor e anexar arquivos</span></div></div>` : ''}
    ${lista.length ? `<div class="tabela-envolve"><table class="tabela"><thead><tr><th>Disciplina</th><th>Parceiro</th><th>Situação</th><th>Prazo</th><th class="num">Valor</th><th>Pagamento</th><th></th></tr></thead>
      <tbody>${lista.map(c => linhaComplementar(c, { mostrarProjeto: false })).join('')}</tbody>
      <tfoot><tr><td colspan="4">Total cobrado pelos parceiros</td><td class="num">${moeda(lista.reduce((s, c) => s + Number(c.valor || 0), 0))}</td><td colspan="2"></td></tr></tfoot></table></div>`
      : `<div class="vazio">O cliente contratou projetos complementares?<br><button class="btn btn-primario" id="ctr-compl2" style="margin-top:10px">${icone('check', 14)} Marcar complementares contratados</button></div>`}
  </div>`;
  area.querySelector('#add-compl').addEventListener('click', () => formComplementar(null, { projeto_id: p.id }));
  area.querySelectorAll('#ctr-compl, #ctr-compl2').forEach(b => b.addEventListener('click', () => formComplementaresContratados(p.id)));
  ligarLinhasComplementares(area);
}

// =====================================================================
//  ABA TAREFAS
// =====================================================================
function abaTarefas(area, p) {
  const lista = store.tarefas.filter(t => t.projeto_id === p.id)
    .sort((a, b) => (a.status === 'feito') - (b.status === 'feito') || String(a.prazo || '9').localeCompare(String(b.prazo || '9')));
  area.innerHTML = `<div class="cartao">
    <div class="cartao-cab"><h2>Tarefas da equipe neste projeto</h2><button class="btn btn-peq btn-primario" id="add-tar">${icone('mais', 14)} Tarefa</button></div>
    ${lista.length ? `<div class="tabela-envolve"><table class="tabela"><tbody>${lista.map(t => `<tr class="clicavel" data-tar="${t.id}">
      <td style="width:36px"><button class="caixa-tarefa btn-icone" data-feito="${t.id}" title="Concluir">${t.status === 'feito' ? icone('check', 16) : '○'}</button></td>
      <td><span style="${t.status === 'feito' ? 'text-decoration:line-through;color:var(--texto-3)' : ''}">${h(t.titulo)}</span>${t.descricao ? `<div class="fraco">${h(t.descricao.slice(0, 120))}</div>` : ''}</td>
      <td>${avatar(t.responsavel)} ${h(t.responsavel || '')}</td>
      <td>${tagPrazo(t.prazo, t.status === 'feito')}</td>
      <td><span class="tag ${t.status === 'feito' ? 'tag-ok' : t.status === 'fazendo' ? 'tag-areia' : 'tag-neutro'}">${{ afazer: 'A fazer', fazendo: 'Fazendo', feito: 'Feito' }[t.status]}</span></td></tr>`).join('')}</tbody></table></div>`
      : '<div class="vazio">Nenhuma tarefa para este projeto.</div>'}
  </div>`;
  area.querySelector('#add-tar').addEventListener('click', () => formTarefa(null, { projeto_id: p.id }));
  area.querySelectorAll('[data-tar]').forEach(tr => tr.addEventListener('click', ev => {
    if (ev.target.closest('[data-feito]')) return;
    formTarefa(porId('tarefas', tr.dataset.tar));
  }));
  area.querySelectorAll('[data-feito]').forEach(b => b.addEventListener('click', async () => {
    const t = porId('tarefas', b.dataset.feito);
    await tentar(() => atualizar('tarefas', t.id, { status: t.status === 'feito' ? 'afazer' : 'feito' })); nav.recarregar();
  }));
}

// =====================================================================
//  ABA ARQUIVOS
// =====================================================================
function abaArquivos(area, p) {
  area.innerHTML = `<div class="cartao cartao-corpo">${blocoAnexos('projeto', p.id, {
    titulo: 'este projeto',
    categorias: ['Arquivo', 'Contrato', 'Briefing', 'Levantamento / fotos', 'Documentos do cliente', 'Pranchas / PDF', 'Imagens 3D', 'Aprovações', 'Entrega final', 'RRT'],
  })}</div>`;
  ligarBlocoAnexos(area);
}

// =====================================================================
//  ABA DADOS
// =====================================================================
function abaDados(area, p) {
  const linhas = [
    ['Código', p.codigo], ['Cliente', nomeCliente(p.cliente_id)], ['Categoria', CATEGORIAS[p.categoria]], ['Tipo', descricaoTipo(p)],
    ['Endereço da obra', p.endereco_obra], ['Área', p.area_m2 ? `${p.area_m2} m²` : ''], ['Valor do contrato', moeda(p.valor_contrato)],
    ['Assinatura do contrato', data(p.data_assinatura)], ['Início', data(p.data_inicio)], ['Entrega prevista', data(p.data_prevista)],
    ['Situação', STATUS_PROJ[p.status]], ['Observações', p.observacoes],
  ];
  area.innerHTML = `<div class="cartao">
    <div class="cartao-cab"><h2>Dados do projeto</h2>
      <button class="btn btn-peq" id="ed-proj">${icone('editar', 14)} Editar</button>
      <button class="btn btn-peq btn-leve" id="rm-proj">${icone('lixo', 14)} Excluir projeto</button></div>
    <div class="tabela-envolve"><table class="tabela"><tbody>${linhas.map(([k, v]) => `<tr><td class="fraco" style="width:220px">${k}</td><td>${h(v || '—')}</td></tr>`).join('')}</tbody></table></div>
    </div>
  ${familiaDe(porId('clientes', p.cliente_id)).length ? `<div class="cartao" style="margin-top:18px"><div class="cartao-cab"><h2>Família / moradores (para o briefing)</h2></div>
    <div class="tabela-envolve"><table class="tabela"><thead><tr><th>Nome</th><th>Parentesco</th><th>Idade</th><th>Profissão</th><th>Observações</th></tr></thead><tbody>
    ${familiaDe(porId('clientes', p.cliente_id)).map(f => `<tr><td>${h(f.nome)}</td><td>${h(f.parentesco || '')}</td><td>${idadeAtual(f) ?? ''}</td><td>${h(f.profissao || '')}</td><td class="fraco">${h(f.obs || '')}</td></tr>`).join('')}
    </tbody></table></div></div>` : ''}`;
  area.querySelector('#ed-proj').addEventListener('click', () => formModal({
    titulo: 'Editar projeto', valores: p,
    campos: [
      { nome: 'nome', rotulo: 'Nome do projeto', obrigatorio: true },
      { nome: 'cliente_id', rotulo: 'Cliente', tipo: 'select', opcoes: opcoesClientes(), largura: 'meia' },
      { nome: 'status', rotulo: 'Situação', tipo: 'select', vazio: false, opcoes: Object.entries(STATUS_PROJ), largura: 'meia' },
      { nome: 'endereco_obra', rotulo: 'Endereço da obra', largura: 'meia' },
      { nome: 'area_m2', rotulo: 'Área (m²)', tipo: 'number', largura: 'meia' },
      { nome: 'valor_contrato', rotulo: 'Valor do contrato', tipo: 'moeda', largura: 'meia' },
      { nome: 'data_assinatura', rotulo: 'Assinatura do contrato', tipo: 'date', largura: 'meia' },
      { nome: 'data_inicio', rotulo: 'Início', tipo: 'date', largura: 'meia' },
      { nome: 'data_prevista', rotulo: 'Entrega prevista', tipo: 'date', largura: 'meia' },
      { nome: 'observacoes', rotulo: 'Observações', tipo: 'textarea' },
    ],
    onSalvar: async d => { await atualizar('projetos', p.id, d); aviso('Projeto atualizado'); nav.recarregar(); },
  }));
  area.querySelector('#rm-proj').addEventListener('click', async () => {
    if (!await confirmar(`Excluir o projeto "${p.nome}" com todas as etapas, checklist e pagamentos? Esta ação não pode ser desfeita.`, { ok: 'Excluir projeto', perigo: true })) return;
    await tentar(() => remover('projetos', p.id), 'Projeto excluído');
    nav.ir('projetos');
  });
}
