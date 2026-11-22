// =====================================================================
//  PROGRAMAÇÃO SEMANAL — uma semana por pessoa (Aline, Julia)
//  Colunas: "A programar" + segunda a sábado. Cartões = tarefas,
//  reuniões e "trabalhar no projeto". Arraste entre os dias.
// =====================================================================
import { store, porId, atualizar } from '../dados.js?v=202611221728';
import { h, icone, hoje, somarDias, tentar, diasAte } from '../util.js?v=202611221728';
import { nav } from '../nav.js?v=202611221728';
import { EQUIPE } from '../config.js?v=202611221728';
import { formTarefa, tagPrazo, rotuloProjeto } from '../componentes.js?v=202611221728';

const DIAS = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
let pessoa = null;
let semana = null; // data (segunda-feira) da semana mostrada

try { pessoa = localStorage.getItem('ab_prog_pessoa'); } catch { /* ignora */ }

function segundaDe(iso) {
  const d = new Date(iso + 'T12:00:00');
  const dia = (d.getDay() + 6) % 7; // 0 = segunda
  return somarDias(iso, -dia);
}
/** Semana "atual": no domingo já mostra a semana que começa no dia seguinte. */
function semanaAtual() {
  const d = new Date(hoje() + 'T12:00:00');
  return d.getDay() === 0 ? somarDias(hoje(), 1) : segundaDe(hoje());
}
const curta = (iso) => { const [, m, d] = iso.split('-'); return `${Number(d)} ${MESES[Number(m) - 1]}`; };

function cartao(t) {
  const p = porId('projetos', t.projeto_id);
  const feito = t.status === 'feito';
  const tipo = t.tipo || 'tarefa';
  const atrasado = !feito && t.prazo && diasAte(t.prazo) < 0;
  return `<div class="cartao-prog tipo-${tipo} ${feito ? 'feito' : ''}" draggable="true" data-prog="${t.id}">
    <button class="caixa-prog" data-feito="${t.id}" title="${feito ? 'Desmarcar' : 'Marcar como feito'}">${feito ? icone('check', 13) : ''}</button>
    <div class="corpo-prog">
      ${tipo === 'reuniao' ? `<div class="hora-prog">${icone('clientes', 12)} ${h(t.hora || 'Reunião')}</div>` : ''}
      ${tipo === 'projeto' ? `<div class="hora-prog proj">${icone('projetos', 12)} Projeto</div>` : ''}
      <div class="tit-prog">${h(t.titulo)}</div>
      ${p && tipo !== 'projeto' ? `<div class="sub-prog">${h(rotuloProjeto(p))}</div>` : p ? `<div class="sub-prog">${h(porId('clientes', p.cliente_id)?.nome || '')}</div>` : ''}
      ${t.prazo && !feito ? `<div class="meta-prog">${atrasado ? '<span class="tag tag-atrasado">prazo vencido</span>' : tagPrazo(t.prazo)}</div>` : ''}
    </div>
  </div>`;
}

function ordenar(a, b) {
  const ha = a.tipo === 'reuniao' ? (a.hora || '99') : '98', hb = b.tipo === 'reuniao' ? (b.hora || '99') : '98';
  return (a.status === 'feito') - (b.status === 'feito') || ha.localeCompare(hb)
    || ({ alta: 0, media: 1, baixa: 2 }[a.prioridade] ?? 1) - ({ alta: 0, media: 1, baixa: 2 }[b.prioridade] ?? 1);
}

