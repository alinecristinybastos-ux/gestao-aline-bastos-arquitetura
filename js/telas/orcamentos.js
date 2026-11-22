// =====================================================================
//  ORÇAMENTOS / PROPOSTAS — controle e impressão com a identidade visual
// =====================================================================
import { store, porId, inserir, atualizar, remover } from '../dados.js?v=202611221522';
import { h, icone, moeda, data, hoje, somarDias, formModal, confirmar, aviso, tentar } from '../util.js?v=202611221522';
import { nav } from '../nav.js?v=202611221522';
import { ESCRITORIO } from '../config.js?v=202611221522';
import { CATEGORIAS, TIPOS, INTERVENCOES } from '../modelos.js?v=202611221522';
import { opcoesClientes } from '../componentes.js?v=202611221522';
import { novoProjeto } from './projetos.js?v=202611221522';

const STATUS = { rascunho: 'Rascunho', enviado: 'Enviado', aprovado: 'Aprovado', recusado: 'Recusado' };
const COR = { rascunho: 'neutro', enviado: 'areia', aprovado: 'ok', recusado: 'perigo' };
let filtro = '';

const nomeOrc = (o) => o.cliente_id ? porId('clientes', o.cliente_id)?.nome || o.cliente_nome : o.cliente_nome;

export function render(el) {
  const lista = store.orcamentos.filter(o => !filtro || o.status === filtro)
    .sort((a, b) => String(b.data).localeCompare(String(a.data)));
  const enviados = store.orcamentos.filter(o => o.status === 'enviado');
  const aprov = store.orcamentos.filter(o => o.status === 'aprovado').length;
  const decididos = store.orcamentos.filter(o => ['aprovado', 'recusado'].includes(o.status)).length;

  el.innerHTML = `
    <div class="cab"><div class="titulos"><h1>Orçamentos</h1><div class="sub">Propostas enviadas e conversão em projetos.</div></div>
      <div class="acoes"><button class="btn btn-primario" id="novo-orc">${icone('mais', 16)} Novo orçamento</button></div></div>
    <div class="indicadores">
      <div class="indicador"><div class="rot">Aguardando resposta</div><div class="val">${enviados.length}</div><div class="det">${moeda(enviados.reduce((s, o) => s + Number(o.valor || 0), 0))}</div></div>
      <div class="indicador"><div class="rot">Taxa de aprovação</div><div class="val">${decididos ? Math.round(aprov / decididos * 100) + '%' : '—'}</div><div class="det">${aprov} de ${decididos} decididos</div></div>
      <div class="indicador"><div class="rot">Aprovados (valor)</div><div class="val">${moeda(store.orcamentos.filter(o => o.status === 'aprovado').reduce((s, o) => s + Number(o.valor || 0), 0))}</div></div>
      <div class="indicador"><div class="rot">Total de orçamentos</div><div class="val">${store.orcamentos.length}</div></div>
    </div>
    <div class="filtros"><div class="grupo-botoes">${[['', 'Todos'], ...Object.entries(STATUS)].map(([k, v]) => `<button data-f="${k}" class="${filtro === k ? 'ativo' : ''}">${v}</button>`).join('')}</div></div>
    <div class="cartao tabela-envolve">${lista.length ? `<table class="tabela">
      <thead><tr><th>Nº</th><th>Cliente</th><th>Projeto</th><th>Data</th><th>Validade</th><th>Situação</th><th class="num">Valor</th><th></th></tr></thead>
      <tbody>${lista.map(o => `<tr class="clicavel" data-orc="${o.id}">
        <td class="fraco">${h(o.numero || '')}</td><td>${h(nomeOrc(o) || '—')}</td>
        <td><div>${h(o.descricao || '')}</div><div class="fraco">${h([CATEGORIAS[o.categoria], TIPOS[o.categoria]?.[o.tipo], INTERVENCOES[o.intervencao]].filter(Boolean).join(' · '))}</div></td>
        <td>${data(o.data)}</td>
        <td>${o.status === 'enviado' && o.validade && o.validade < hoje() ? `<span class="tag tag-atrasado">vencida</span>` : data(o.validade)}</td>
        <td><span class="tag tag-${COR[o.status]}">${STATUS[o.status]}</span></td>
        <td class="num">${moeda(o.valor)}</td>
        <td class="num">${o.projeto_id ? `<a class="btn btn-peq btn-leve" href="#/projeto/${o.projeto_id}">Ver projeto</a>` : o.status !== 'recusado' ? `<button class="btn btn-peq" data-aprovar="${o.id}">Aprovar → projeto</button>` : ''}</td></tr>`).join('')}</tbody></table>`
      : '<div class="vazio">Nenhum orçamento.</div>'}</div>`;

  el.querySelector('#novo-orc').addEventListener('click', () => formOrcamento());
  el.querySelectorAll('[data-f]').forEach(b => b.addEventListener('click', () => { filtro = b.dataset.f; render(el); }));
  el.querySelectorAll('[data-orc]').forEach(tr => tr.addEventListener('click', e => {
    if (e.target.closest('[data-aprovar], a')) return;
    formOrcamento(porId('orcamentos', tr.dataset.orc));
  }));
  el.querySelectorAll('[data-aprovar]').forEach(b => b.addEventListener('click', () => aprovar(porId('orcamentos', b.dataset.aprovar))));
}

