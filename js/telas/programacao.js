// =====================================================================
//  PROGRAMAÇÃO SEMANAL — uma semana por pessoa (Aline, Julia)
//  Coluna "Projetos" = projetos em andamento (paleta): arraste um
//  projeto para o dia em que vai trabalhar nele. O mesmo projeto pode
//  ir para vários dias. Reuniões podem ser marcadas em cada dia.
//  Cada dia programado é um registro em "tarefas" com tipo 'projeto'.
// =====================================================================
import { store, porId, atualizar, inserir, remover } from '../dados.js?v=202611241910';
import { h, icone, hoje, somarDias, tentar, abrirModal, aviso } from '../util.js?v=202611241910';
import { nav } from '../nav.js?v=202611241910';
import { EQUIPE } from '../config.js?v=202611241910';
import { formTarefa } from '../componentes.js?v=202611241910';
import { faseAtual, saudeProjeto, nomeCliente, pendenciasAbertas, aguardandoParceiros } from '../negocio.js?v=202611241910';

const DIAS = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
let pessoa = null;
let semana = null; // segunda-feira da semana mostrada
let busca = '';
let mostrarAguardando = false;
let arrastandoId = null;

try { pessoa = localStorage.getItem('ab_prog_pessoa'); } catch { /* ignora */ }

function segundaDe(iso) {
  const d = new Date(iso + 'T12:00:00');
  return somarDias(iso, -((d.getDay() + 6) % 7));
}
/** Semana "atual": no domingo já mostra a semana que começa no dia seguinte. */
function semanaAtual() {
  return new Date(hoje() + 'T12:00:00').getDay() === 0 ? somarDias(hoje(), 1) : segundaDe(hoje());
}
const curta = (iso) => { const [, m, d] = iso.split('-'); return `${Number(d)} ${MESES[Number(m) - 1]}`; };
/** Primeiro e segundo nome do cliente (palavras de ligação entram junto: "Mariana e Rafael"). */
const LIGACAO = ['e', 'de', 'da', 'do', 'das', 'dos', 'di', 'du', '&'];
function nomeCurto(nome) {
  const partes = String(nome || '').trim().split(/\s+/);
  const out = []; let nomes = 0;
  for (const w of partes) {
    out.push(w);
    if (!LIGACAO.includes(w.toLowerCase())) nomes++;
    if (nomes === 2) break;
  }
  return out.join(' ');
}
const tituloProjeto = (p) => { const f = faseAtual(p.id); return `${p.nome}${f ? ' · ' + f.nome : ''}`; };

// ---------------------------------------------------------------- cartões
function cartaoPaleta(p, vezes) {
  const f = faseAtual(p.id);
  return `<div class="cartao-prog paleta saude-${saudeProjeto(p).cor}" draggable="true" data-paleta="${p.id}" title="Arraste para um dia (ou clique para escolher os dias)">
    <div class="corpo-prog">
      <div class="tit-prog" title="${h(nomeCliente(p.cliente_id))}">${h(nomeCurto(nomeCliente(p.cliente_id)))}</div>
      <div class="sub-prog">${h(p.nome)}</div>
      ${f ? `<div class="sub-prog fase-prog">${icone('seta', 11)} ${h(f.nome)}</div>` : ''}
      ${vezes ? `<div class="vezes-prog">${vezes}× nesta semana</div>` : ''}
    </div>
  </div>`;
}

const setas = (t) => `<div class="setas-prog"><button class="btn-icone" data-mover="${t.id}" data-dir="-1" title="Subir">${icone('cima', 13)}</button><button class="btn-icone" data-mover="${t.id}" data-dir="1" title="Descer">${icone('baixo', 13)}</button></div>`;