export function render(el) {
  if (!pessoa || !EQUIPE.includes(pessoa)) pessoa = EQUIPE[0];
  if (!semana) semana = semanaAtual();
  const dias = DIAS.map((nome, i) => ({ nome, iso: somarDias(semana, i) }));
  const fim = somarDias(semana, 6);
  const minhas = store.tarefas.filter(t => t.responsavel === pessoa);
  const semDia = minhas.filter(t => !t.dia && t.status !== 'feito').sort(ordenar);
  // itens de dias anteriores que ficaram por fazer aparecem em "A programar"
  const estaSemana = semanaAtual();
  const atrasadosDia = semana === estaSemana ? minhas.filter(t => t.dia && t.dia < estaSemana && t.status !== 'feito') : [];
  const naSemana = (iso) => minhas.filter(t => t.dia === iso).sort(ordenar);
  const domingo = minhas.filter(t => t.dia === fim);
  const total = dias.reduce((s, d) => s + naSemana(d.iso).length, 0) + domingo.length;
  const feitos = dias.reduce((s, d) => s + naSemana(d.iso).filter(t => t.status === 'feito').length, 0);
  const reunioes = dias.reduce((s, d) => s + naSemana(d.iso).filter(t => t.tipo === 'reuniao').length, 0);

  el.innerHTML = `
    <div class="cab"><div class="titulos"><h1>Programação semanal</h1>
      <div class="sub">${total ? `${feitos} de ${total} feitos · ${reunioes} reuniõe${reunioes === 1 ? '' : 's'}` : 'Nada programado nesta semana ainda'}</div></div>
      <div class="acoes">
        <div class="grupo-botoes">${EQUIPE.map(n => `<button data-pessoa="${h(n)}" class="${pessoa === n ? 'ativo' : ''}">${h(n)}</button>`).join('')}</div>
        <button class="btn btn-primario" data-novo="">${icone('mais', 16)} Programar</button>
      </div></div>
    <div class="nav-mes" style="margin-bottom:12px">
      <button class="btn-icone" data-sem="-7" title="Semana anterior">${icone('voltar', 18)}</button>
      <h2 style="text-transform:none;min-width:240px">Programação ${h(pessoa)} · ${curta(semana)} a ${curta(somarDias(semana, 5))}</h2>
      <button class="btn-icone" data-sem="7" title="Próxima semana">${icone('seta', 18)}</button>
      ${semana !== semanaAtual() ? '<button class="btn btn-peq btn-leve" data-sem="hoje">Esta semana</button>' : ''}
    </div>
    <div class="quadro quadro-semana">
      <div class="coluna col-programar" data-dia="">
        <div class="coluna-cab"><strong>A programar</strong><span class="n">${semDia.length + atrasadosDia.length}</span></div>
        ${atrasadosDia.length ? `<div class="aviso-col">${atrasadosDia.length} ficou(aram) de dias anteriores</div>${atrasadosDia.sort(ordenar).map(cartao).join('')}` : ''}
        ${semDia.map(cartao).join('') || (atrasadosDia.length ? '' : '<div class="vazio" style="padding:10px 4px;font-size:.82rem">Tudo programado</div>')}
        <button class="btn btn-leve add-col" data-novo="">${icone('mais', 14)} Adicionar</button>
      </div>
      ${dias.map(d => {
        const itens = naSemana(d.iso);
        const ehHoje = d.iso === hoje();
        return `<div class="coluna ${ehHoje ? 'col-hoje' : ''} ${d.iso < hoje() ? 'col-passado' : ''}" data-dia="${d.iso}">
          <div class="coluna-cab"><strong>${d.nome}</strong><span class="data-col">${curta(d.iso)}${ehHoje ? ' · hoje' : ''}</span><span class="n">${itens.length}</span></div>
          ${itens.map(cartao).join('')}
          <button class="btn btn-leve add-col" data-novo="${d.iso}">${icone('mais', 14)} Adicionar</button>
        </div>`;
      }).join('')}
    </div>
    ${domingo.length ? `<p class="fraco" style="margin-top:8px">Domingo: ${domingo.map(t => h(t.titulo)).join(', ')}</p>` : ''}`;

  el.querySelectorAll('[data-pessoa]').forEach(b => b.addEventListener('click', () => {
    pessoa = b.dataset.pessoa; try { localStorage.setItem('ab_prog_pessoa', pessoa); } catch { /* ignora */ }
    render(el);
  }));
  el.querySelectorAll('[data-sem]').forEach(b => b.addEventListener('click', () => {
    semana = b.dataset.sem === 'hoje' ? semanaAtual() : somarDias(semana, Number(b.dataset.sem)); render(el);
  }));
  el.querySelectorAll('[data-novo]').forEach(b => b.addEventListener('click', () => formTarefa(null, { responsavel: pessoa, dia: b.dataset.novo || null, tipo: 'projeto' })));
  el.querySelectorAll('[data-prog]').forEach(c => {
    c.addEventListener('click', e => { if (e.target.closest('[data-feito]')) return; formTarefa(porId('tarefas', c.dataset.prog)); });
    c.addEventListener('dragstart', e => { e.dataTransfer.setData('text/plain', c.dataset.prog); c.classList.add('arrastando'); });
    c.addEventListener('dragend', () => c.classList.remove('arrastando'));
  });
  el.querySelectorAll('[data-feito]').forEach(b => b.addEventListener('click', async () => {
    const t = porId('tarefas', b.dataset.feito);
    await tentar(() => atualizar('tarefas', t.id, { status: t.status === 'feito' ? 'afazer' : 'feito' })); nav.recarregar();
  }));
  el.querySelectorAll('.quadro-semana [data-dia]').forEach(col => {
    col.addEventListener('dragover', e => { e.preventDefault(); col.classList.add('soltar'); });
    col.addEventListener('dragleave', e => { if (!col.contains(e.relatedTarget)) col.classList.remove('soltar'); });
    col.addEventListener('drop', async e => {
      e.preventDefault(); col.classList.remove('soltar');
      const t = porId('tarefas', e.dataTransfer.getData('text/plain'));
      const dia = col.dataset.dia || null;
      if (!t || (t.dia || null) === dia) return;
      await tentar(() => atualizar('tarefas', t.id, { dia }));
      nav.recarregar();
    });
  });
}