async function aprovar(o) {
  let clienteId = o.cliente_id;
  if (!clienteId) {
    if (!await confirmar(`Cadastrar "${o.cliente_nome}" como cliente e abrir o cadastro do projeto?`, { ok: 'Continuar' })) return;
    const [c] = await inserir('clientes', { nome: o.cliente_nome, telefone: o.telefone, email: o.email });
    clienteId = c.id; await atualizar('orcamentos', o.id, { cliente_id: c.id });
  }
  novoProjeto({
    cliente_id: clienteId, nome: o.descricao || `Projeto ${nomeOrc(o)}`, categoria: o.categoria || 'arquitetonico',
    tipo: o.tipo || Object.keys(TIPOS[o.categoria || 'arquitetonico'])[0], intervencao: o.intervencao || 'novo',
    area_m2: o.area_m2, valor_contrato: o.valor, orcamento_id: o.id,
  });
}

function proximoNumero() {
  const ano = hoje().slice(0, 4);
  return `${String(store.orcamentos.filter(o => (o.numero || '').endsWith(ano)).length + 1).padStart(3, '0')}/${ano}`;
}

function formOrcamento(o = null) {
  const todosTipos = Object.entries(TIPOS).flatMap(([cat, t]) => Object.entries(t).map(([k, v]) => [`${cat}:${k}`, `${CATEGORIAS[cat]} — ${v}`]));
  const campos = [
    { nome: 'cliente_id', rotulo: 'Cliente cadastrado', tipo: 'select', opcoes: opcoesClientes(), vazio: 'Ainda não é cliente', largura: 'meia' },
    { nome: 'cliente_nome', rotulo: 'Ou nome do interessado', largura: 'meia' },
    { nome: 'telefone', rotulo: 'Telefone', largura: 'meia' },
    { nome: 'email', rotulo: 'E-mail', largura: 'meia' },
    { nome: 'descricao', rotulo: 'Projeto', obrigatorio: true, placeholder: 'Ex.: Residência unifamiliar térrea — Bairro X' },
    { nome: 'cattipo', rotulo: 'Tipo de projeto', tipo: 'select', opcoes: todosTipos, largura: 'meia' },
    { nome: 'intervencao', rotulo: 'Intervenção', tipo: 'select', opcoes: Object.entries(INTERVENCOES), largura: 'terco' },
    { nome: 'area_m2', rotulo: 'Área (m²)', tipo: 'number', largura: 'terco' },
    { nome: 'escopo', rotulo: 'Escopo / etapas incluídas', tipo: 'textarea', linhas: 5,
      padrao: 'Levantamento e briefing\nEstudo preliminar com imagens 3D\nAnteprojeto\nProjeto executivo\nCompatibilização com projetos complementares\nEntrega final em PDF' },
    { nome: 'valor', rotulo: 'Valor total', tipo: 'moeda', obrigatorio: true, largura: 'meia' },
    { nome: 'condicoes', rotulo: 'Condições de pagamento', largura: 'meia', padrao: '30% na assinatura · 30% na apresentação do 3D · 40% na entrega final' },
    { nome: 'data', rotulo: 'Data', tipo: 'date', largura: 'terco', padrao: hoje() },
    { nome: 'validade', rotulo: 'Validade', tipo: 'date', largura: 'terco', padrao: somarDias(hoje(), 15) },
    { nome: 'status', rotulo: 'Situação', tipo: 'select', vazio: false, opcoes: Object.entries(STATUS), largura: 'terco' },
    { nome: 'obs', rotulo: 'Observações internas', tipo: 'textarea', linhas: 2 },
  ];
  const valores = o ? { ...o, cattipo: o.categoria ? `${o.categoria}:${o.tipo}` : '' } : { status: 'rascunho' };
  const m = formModal({
    titulo: o ? `Orçamento ${o.numero || ''}` : 'Novo orçamento', campos, valores, largura: 680,
    extraRodape: o ? `<button class="btn btn-leve" type="button" data-excluir>${icone('lixo', 16)}</button>
      <button class="btn" type="button" data-imprimir>${icone('pdf', 16)} Proposta em PDF</button>` : '',
    onSalvar: async d => {
      if (!d.cliente_id && !d.cliente_nome) throw new Error('Informe o cliente ou o nome do interessado');
      const [categoria, tipo] = (d.cattipo || ':').split(':'); delete d.cattipo;
      Object.assign(d, { categoria: categoria || null, tipo: tipo || null });
      if (o) await atualizar('orcamentos', o.id, d);
      else await inserir('orcamentos', { ...d, numero: proximoNumero() });
      aviso('Orçamento salvo'); nav.recarregar();
    },
  });
  m.el.querySelector('[data-excluir]')?.addEventListener('click', async () => {
    if (!await confirmar('Excluir este orçamento?', { ok: 'Excluir', perigo: true })) return;
    await tentar(() => remover('orcamentos', o.id), 'Orçamento excluído'); m.fechar(); nav.recarregar();
  });
  m.el.querySelector('[data-imprimir]')?.addEventListener('click', () => imprimirProposta(o));
}