function cartaoDia(t) {
  const feito = t.status === 'feito';
  if (t.tipo === 'reuniao' || t.tipo === 'visita') {
    const p = porId('projetos', t.projeto_id);
    const visita = t.tipo === 'visita';
    const horario = [t.hora, t.hora_fim].filter(Boolean).join('–');
    return `<div class="cartao-prog tipo-${t.tipo} ${feito ? 'feito' : ''}" draggable="true" data-item="${t.id}">
      <button class="caixa-prog" data-feito="${t.id}" title="${feito ? 'Desmarcar' : 'Feita'}">${feito ? icone('check', 13) : ''}</button>
      <div class="corpo-prog" data-editar="${t.id}">
        <div class="hora-prog" title="${visita ? 'Visita fora do escritório' : 'Reunião'}">${icone(visita ? 'local' : 'clientes', 12)} ${h(horario || (visita ? 'Visita' : 'Reunião'))}</div>
        <div class="tit-prog">${h(t.titulo)}</div>
        ${p ? `<div class="sub-prog">${h(nomeCurto(nomeCliente(p.cliente_id)))} — ${h(p.nome)}</div>` : ''}
        ${t.local ? `<div class="sub-prog local-prog">${icone('local', 11)} ${h(t.local)}</div>` : ''}
      </div>
      ${setas(t)}
    </div>`;
  }
  const p = porId('projetos', t.projeto_id);
  if (!p) return '';
  const f = faseAtual(p.id);
  return `<div class="cartao-prog tipo-projeto saude-${saudeProjeto(p).cor} ${feito ? 'feito' : ''}" draggable="true" data-item="${t.id}">
    <button class="caixa-prog" data-feito="${t.id}" title="${feito ? 'Desmarcar' : 'Trabalhei neste projeto'}">${feito ? icone('check', 13) : ''}</button>
    <div class="corpo-prog" data-abrir="${p.id}" title="Abrir o projeto">
      <div class="tit-prog" title="${h(nomeCliente(p.cliente_id))}">${h(nomeCurto(nomeCliente(p.cliente_id)))}</div>
      <div class="sub-prog">${h(p.nome)}</div>
      ${f ? `<div class="sub-prog fase-prog">${icone('seta', 11)} ${h(f.nome)}</div>` : ''}
    </div>
    <button class="btn-icone tirar-prog" data-tirar="${t.id}" title="Tirar deste dia">${icone('x', 13)}</button>
    ${setas(t)}
  </div>`;
}

/** Itens de um dia na ordem escolhida (campo ordem; empate: reuniões pela hora). */
function itensDoDia(lista, iso) {
  return lista.filter(t => t.dia === iso).sort((a, b) => (a.ordem ?? 0) - (b.ordem ?? 0)
    || (a.tipo === 'reuniao' ? 0 : 1) - (b.tipo === 'reuniao' ? 0 : 1) || String(a.hora || '').localeCompare(String(b.hora || '')));
}

/** Regrava a ordem do dia: ids na sequência desejada → ordem 10, 20, 30… */
async function salvarOrdem(ids) {
  for (let i = 0; i < ids.length; i++) {
    const t = porId('tarefas', ids[i]);
    if (t && t.ordem !== (i + 1) * 10) await atualizar('tarefas', t.id, { ordem: (i + 1) * 10 });
  }
}

/** Posição de inserção na coluna conforme a altura do mouse. */
function posicaoNaColuna(col, y, ignorarId) {
  const cards = [...col.querySelectorAll('[data-item]')].filter(c => c.dataset.item !== ignorarId);
  const i = cards.findIndex(c => { const r = c.getBoundingClientRect(); return y < r.top + r.height / 2; });
  return { indice: i === -1 ? cards.length : i, antes: i === -1 ? null : cards[i] };
}

const ehPlanejamento = (t) => t.tipo === 'projeto' || t.tipo === 'reuniao' || t.tipo === 'visita';

