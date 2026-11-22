// =====================================================================
//  PROJETOS — quadro por fase (estilo Trello), lista e novo projeto
// =====================================================================
import { store, atualizar } from '../dados.js?v=202611221439';
import { h, icone, moeda, data, hoje, somarDias, abrirModal, aviso, campoHTML } from '../util.js?v=202611221439';
import { nav } from '../nav.js?v=202611221439';
import { CATEGORIAS, TIPOS, INTERVENCOES, TIPOS_COM_INTERVENCAO, FASES, montarModelo, PAGAMENTOS_PADRAO, infoServico } from '../modelos.js?v=202611221439';
import { nomeCliente, descricaoTipo, faseAtual, progressoProjeto, colunaDoQuadro, criarProjeto, etapasDo, aguardandoParceiros, pendenciasAbertas } from '../negocio.js?v=202611221439';
import { formCliente, opcoesClientes, tagPrazo, chipsComplementares, registrarComplementares, chipsServicos, registrarServicos } from '../componentes.js?v=202611221439';

const STATUS_PROJ = { ativo: 'Em andamento', pausado: 'Pausado', concluido: 'Concluído', cancelado: 'Cancelado' };
export { STATUS_PROJ };

let visao = 'quadro';
let filtro = { busca: '', categoria: '', status: 'abertos' };
try { visao = localStorage.getItem('ab_visao_projetos') || 'quadro'; } catch { /* ignora */ }

export function prazoFinal(p) {
  if (p.data_prevista) return p.data_prevista;
  const et = etapasDo(p.id).filter(e => e.prazo && e.status !== 'na');
  return et.length ? et[et.length - 1].prazo : null;
}

export function esperaTag(pid) {
  const esp = aguardandoParceiros(pid);
  const pend = pendenciasAbertas(pid);
  const atras = pend.some(x => x.prazo && x.prazo < hoje());
  const tags = [esp && `<span class="tag tag-terracota">aguardando parceiros · ${esp.recebidos}/${esp.total}</span>`,
    pend.length && `<span class="tag ${atras ? 'tag-atrasado' : 'tag-terracota'}" title="${h(pend.map(x => x.descricao).join(' · '))}">${icone('alerta', 11)} aguardando cliente${pend.length > 1 ? ` (${pend.length})` : ''}</span>`].filter(Boolean);
  return tags.length ? `<div style="margin:-2px 0 8px;display:flex;gap:4px;flex-wrap:wrap">${tags.join('')}</div>` : '';
}

export function cartaoProjeto(p) {
  const f = faseAtual(p.id);
  const pr = progressoProjeto(p.id);
  return `<div class="cartao-proj" data-proj="${p.id}">
    <div class="cod">${h(p.codigo || '')}${p.status === 'pausado' ? ' · <span class="tag tag-alerta">Pausado</span>' : ''}</div>
    <h4>${h(p.nome)}</h4>
    <div class="cli">${h(nomeCliente(p.cliente_id))}</div>
    <div class="fase">${f ? `${icone('seta', 13)} ${h(f.nome)}` : `${icone('check', 13)} Todas as etapas concluídas`}</div>
    ${esperaTag(p.id)}
    <div class="progresso"><span style="width:${pr.pct}%"></span></div>
    <div class="rodape"><span class="tag tag-verde">${h(TIPOS[p.categoria]?.[p.tipo] || CATEGORIAS[p.categoria])}</span>
      ${f ? tagPrazo(f.prazo) : `<span class="fraco">${pr.pct}%</span>`}</div>
  </div>`;
}

function filtrar() {
  const b = filtro.busca.toLowerCase();
  return store.projetos.filter(p => {
    if (filtro.categoria && p.categoria !== filtro.categoria) return false;
    if (filtro.status === 'abertos' && !['ativo', 'pausado'].includes(p.status)) return false;
    if (filtro.status && filtro.status !== 'abertos' && p.status !== filtro.status) return false;
    if (b && !`${p.nome} ${p.codigo} ${nomeCliente(p.cliente_id)} ${p.endereco_obra || ''}`.toLowerCase().includes(b)) return false;
    return true;
  }).sort((a, b) => String(prazoFinal(a) || '9999').localeCompare(String(prazoFinal(b) || '9999')));
}