/** Abre a proposta no papel timbrado e chama a impressão (Salvar como PDF). */
function imprimirProposta(o) {
  const base = new URL('.', location.href).href;
  const escopo = String(o.escopo || '').split('\n').filter(s => s.trim());
  const cli = porId('clientes', o.cliente_id);
  const w = window.open('', '_blank');
  if (!w) return aviso('Permita pop-ups para gerar a proposta', 'erro');
  w.document.write(`<!DOCTYPE html><html lang="pt-BR"><head><meta charset="utf-8"><title>Proposta ${h(o.numero || '')} — ${h(nomeOrc(o))}</title>
  <base href="${base}">
  <style>
    @font-face { font-family: Questrial; src: url('assets/Questrial-Regular.ttf'); }
    @page { size: A4; margin: 0; }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: Questrial, sans-serif; color: #253219; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .folha { width: 210mm; min-height: 297mm; padding: 22mm 22mm 26mm 26mm; position: relative; overflow: hidden; }
    .arco { position: absolute; border: 1.2px solid #b98a46; border-radius: 50%; }
    .topo { display: flex; justify-content: flex-end; margin-bottom: 20mm; }
    .topo img { width: 62mm; }
    h1 { font-weight: 400; font-size: 22pt; color: #556946; margin-bottom: 2mm; }
    .num { color: #8c9386; font-size: 10pt; margin-bottom: 12mm; letter-spacing: .05em; }
    .bloco { margin-bottom: 9mm; }
    .rot { font-size: 8.5pt; text-transform: uppercase; letter-spacing: .12em; color: #8b4109; margin-bottom: 2mm; }
    p, li { font-size: 11pt; line-height: 1.6; }
    ul { padding-left: 5mm; }
    .valor { font-size: 20pt; color: #253219; }
    .rodape { position: absolute; bottom: 14mm; left: 26mm; right: 22mm; font-size: 8.5pt; color: #8c9386; border-top: 1px solid #e3e1d8; padding-top: 3mm; display: flex; justify-content: space-between; }
  </style></head><body><div class="folha">
    <div class="arco" style="width:160mm;height:160mm;left:-120mm;top:60mm"></div>
    <div class="arco" style="width:140mm;height:140mm;right:-60mm;bottom:-110mm"></div>
    <div class="topo"><img src="assets/logo-horizontal-verde.png" alt="${h(ESCRITORIO.nome)}"></div>
    <h1>Proposta de serviços</h1>
    <div class="num">Nº ${h(o.numero || '')} · ${data(o.data)}</div>
    <div class="bloco"><div class="rot">Cliente</div><p>${h(nomeOrc(o) || '')}${cli?.telefone || o.telefone ? ` · ${h(cli?.telefone || o.telefone)}` : ''}</p></div>
    <div class="bloco"><div class="rot">Projeto</div><p>${h(o.descricao || '')}</p>
      <p style="color:#5d6656">${h([CATEGORIAS[o.categoria], TIPOS[o.categoria]?.[o.tipo], INTERVENCOES[o.intervencao], o.area_m2 ? o.area_m2 + ' m²' : ''].filter(Boolean).join(' · '))}</p></div>
    ${escopo.length ? `<div class="bloco"><div class="rot">Escopo</div><ul>${escopo.map(s => `<li>${h(s)}</li>`).join('')}</ul></div>` : ''}
    <div class="bloco"><div class="rot">Investimento</div><p class="valor">${moeda(o.valor)}</p>${o.condicoes ? `<p>${h(o.condicoes)}</p>` : ''}</div>
    <div class="bloco"><div class="rot">Validade</div><p>Esta proposta é válida até ${data(o.validade)}.</p></div>
    <div class="rodape"><span>${h(ESCRITORIO.nome)} · ${h(ESCRITORIO.subtitulo)}</span><span>Proposta ${h(o.numero || '')}</span></div>
  </div><script>window.onload = () => setTimeout(() => window.print(), 300);<\/script></body></html>`);
  w.document.close();
}