// ---------------------------------------------------------------- tela
export function render(el) {
  if (!pessoa || !EQUIPE.includes(pessoa)) pessoa = EQUIPE[0];
  if (!semana) semana = semanaAtual();
  const dias = DIAS.map((nome, i) => ({ nome, iso: somarDias(semana, i) }));
  const minhas = store.tarefas.filter(t => t.responsavel === pessoa && ehPlanejamento(t) && t.dia);
  const doDia = (iso) => itensDoDia(minhas, iso);
  const daSemana = minhas.filter(t => t.dia >= semana && t.dia <= somarDias(semana, 5));
  const vezes = (pid) => daSemana.filter(t => t.tipo === 'projeto' && t.projeto_id === pid).length;
  const emAndamento = store.projetos.filter(p => ['ativo', 'pausado'].includes(p.status))
    .filter(p => !busca || `${p.nome} ${nomeCliente(p.cliente_id)}`.toLowerCase().includes(busca.toLowerCase()))
    .sort((a, b) => nomeCliente(a.cliente_id).localeCompare(nomeCliente(b.cliente_id), 'pt-BR'));
  // projetos parados (esperando o cliente ou os parceiros) não entram na lista para programar
  const parado = (p) => pendenciasAbertas(p.id).length > 0 || !!aguardandoParceiros(p.id);
  const aguardando = emAndamento.filter(parado);
  const ativos = emAndamento.filter(p => !parado(p));
  const nCli = aguardando.filter(p => pendenciasAbertas(p.id).length).length;
  const nParc = aguardando.filter(p => !pendenciasAbertas(p.id).length).length;
  const nProj = daSemana.filter(t => t.tipo === 'projeto').length;
  const nReu = daSemana.filter(t => t.tipo === 'reuniao').length;
  const nVis = daSemana.filter(t => t.tipo === 'visita').length;

  el.innerHTML = `
    <div class="cab"><div class="titulos"><h1>Programação semanal</h1>
      <div class="sub">${nProj || nReu || nVis ? `${nProj} período${nProj === 1 ? '' : 's'} de projeto · ${nReu} ${nReu === 1 ? 'reunião' : 'reuniões'} · ${nVis} visita${nVis === 1 ? '' : 's'} fora do escritório` : 'Arraste os projetos da coluna da esquerda para os dias da semana'}</div></div>
      <div class="acoes">
        <div class="grupo-botoes">${EQUIPE.map(n => `<button data-pessoa="${h(n)}" class="${pessoa === n ? 'ativo' : ''}">${h(n)}</button>`).join('')}</div>
      </div></div>
    <div class="nav-mes" style="margin-bottom:12px">
      <button class="btn-icone" data-sem="-7" title="Semana anterior">${icone('voltar', 18)}</button>
      <h2 style="text-transform:none;min-width:240px">Programação ${h(pessoa)} · ${curta(semana)} a ${curta(somarDias(semana, 5))}</h2>
      <button class="btn-icone" data-sem="7" title="Próxima semana">${icone('seta', 18)}</button>
      ${semana !== semanaAtual() ? '<button class="btn btn-peq btn-leve" data-sem="hoje">Esta semana</button>' : ''}
    </div>
    <div class="quadro quadro-semana">
      <div class="coluna col-programar" data-dia="">
        <div class="coluna-cab"><strong>Projetos</strong><span class="n">${ativos.length}</span></div>
        <input class="entrada busca-prog" id="busca-prog" placeholder="Buscar…" value="${h(busca)}">
        ${ativos.map(p => cartaoPaleta(p, vezes(p.id))).join('') || '<div class="vazio" style="padding:10px 4px;font-size:.82rem">Nenhum projeto para programar</div>'}
        ${aguardando.length ? `<button class="btn btn-leve aguard-prog" data-aguard>${icone('alerta', 13)} ${[nCli && `${nCli} aguardando cliente`, nParc && `${nParc} aguardando parceiro${nParc > 1 ? 's' : ''}`].filter(Boolean).join(' · ')} ${mostrarAguardando ? '· ocultar' : '· mostrar'}</button>
          ${mostrarAguardando ? `<div class="lista-aguard">${aguardando.map(p => cartaoPaleta(p, vezes(p.id))).join('')}</div>` : ''}` : ''}
      </div>
      ${dias.map(d => {
        const itens = doDia(d.iso);
        const ehHoje = d.iso === hoje();
        return `<div class="coluna ${ehHoje ? 'col-hoje' : ''} ${d.iso < hoje() ? 'col-passado' : ''}" data-dia="${d.iso}">
          <div class="coluna-cab"><strong>${d.nome}</strong><span class="data-col">${curta(d.iso)}${ehHoje ? ' · hoje' : ''}</span><span class="n">${itens.length}</span></div>
          ${itens.filter(t => t.tipo === 'visita').length ? `<div class="fora-dia" title="Visitas fora do escritório neste dia">${icone('local', 12)} fora ${itens.filter(t => t.tipo === 'visita').map(t => [t.hora, t.hora_fim].filter(Boolean).join('–') || 'dia').join(', ')}</div>` : ''}
          ${itens.map(cartaoDia).join('')}
          <div class="add-col add-duplo"><button class="btn btn-leve" data-reuniao="${d.iso}">${icone('mais', 13)} Reunião</button><button class="btn btn-leve" data-visita="${d.iso}">${icone('mais', 13)} Visita</button></div>
        </div>`;
      }).join('')}
    </div>`;

  // pessoa / semana / busca
  el.querySelectorAll('[data-pessoa]').forEach(b => b.addEventListener('click', () => {
    pessoa = b.dataset.pessoa; try { localStorage.setItem('ab_prog_pessoa', pessoa); } catch { /* ignora */ }
    render(el);
  }));
  el.querySelectorAll('[data-sem]').forEach(b => b.addEventListener('click', () => {
    semana = b.dataset.sem === 'hoje' ? semanaAtual() : somarDias(semana, Number(b.dataset.sem)); render(el);
  }));
  el.querySelector('[data-aguard]')?.addEventListener('click', () => { mostrarAguardando = !mostrarAguardando; render(el); });
  const bx = el.querySelector('#busca-prog');
  bx.addEventListener('input', () => { busca = bx.value; render(el); const n = el.querySelector('#busca-prog'); n.focus(); n.setSelectionRange(n.value.length, n.value.length); });

  // ações dos cartões
  el.querySelectorAll('[data-reuniao]').forEach(b => b.addEventListener('click', () =>
    formTarefa(null, { responsavel: pessoa, dia: b.dataset.reuniao, tipo: 'reuniao', titulo: '' })));
  el.querySelectorAll('[data-visita]').forEach(b => b.addEventListener('click', () =>
    formTarefa(null, { responsavel: pessoa, dia: b.dataset.visita, tipo: 'visita', titulo: '' })));
  el.querySelectorAll('[data-editar]').forEach(c => c.addEventListener('click', () => formTarefa(porId('tarefas', c.dataset.editar))));
  el.querySelectorAll('[data-abrir]').forEach(c => c.addEventListener('click', () => nav.ir('projeto/' + c.dataset.abrir)));
  el.querySelectorAll('[data-feito]').forEach(b => b.addEventListener('click', async e => {
    e.stopPropagation();
    const t = porId('tarefas', b.dataset.feito);
    await tentar(() => atualizar('tarefas', t.id, { status: t.status === 'feito' ? 'afazer' : 'feito' })); nav.recarregar();
  }));
  el.querySelectorAll('[data-tirar]').forEach(b => b.addEventListener('click', async e => {
    e.stopPropagation();
    await tentar(() => remover('tarefas', b.dataset.tirar)); nav.recarregar();
  }));
  el.querySelectorAll('[data-mover]').forEach(b => b.addEventListener('click', async e => {
    e.stopPropagation();
    const t = porId('tarefas', b.dataset.mover);
    const ids = itensDoDia(minhas, t.dia).map(x => x.id);
    const i = ids.indexOf(t.id), j = i + Number(b.dataset.dir);
    if (j < 0 || j >= ids.length) return;
    [ids[i], ids[j]] = [ids[j], ids[i]];
    await tentar(() => salvarOrdem(ids)); nav.recarregar();
  }));
  el.querySelectorAll('[data-paleta]').forEach(c => c.addEventListener('click', () => escolherDias(porId('projetos', c.dataset.paleta), dias)));

  // arrastar
  el.querySelectorAll('[data-paleta], [data-item]').forEach(c => {
    c.addEventListener('dragstart', e => {
      e.dataTransfer.setData('text/plain', c.dataset.paleta ? 'p:' + c.dataset.paleta : 'i:' + c.dataset.item);
      arrastandoId = c.dataset.item || null;
      c.classList.add('arrastando');
    });
    c.addEventListener('dragend', () => { c.classList.remove('arrastando'); arrastandoId = null; el.querySelectorAll('.marca-pos').forEach(x => x.remove()); });
  });
  el.querySelectorAll('.quadro-semana [data-dia]').forEach(col => {
    col.addEventListener('dragover', e => {
      e.preventDefault(); col.classList.add('soltar');
      if (!col.dataset.dia) return;
      const { antes } = posicaoNaColuna(col, e.clientY, arrastandoId);
      let linha = col.querySelector('.marca-pos');
      if (!linha) { linha = document.createElement('div'); linha.className = 'marca-pos'; }
      const ref = antes || col.querySelector('.add-col');
      if (linha.nextSibling !== ref) col.insertBefore(linha, ref);
    });
    col.addEventListener('dragleave', e => {
      if (!col.contains(e.relatedTarget)) { col.classList.remove('soltar'); col.querySelector('.marca-pos')?.remove(); }
    });
    col.addEventListener('drop', async e => {
      e.preventDefault(); col.classList.remove('soltar'); col.querySelector('.marca-pos')?.remove();
      const [tipo, id] = e.dataTransfer.getData('text/plain').split(':');
      const dia = col.dataset.dia || null;
      const { indice } = posicaoNaColuna(col, e.clientY, tipo === 'i' ? id : null);
      const idsDoDia = dia ? itensDoDia(store.tarefas.filter(t => t.responsavel === pessoa && ehPlanejamento(t)), dia).map(t => t.id).filter(x => x !== id) : [];
      await tentar(async () => {
        if (tipo === 'p') {               // projeto da lista → novo período no dia (pode repetir)
          if (!dia) return;
          const novo = await programar(porId('projetos', id), dia);
          if (novo) { idsDoDia.splice(indice, 0, novo.id); await salvarOrdem(idsDoDia); }
        } else {                          // cartão já programado: muda de dia e/ou de posição
          const t = porId('tarefas', id);
          if (!t) return;
          if (!dia) { if (t.tipo === 'projeto') await remover('tarefas', t.id); return; } // de volta à lista = tira do dia
          if (t.dia !== dia) await atualizar('tarefas', t.id, { dia });
          idsDoDia.splice(indice, 0, t.id); await salvarOrdem(idsDoDia);
        }
      });
      nav.recarregar();
    });
  });
}