function quadroHTML(lista) {
  return `<div class="quadro">${FASES.map(fase => {
    const cards = lista.filter(p => colunaDoQuadro(p) === fase.chave);
    return `<div class="coluna"><div class="coluna-cab"><strong>${h(fase.nome)}</strong><span class="n">${cards.length}</span></div>
      ${cards.map(cartaoProjeto).join('') || '<div class="vazio" style="padding:14px 4px">—</div>'}</div>`;
  }).join('')}</div>`;
}

function listaHTML(lista) {
  if (!lista.length) return '<div class="cartao vazio">Nenhum projeto encontrado.</div>';
  return `<div class="cartao tabela-envolve"><table class="tabela">
    <thead><tr><th>Projeto</th><th>Cliente</th><th>Fase atual</th><th style="width:150px">Progresso</th><th>Prazo final</th><th>Situação</th><th class="num">Contrato</th></tr></thead>
    <tbody>${lista.map(p => {
      const f = faseAtual(p.id); const pr = progressoProjeto(p.id);
      return `<tr class="clicavel" data-proj="${p.id}">
        <td><div>${h(p.nome)}</div><div class="fraco">${h(p.codigo || '')} · ${h(descricaoTipo(p))}</div></td>
        <td>${h(nomeCliente(p.cliente_id))}</td>
        <td>${f ? h(f.nome) : '<span class="fraco">Concluído</span>'}${esperaTag(p.id)}</td>
        <td><div class="progresso"><span style="width:${pr.pct}%"></span></div><div class="fraco">${pr.pct}% · ${pr.etapasFeitas}/${pr.etapas} etapas</div></td>
        <td>${tagPrazo(prazoFinal(p), p.status === 'concluido')}</td>
        <td><span class="tag ${p.status === 'ativo' ? 'tag-verde' : p.status === 'concluido' ? 'tag-ok' : 'tag-neutro'}">${STATUS_PROJ[p.status] || p.status}</span></td>
        <td class="num">${moeda(p.valor_contrato)}</td></tr>`;
    }).join('')}</tbody></table></div>`;
}

export function render(el) {
  const lista = filtrar();
  el.innerHTML = `
    <div class="cab">
      <div class="titulos"><h1>Projetos</h1><div class="sub">Clique em um projeto para ver e concluir as etapas.</div></div>
      <div class="acoes">
        <div class="grupo-botoes">
          <button data-visao="quadro" class="${visao === 'quadro' ? 'ativo' : ''}">${icone('quadro', 16)} Quadro</button>
          <button data-visao="lista" class="${visao === 'lista' ? 'ativo' : ''}">${icone('lista', 16)} Lista</button>
        </div>
        <button class="btn btn-primario" id="novo-proj">${icone('mais', 16)} Novo projeto</button>
      </div>
    </div>
    <div class="filtros">
      <div class="busca">${icone('busca', 16)}<input id="f-busca" placeholder="Buscar projeto, cliente, código…" value="${h(filtro.busca)}"></div>
      <select id="f-cat"><option value="">Todos os tipos</option>${Object.entries(CATEGORIAS).map(([k, v]) => `<option value="${k}" ${filtro.categoria === k ? 'selected' : ''}>${v}</option>`).join('')}</select>
      <select id="f-status">${[['abertos', 'Em andamento e pausados'], ['ativo', 'Em andamento'], ['pausado', 'Pausados'], ['concluido', 'Concluídos'], ['cancelado', 'Cancelados'], ['', 'Todos']].map(([k, v]) => `<option value="${k}" ${filtro.status === k ? 'selected' : ''}>${v}</option>`).join('')}</select>
    </div>
    <div id="area-proj">${visao === 'quadro' ? quadroHTML(lista) : listaHTML(lista)}</div>`;

  el.querySelectorAll('[data-visao]').forEach(b => b.addEventListener('click', () => {
    visao = b.dataset.visao; try { localStorage.setItem('ab_visao_projetos', visao); } catch { /* ignora */ }
    render(el);
  }));
  el.querySelector('#novo-proj').addEventListener('click', () => novoProjeto());
  const busca = el.querySelector('#f-busca');
  busca.addEventListener('input', () => {
    filtro.busca = busca.value;
    const l = filtrar();
    el.querySelector('#area-proj').innerHTML = visao === 'quadro' ? quadroHTML(l) : listaHTML(l);
    ligarCartoes(el);
  });
  el.querySelector('#f-cat').addEventListener('change', e => { filtro.categoria = e.target.value; render(el); });
  el.querySelector('#f-status').addEventListener('change', e => { filtro.status = e.target.value; render(el); });
  ligarCartoes(el);
}

