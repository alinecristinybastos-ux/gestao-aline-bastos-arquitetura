// =====================================================================
//  TAREFAS DA EQUIPE — quadro (A fazer / Fazendo / Feito)
//  Arraste os cartões entre as colunas.
// =====================================================================
import { store, porId, atualizar } from '../dados.js?v=202611221728';
import { h, icone, tentar, diasAte } from '../util.js?v=202611221728';
import { nav } from '../nav.js?v=202611221728';
import { EQUIPE } from '../config.js?v=202611221728';
import { formTarefa, avatar, tagPrazo, rotuloProjeto } from '../componentes.js?v=202611221728';

const COLUNAS = [['afazer', 'A fazer'], ['fazendo', 'Fazendo'], ['feito', 'Feito']];
let pessoa = '';
let projetoFiltro = '';

function cartao(t) {
  const p = porId('projetos', t.projeto_id);
  return `<div class="cartao-tarefa ${t.status === 'feito' ? 'feita' : ''}" draggable="true" data-tarefa="${t.id}" style="display:flex;gap:10px">
    <span class="prio prio-${t.prioridade || 'media'}" title="Prioridade ${t.prioridade || 'média'}"></span>
    <div style="flex:1;min-width:0">
      <h4>${h(t.titulo)}</h4>
      ${p ? `<div class="fraco" style="font-size:.8rem">${icone('projetos', 12)} ${h(rotuloProjeto(p))}</div>` : ''}
      <div class="meta">${avatar(t.responsavel)}${t.prazo ? tagPrazo(t.prazo, t.status === 'feito') : ''}${t.descricao ? `<span title="Tem detalhes">${icone('lista', 13)}</span>` : ''}</div>
    </div></div>`;
}

export function render(el) {
  const lista = store.tarefas.filter(t => (!pessoa || t.responsavel === pessoa) && (!projetoFiltro || t.projeto_id === projetoFiltro));
  const atrasadas = lista.filter(t => t.status !== 'feito' && t.prazo && diasAte(t.prazo) < 0).length;
  const projetosComTarefa = [...new Set(store.tarefas.map(t => t.projeto_id).filter(Boolean))].map(id => porId('projetos', id)).filter(Boolean);

  el.innerHTML = `
    <div class="cab"><div class="titulos"><h1>Tarefas da equipe</h1>
      <div class="sub">${lista.filter(t => t.status !== 'feito').length} abertas${atrasadas ? ` · <span style="color:var(--perigo)">${atrasadas} atrasada${atrasadas === 1 ? '' : 's'}</span>` : ''} · arraste os cartões para mudar a situação</div></div>
      <div class="acoes"><button class="btn btn-primario" id="nova-tar">${icone('mais', 16)} Nova tarefa</button></div></div>
    <div class="filtros">
      <div class="grupo-botoes">${[['', 'Todas'], ...EQUIPE.map(n => [n, n])].map(([k, v]) => `<button data-pessoa="${h(k)}" class="${pessoa === k ? 'ativo' : ''}">${v}</button>`).join('')}</div>
      <select id="f-proj"><option value="">Todos os projetos</option>${projetosComTarefa.map(p => [p, rotuloProjeto(p)]).sort((a, b) => a[1].localeCompare(b[1], 'pt-BR')).map(([p, r]) => `<option value="${p.id}" ${projetoFiltro === p.id ? 'selected' : ''}>${h(r)}</option>`).join('')}</select>
    </div>
    <div class="quadro" style="grid-auto-columns:minmax(260px,1fr)">${COLUNAS.map(([st, nome]) => {
      const cards = lista.filter(t => t.status === st)
        .sort((a, b) => st === 'feito' ? String(b.prazo || '').localeCompare(String(a.prazo || ''))
          : ({ alta: 0, media: 1, baixa: 2 }[a.prioridade] ?? 1) - ({ alta: 0, media: 1, baixa: 2 }[b.prioridade] ?? 1) || String(a.prazo || '9').localeCompare(String(b.prazo || '9')));
      const mostrar = st === 'feito' ? cards.slice(0, 15) : cards;
      return `<div class="coluna" data-coluna="${st}">
        <div class="coluna-cab"><strong>${nome}</strong><span class="n">${cards.length}</span></div>
        ${mostrar.map(cartao).join('')}
        ${st === 'feito' && cards.length > 15 ? `<div class="fraco" style="text-align:center;font-size:.8rem">+ ${cards.length - 15} concluídas</div>` : ''}
        ${st === 'afazer' ? `<button class="btn btn-leve" style="width:100%;justify-content:flex-start" data-add-col>${icone('mais', 14)} Adicionar</button>` : ''}
      </div>`;
    }).join('')}</div>`;

  el.querySelector('#nova-tar').addEventListener('click', () => formTarefa(null, pessoa ? { responsavel: pessoa } : {}));
  el.querySelector('[data-add-col]')?.addEventListener('click', () => formTarefa(null, pessoa ? { responsavel: pessoa } : {}));
  el.querySelectorAll('[data-pessoa]').forEach(b => b.addEventListener('click', () => { pessoa = b.dataset.pessoa; render(el); }));
  el.querySelector('#f-proj').addEventListener('change', e => { projetoFiltro = e.target.value; render(el); });
  el.querySelectorAll('[data-tarefa]').forEach(c => {
    c.addEventListener('click', () => formTarefa(porId('tarefas', c.dataset.tarefa)));
    c.addEventListener('dragstart', e => { e.dataTransfer.setData('text/plain', c.dataset.tarefa); c.classList.add('arrastando'); });
    c.addEventListener('dragend', () => c.classList.remove('arrastando'));
  });
  el.querySelectorAll('[data-coluna]').forEach(col => {
    col.addEventListener('dragover', e => { e.preventDefault(); col.classList.add('soltar'); });
    col.addEventListener('dragleave', e => { if (!col.contains(e.relatedTarget)) col.classList.remove('soltar'); });
    col.addEventListener('drop', async e => {
      e.preventDefault(); col.classList.remove('soltar');
      const id = e.dataTransfer.getData('text/plain');
      const t = porId('tarefas', id);
      if (!t || t.status === col.dataset.coluna) return;
      await tentar(() => atualizar('tarefas', id, { status: col.dataset.coluna }));
      nav.recarregar();
    });
  });
}