async function programar(p, dia) {
  if (!p) return null;
  const doDia = store.tarefas.filter(t => t.responsavel === pessoa && t.dia === dia && ehPlanejamento(t));
  const fim = doDia.reduce((m, t) => Math.max(m, t.ordem ?? 0), 0) + 10;
  const [novo] = await inserir('tarefas', {
    tipo: 'projeto', projeto_id: p.id, responsavel: pessoa, dia, titulo: tituloProjeto(p),
    status: 'afazer', prioridade: 'media', ordem: fim,
  });
  return novo;
}

/** Clique no projeto (bom no celular): escolher um ou mais dias. */
function escolherDias(p, dias) {
  if (!p) return;
  const m = abrirModal({
    titulo: `Programar: ${nomeCurto(nomeCliente(p.cliente_id))} — ${p.nome}`, largura: 460,
    corpo: `<p class="fraco" style="margin-bottom:10px">Em quais dias ${h(pessoa)} vai trabalhar neste projeto?</p>
      <div class="chips">${dias.map(d => `<button type="button" class="chip" data-d="${d.iso}">${d.nome.slice(0, 3)} ${curta(d.iso)}</button>`).join('')}</div>`,
    rodape: `<span class="espaco"></span><button class="btn" data-fechar>Cancelar</button><button class="btn btn-primario" data-ok>Programar</button>`,
  });
  m.el.querySelectorAll('[data-d]').forEach(b => b.addEventListener('click', () => b.classList.toggle('sel')));
  m.el.querySelector('[data-ok]').addEventListener('click', async () => {
    const sel = [...m.el.querySelectorAll('[data-d].sel')].map(b => b.dataset.d);
    if (!sel.length) return aviso('Escolha pelo menos um dia', 'erro');
    await tentar(async () => { for (const d of sel) await programar(p, d); });
    m.fechar(); nav.recarregar();
  });
}