export function ligarCartoes(raiz) {
  raiz.querySelectorAll('[data-proj]').forEach(c => c.addEventListener('click', () => nav.ir('projeto/' + c.dataset.proj)));
}

// =====================================================================
//  NOVO PROJETO — assistente em 4 passos
// =====================================================================
export function novoProjeto(pre = {}) {
  const st = {
    passo: 1,
    cliente_id: pre.cliente_id || '', nome: pre.nome || '', endereco_obra: pre.endereco_obra || '', area_m2: pre.area_m2 ?? '',
    categoria: pre.categoria || 'arquitetonico', tipo: pre.tipo || 'residencial', intervencao: pre.intervencao || 'novo',
    data_inicio: hoje(), data_assinatura: hoje(), valor_contrato: pre.valor_contrato ?? '', contrato: null, observacoes: pre.observacoes || '',
    etapas: null, pagamentos: null, orcamento_id: pre.orcamento_id || null, complementares: pre.complementares || [], servicos: pre.servicos || [],
  };
  const PASSOS = ['Cliente e obra', 'Tipo de projeto', 'Etapas e prazos', 'Contrato e pagamentos'];
  const m = abrirModal({ titulo: 'Novo projeto', largura: 820, corpo: '<div id="assist"></div>',
    rodape: `<button class="btn" data-voltar>Voltar</button><span class="espaco"></span>
      <button class="btn" data-fechar>Cancelar</button><button class="btn btn-primario" data-avancar>Continuar</button>` });
  const corpo = m.el.querySelector('#assist');
  const bVoltar = m.el.querySelector('[data-voltar]');
  const bAvancar = m.el.querySelector('[data-avancar]');

  const precisaIntervencao = () => st.categoria !== 'complementares' && TIPOS_COM_INTERVENCAO.includes(st.tipo);

  function gerarEtapas() {
    const modelo = montarModelo(st.categoria, st.tipo, precisaIntervencao() ? st.intervencao : null);
    const pelosServicos = st.servicos.map(n => infoServico(n).etapa).filter(Boolean);
    st.etapas = modelo.map(e => ({ ...e, incluir: !e.opcional || pelosServicos.includes(e.chave), prazo: '', data_inicio: '' }));
    recalcularDatas();
    st.pagamentos = null;
  }
  function recalcularDatas(aPartirDe = 0) {
    let inicio = aPartirDe === 0 ? st.data_inicio : null;
    st.etapas.forEach((e, i) => {
      if (!e.incluir) return;
      if (i < aPartirDe) { inicio = e.prazo ? somarDias(e.prazo, 1) : inicio; return; }
      e.data_inicio = inicio || st.data_inicio;
      e.prazo = somarDias(e.data_inicio, Math.max(0, (Number(e.dias) || 1) - 1));
      inicio = somarDias(e.prazo, 1);
    });
  }
  function gerarPagamentos() {
    const total = Number(st.valor_contrato) || 0;
    const incl = st.etapas.map((e, i) => ({ e, i })).filter(x => x.e.incluir);
    st.pagamentos = PAGAMENTOS_PADRAO.map(pg => {
      const alvo = incl.find(x => x.e.chave === pg.chave) || incl[incl.length - 1];
      return { descricao: pg.descricao, pct: pg.pct, valor: +(total * pg.pct / 100).toFixed(2), gatilho: 'etapa', etapaIndice: alvo?.i ?? 0, vencimento: '' };
    });
  }

  function passo1() {
    return `
      <div class="form-grade">
        <div class="campo meia"><label>Cliente <span class="obrig">*</span></label>
          <div style="display:flex;gap:6px"><select id="a-cliente" class="entrada"><option value="">Selecione…</option>
            ${opcoesClientes().map(([id, n]) => `<option value="${id}" ${id === st.cliente_id ? 'selected' : ''}>${h(n)}</option>`).join('')}</select>
            <button class="btn" type="button" id="a-novo-cli" title="Cadastrar cliente">${icone('mais', 16)}</button></div>
          <small>Primeiro passo: o cliente precisa estar cadastrado.</small></div>
        ${campoHTML({ nome: 'nome', rotulo: 'Nome do projeto', obrigatorio: true, largura: 'meia', placeholder: 'Ex.: Residência Silva' }, st.nome)}
        ${campoHTML({ nome: 'endereco_obra', rotulo: 'Endereço da obra', largura: 'meia' }, st.endereco_obra)}
        ${campoHTML({ nome: 'area_m2', rotulo: 'Área (m²)', tipo: 'number', largura: 'meia' }, st.area_m2)}
        ${campoHTML({ nome: 'observacoes', rotulo: 'Observações', tipo: 'textarea', linhas: 2 }, st.observacoes)}
      </div>`;
  }
  function passo2() {
    const tipos = TIPOS[st.categoria];
    const desc = { arquitetonico: 'Residencial, comercial, industrial, paginação de piso e forro', interiores: 'Residencial, comercial e industrial', complementares: 'Sempre terceirizados com engenheiros parceiros' };
    return `
      <div class="rotulo-sec">Categoria</div>
      <div class="opcoes-tipo">${Object.entries(CATEGORIAS).map(([k, v]) => `<button type="button" class="opcao-tipo ${st.categoria === k ? 'sel' : ''}" data-cat="${k}"><b>${v}</b><small>${desc[k]}</small></button>`).join('')}</div>
      ${st.categoria !== 'complementares' ? `<div class="rotulo-sec">Tipo</div>
      <div class="chips">${Object.entries(tipos).map(([k, v]) => `<button type="button" class="chip ${st.tipo === k ? 'sel' : ''}" data-tipo="${k}">${v}</button>`).join('')}</div>` : ''}
      ${precisaIntervencao() ? `<div class="rotulo-sec">Intervenção</div>
      <div class="chips">${Object.entries(INTERVENCOES).map(([k, v]) => `<button type="button" class="chip ${st.intervencao === k ? 'sel' : ''}" data-interv="${k}">${v}</button>`).join('')}</div>` : ''}
      <div class="rotulo-sec" style="margin-top:6px">Serviços adicionais contratados <span class="fraco">(se houver)</span></div>
      ${chipsServicos(st.servicos)}
      <div class="rotulo-sec" style="margin-top:6px">Projetos complementares contratados pelo cliente ${st.categoria === 'complementares' ? '<span class="obrig">*</span>' : '<span class="fraco">(se houver)</span>'}</div>
      ${chipsComplementares(st.complementares)}
      <p class="fraco" style="margin-top:-4px;font-size:.85rem">Cada um entra na aba Complementares do projeto para você escolher o parceiro, o prazo e o valor.</p>
      <p class="fraco" style="margin-top:10px">As etapas e o checklist (baseados nas NBR 16636 e NBR 6492) são montados conforme a escolha. No próximo passo dá para incluir ou tirar etapas e, depois, acrescentar etapas e itens próprios dentro do projeto.</p>`;
  }
  function passo3() {
    return `
      <div class="form-grade" style="margin-bottom:12px">
        ${campoHTML({ nome: 'data_inicio', rotulo: 'Início do projeto', tipo: 'date', largura: 'terco' }, st.data_inicio)}
        <div class="campo" style="grid-column: span 4; justify-content:flex-end"><small>Altere os dias de cada fase e as datas são recalculadas em sequência. Também dá para digitar o prazo direto.</small></div>
      </div>
      <div class="tabela-envolve"><table class="tabela tabela-prazos">
        <thead><tr><th></th><th>Etapa</th><th>Dias</th><th>Início</th><th>Prazo</th></tr></thead>
        <tbody>${st.etapas.map((e, i) => `<tr class="${e.incluir ? '' : 'desligada'}">
          <td><input type="checkbox" data-incl="${i}" ${e.incluir ? 'checked' : ''} title="Incluir etapa"></td>
          <td>${h(e.nome)}${e.opcional ? ' <span class="tag tag-areia">opcional</span>' : ''}</td>
          <td><input class="dias" type="number" min="1" data-dias="${i}" value="${e.dias}" ${e.incluir ? '' : 'disabled'}></td>
          <td class="fraco">${e.incluir ? data(e.data_inicio) : '—'}</td>
          <td><input type="date" data-prazo="${i}" value="${e.incluir ? e.prazo : ''}" ${e.incluir ? '' : 'disabled'}></td></tr>`).join('')}</tbody></table></div>`;
  }
  function passo4() {
    if (!st.pagamentos) gerarPagamentos();
    const incl = st.etapas.map((e, i) => ({ e, i })).filter(x => x.e.incluir);
    const soma = st.pagamentos.reduce((s, p) => s + (Number(p.valor) || 0), 0);
    const total = Number(st.valor_contrato) || 0;
    const dif = +(total - soma).toFixed(2);
    return `
      <div class="form-grade" style="margin-bottom:14px">
        ${campoHTML({ nome: 'data_assinatura', rotulo: 'Data da assinatura', tipo: 'date', largura: 'terco' }, st.data_assinatura)}
        ${campoHTML({ nome: 'valor_contrato', rotulo: 'Valor do contrato', tipo: 'moeda', largura: 'terco' }, st.valor_contrato)}
        <div class="campo terco"><label>Contrato assinado (PDF)</label><input type="file" id="a-contrato" accept=".pdf,image/*,.doc,.docx">
          <small>${st.contrato ? h(st.contrato.name) : 'Pode anexar depois também'}</small></div>
      </div>
      <div class="rotulo-sec">Pagamentos programados — por data certa ou pela entrega de uma fase</div>
      <div class="tabela-envolve"><table class="tabela tabela-prazos">
        <thead><tr><th>Descrição</th><th style="width:70px">%</th><th style="width:120px">Valor</th><th style="width:150px">Quando</th><th>Etapa / vencimento</th><th></th></tr></thead>
        <tbody>${st.pagamentos.map((p, i) => `<tr>
          <td><input type="text" data-pg="${i}" data-campo="descricao" value="${h(p.descricao)}"></td>
          <td><input type="number" data-pg="${i}" data-campo="pct" value="${p.pct ?? ''}" step="0.01"></td>
          <td><input type="number" data-pg="${i}" data-campo="valor" value="${p.valor ?? ''}" step="0.01"></td>
          <td><select data-pg="${i}" data-campo="gatilho"><option value="etapa" ${p.gatilho === 'etapa' ? 'selected' : ''}>Entrega de fase</option><option value="data" ${p.gatilho === 'data' ? 'selected' : ''}>Data certa</option></select></td>
          <td>${p.gatilho === 'etapa'
            ? `<select data-pg="${i}" data-campo="etapaIndice">${incl.map(x => `<option value="${x.i}" ${x.i === Number(p.etapaIndice) ? 'selected' : ''}>${h(x.e.nome)}</option>`).join('')}</select>`
            : `<input type="date" data-pg="${i}" data-campo="vencimento" value="${p.vencimento || ''}">`}</td>
          <td><button type="button" class="btn-icone" data-rm-pg="${i}" title="Remover">${icone('lixo', 15)}</button></td></tr>`).join('')}</tbody></table></div>
      <div style="display:flex;gap:8px;margin-top:8px;flex-wrap:wrap">
        <button type="button" class="btn btn-peq" id="a-add-pg">${icone('mais', 14)} Parcela</button>
        <button type="button" class="btn btn-peq btn-leve" id="a-padrao-pg">Restaurar padrão (30% entrada · 30% 3D · 40% entrega)</button>
      </div>
      <div class="aviso-soma ${Math.abs(dif) > 0.01 && total ? 'tag tag-alerta' : 'fraco'}">Soma das parcelas: ${moeda(soma)}${total ? ` de ${moeda(total)}${Math.abs(dif) > 0.01 ? ` — diferença de ${moeda(dif)}` : ' ✓'}` : ''}</div>`;
  }

  function desenhar() {
    corpo.innerHTML = `<div class="passos-assist">${PASSOS.map((p, i) => `<span class="${i + 1 === st.passo ? 'ativo' : i + 1 < st.passo ? 'feito' : ''}">${i + 1}. ${p}</span>`).join('')}</div>
      ${[passo1, passo2, passo3, passo4][st.passo - 1]()}`;
    bVoltar.style.visibility = st.passo === 1 ? 'hidden' : 'visible';
    bAvancar.textContent = st.passo === 4 ? 'Criar projeto' : 'Continuar';
    ligar();
  }

  function lerPasso1() {
    st.cliente_id = corpo.querySelector('#a-cliente').value;
    ['nome', 'endereco_obra', 'area_m2', 'observacoes'].forEach(k => { st[k] = corpo.querySelector(`[name=${k}]`).value.trim(); });
  }

  function ligar() {
    if (st.passo === 1) {
      corpo.querySelector('#a-novo-cli').addEventListener('click', () => {
        lerPasso1();
        formCliente(null, (c) => { st.cliente_id = c.id; if (!st.nome) st.nome = `Projeto ${c.nome.split(' ')[0]}`; desenhar(); });
      });
    }
    if (st.passo === 2) {
      corpo.querySelectorAll('[data-cat]').forEach(b => b.addEventListener('click', () => {
        st.categoria = b.dataset.cat; st.tipo = Object.keys(TIPOS[st.categoria])[0]; st.etapas = null; desenhar();
      }));
      corpo.querySelectorAll('[data-tipo]').forEach(b => b.addEventListener('click', () => { st.tipo = b.dataset.tipo; st.etapas = null; desenhar(); }));
      corpo.querySelectorAll('[data-interv]').forEach(b => b.addEventListener('click', () => { st.intervencao = b.dataset.interv; st.etapas = null; desenhar(); }));
      corpo.querySelectorAll('[data-serv]').forEach(b => b.addEventListener('click', () => {
        const n = b.dataset.serv; st.servicos = st.servicos.includes(n) ? st.servicos.filter(x => x !== n) : [...st.servicos, n];
        // alvará e acompanhamento de obra ligam/desligam as etapas correspondentes
        const ch = infoServico(n).etapa;
        if (ch && st.etapas) { st.etapas.forEach(e => { if (e.chave === ch) e.incluir = st.servicos.includes(n); }); recalcularDatas(); st.pagamentos = null; }
        desenhar();
      }));
      corpo.querySelectorAll('[data-comp-ctr]').forEach(b => b.addEventListener('click', () => {
        const d = b.dataset.compCtr; st.complementares = st.complementares.includes(d) ? st.complementares.filter(x => x !== d) : [...st.complementares, d]; desenhar();
      }));
    }
    if (st.passo === 3) {
      corpo.querySelector('[name=data_inicio]').addEventListener('change', e => { st.data_inicio = e.target.value || hoje(); recalcularDatas(); desenhar(); });
      corpo.querySelectorAll('[data-incl]').forEach(c => c.addEventListener('change', () => {
        st.etapas[c.dataset.incl].incluir = c.checked; recalcularDatas(); st.pagamentos = null; desenhar();
      }));
      corpo.querySelectorAll('[data-dias]').forEach(c => c.addEventListener('change', () => {
        st.etapas[c.dataset.dias].dias = Math.max(1, Number(c.value) || 1); recalcularDatas(); desenhar();
      }));
      corpo.querySelectorAll('[data-prazo]').forEach(c => c.addEventListener('change', () => {
        const i = Number(c.dataset.prazo); const e = st.etapas[i];
        if (!c.value) return;
        e.prazo = c.value;
        e.dias = Math.max(1, Math.round((new Date(c.value) - new Date(e.data_inicio)) / 86400000) + 1);
        recalcularDatas(i + 1); desenhar();
      }));
    }
    if (st.passo === 4) {
      corpo.querySelector('[name=data_assinatura]').addEventListener('change', e => { st.data_assinatura = e.target.value; });
      corpo.querySelector('[name=valor_contrato]').addEventListener('change', e => {
        st.valor_contrato = e.target.value;
        const total = Number(st.valor_contrato) || 0;
        st.pagamentos.forEach(p => { if (p.pct !== '' && p.pct != null) p.valor = +(total * Number(p.pct) / 100).toFixed(2); });
        desenhar();
      });
      corpo.querySelector('#a-contrato').addEventListener('change', e => { st.contrato = e.target.files[0] || null; });
      corpo.querySelectorAll('[data-pg]').forEach(inp => inp.addEventListener('change', () => {
        const p = st.pagamentos[inp.dataset.pg]; const campo = inp.dataset.campo; const total = Number(st.valor_contrato) || 0;
        p[campo] = inp.value;
        if (campo === 'pct' && total) p.valor = +(total * Number(inp.value) / 100).toFixed(2);
        if (campo === 'valor' && total) p.pct = +(Number(inp.value) / total * 100).toFixed(2);
        if (['pct', 'valor', 'gatilho'].includes(campo)) desenhar();
      }));
      corpo.querySelectorAll('[data-rm-pg]').forEach(b => b.addEventListener('click', () => { st.pagamentos.splice(Number(b.dataset.rmPg), 1); desenhar(); }));
      corpo.querySelector('#a-add-pg').addEventListener('click', () => { st.pagamentos.push({ descricao: 'Parcela', pct: '', valor: '', gatilho: 'data', vencimento: '' }); desenhar(); });
      corpo.querySelector('#a-padrao-pg').addEventListener('click', () => { gerarPagamentos(); desenhar(); });
    }
  }

  bVoltar.addEventListener('click', () => { if (st.passo > 1) { st.passo--; desenhar(); } });
  bAvancar.addEventListener('click', async () => {
    if (st.passo === 1) {
      lerPasso1();
      if (!st.cliente_id) return aviso('Selecione ou cadastre o cliente', 'erro');
      if (!st.nome) return aviso('Dê um nome ao projeto', 'erro');
    }
    if (st.passo === 2 && st.categoria === 'complementares' && !st.complementares.length) return aviso('Marque quais projetos complementares foram contratados', 'erro');
    if (st.passo === 2 && !st.etapas) gerarEtapas();
    if (st.passo === 3 && !st.etapas.some(e => e.incluir)) return aviso('Inclua pelo menos uma etapa', 'erro');
    if (st.passo < 4) { st.passo++; desenhar(); return; }

    // criar
    bAvancar.disabled = true; bAvancar.textContent = 'Criando…';
    try {
      const incluidas = st.etapas.map((e, i) => ({ e, i })).filter(x => x.e.incluir);
      const mapa = Object.fromEntries(incluidas.map((x, novo) => [x.i, novo]));
      const prazos = incluidas.map(x => x.e.prazo).filter(Boolean).sort();
      const p = await criarProjeto({
        projeto: {
          cliente_id: st.cliente_id, nome: st.nome, categoria: st.categoria,
          tipo: st.categoria === 'complementares' ? 'complementares' : st.tipo,
          intervencao: precisaIntervencao() ? st.intervencao : null,
          endereco_obra: st.endereco_obra, area_m2: st.area_m2 === '' ? null : Number(st.area_m2),
          valor_contrato: Number(st.valor_contrato) || 0, data_assinatura: st.data_assinatura || null,
          data_inicio: st.data_inicio, data_prevista: prazos[prazos.length - 1] || null, observacoes: st.observacoes,
        },
        etapas: incluidas.map(x => x.e),
        recebimentos: st.pagamentos.filter(pg => pg.descricao && Number(pg.valor)).map(pg => ({
          descricao: pg.descricao, valor: Number(pg.valor), gatilho: pg.gatilho, vencimento: pg.vencimento,
          etapaIndice: mapa[Number(pg.etapaIndice)] ?? 0,
        })),
        contrato: st.contrato,
      });
      if (st.complementares.length) await registrarComplementares(p.id, st.complementares);
      if (st.servicos.length) await registrarServicos(p.id, st.servicos);
      if (st.orcamento_id) await atualizar('orcamentos', st.orcamento_id, { projeto_id: p.id, status: 'aprovado' });
      m.fechar(); aviso('Projeto criado com todas as etapas');
      nav.ir('projeto/' + p.id);
    } catch (e) {
      console.error(e); aviso(e.message, 'erro');
      bAvancar.disabled = false; bAvancar.textContent = 'Criar projeto';
    }
  });
  desenhar();
}
