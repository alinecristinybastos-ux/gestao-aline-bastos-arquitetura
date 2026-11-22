// =====================================================================
//  Utilidades de interface: formatação, modais, formulários, avisos
// =====================================================================

/** Escapa texto para HTML. */
export const h = (v) => String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export const $ = (sel, raiz = document) => raiz.querySelector(sel);
export const $$ = (sel, raiz = document) => [...raiz.querySelectorAll(sel)];

const fmtMoeda = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
export const moeda = (v) => fmtMoeda.format(Number(v) || 0);

export function hoje() {
  const d = new Date(); d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 10);
}
export function somarDias(iso, dias) {
  const d = new Date((iso || hoje()) + 'T12:00:00'); d.setDate(d.getDate() + Number(dias || 0));
  return d.toISOString().slice(0, 10);
}
export function diasAte(iso) {
  if (!iso) return null;
  return Math.round((new Date(iso + 'T12:00:00') - new Date(hoje() + 'T12:00:00')) / 86400000);
}
export function data(iso) {
  if (!iso) return '—';
  const [a, m, d] = String(iso).slice(0, 10).split('-');
  return `${d}/${m}/${a}`;
}
export function dataCurta(iso) {
  if (!iso) return '—';
  const meses = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
  const [a, m, d] = String(iso).slice(0, 10).split('-');
  return `${Number(d)} ${meses[Number(m) - 1]}${a !== hoje().slice(0, 4) ? ' ' + a.slice(2) : ''}`;
}
/** Etiqueta de prazo: "vence hoje", "3 dias atrasado"... */
export function prazoTexto(iso, concluido = false) {
  if (!iso) return { txt: 'sem prazo', cls: 'neutro' };
  if (concluido) return { txt: dataCurta(iso), cls: 'neutro' };
  const n = diasAte(iso);
  if (n < 0) return { txt: `${-n} dia${n === -1 ? '' : 's'} atrasado`, cls: 'atrasado' };
  if (n === 0) return { txt: 'vence hoje', cls: 'alerta' };
  if (n <= 7) return { txt: `em ${n} dia${n === 1 ? '' : 's'}`, cls: 'alerta' };
  return { txt: dataCurta(iso), cls: 'neutro' };
}
export const tamanhoArquivo = (b) => !b ? '' : b < 1024 * 1024 ? `${Math.max(1, Math.round(b / 1024))} KB` : `${(b / 1048576).toFixed(1)} MB`;

// ---------------------------------------------------------------- ícones (traço fino)
const IC = {
  painel: '<path d="M3 13h8V3H3zM13 21h8V11h-8zM3 21h8v-6H3zM13 3v6h8V3z"/>',
  projetos: '<path d="M4 20V9.5C4 6 7 3 12 3s8 3 8 6.5V20z"/><path d="M4 13c4-2 8-1.5 10 1M12 3c2.5 3 3 8 1 17"/>',
  clientes: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c.7-3.5 3.3-5.5 6.5-5.5s5.8 2 6.5 5.5"/><circle cx="17.5" cy="9" r="2.5"/><path d="M17 14.5c2.4.2 4 1.8 4.5 4.5"/>',
  financeiro: '<rect x="2.5" y="5.5" width="19" height="13" rx="2"/><path d="M2.5 10h19M6.5 15h4"/>',
  orcamentos: '<path d="M6 2.5h9l4 4V21.5H6z"/><path d="M14.5 2.5V7H19M9 12h7M9 16h7"/>',
  tarefas: '<rect x="3" y="3" width="18" height="18" rx="3"/><path d="m7.5 12 3 3 6-6"/>',
  parceiros: '<path d="M3 21V9l6-4v4l6-4v4l6-4v16z"/><path d="M7 17h2M11 17h2M15 17h2"/>',
  mais: '<path d="M12 5v14M5 12h14"/>',
  voltar: '<path d="M15 5l-7 7 7 7"/>',
  editar: '<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="m13.5 6.5 4 4"/>',
  lixo: '<path d="M4 7h16M10 11v6M14 11v6M5 7l1 13h12l1-13M9 7V4h6v3"/>',
  anexo: '<path d="M20 11.5 12 19.5a5 5 0 0 1-7-7l8.5-8.5a3.3 3.3 0 0 1 4.7 4.7L9.7 17.2a1.7 1.7 0 0 1-2.4-2.4L15 7"/>',
  arquivo: '<path d="M6 2.5h8l5 5V21.5H6z"/><path d="M14 2.5v5h5"/>',
  check: '<path d="m5 12.5 4.5 4.5L19 7.5"/>',
  x: '<path d="M6 6l12 12M18 6 6 18"/>',
  menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
  sair: '<path d="M15 4h4v16h-4M10 8l-4 4 4 4M6 12h10"/>',
  calendario: '<rect x="3" y="4.5" width="18" height="16" rx="2"/><path d="M3 9.5h18M8 2.5v4M16 2.5v4"/>',
  alerta: '<path d="M12 3 2 20h20z"/><path d="M12 10v4M12 17v.5"/>',
  seta: '<path d="M9 5l7 7-7 7"/>',
  cima: '<path d="m6 15 6-6 6 6"/>',
  baixo: '<path d="m6 9 6 6 6-6"/>',
  pdf: '<path d="M6 2.5h8l5 5V21.5H6z"/><path d="M14 2.5v5h5M9 13h6M9 17h4"/>',
  quadro: '<rect x="3" y="4" width="5" height="16" rx="1"/><rect x="10" y="4" width="5" height="11" rx="1"/><rect x="17" y="4" width="4" height="7" rx="1"/>',
  lista: '<path d="M8 6h13M8 12h13M8 18h13M3.5 6h.01M3.5 12h.01M3.5 18h.01"/>',
  enviar: '<path d="M21 3 10 14M21 3l-7 18-4-7-7-4z"/>',
  busca: '<circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/>',
};
export const icone = (nome, tam = 18) =>
  `<svg class="ic" width="${tam}" height="${tam}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${IC[nome] || ''}</svg>`;

// ---------------------------------------------------------------- avisos
export function aviso(msg, tipo = 'ok') {
  const el = document.createElement('div');
  el.className = `aviso aviso-${tipo}`;
  el.textContent = msg;
  document.body.appendChild(el);
  requestAnimationFrame(() => el.classList.add('visivel'));
  setTimeout(() => { el.classList.remove('visivel'); setTimeout(() => el.remove(), 300); }, tipo === 'erro' ? 6000 : 2600);
}

// ---------------------------------------------------------------- modal
let pilha = [];
export function abrirModal({ titulo, corpo, largura = 560, rodape = '' }) {
  const fundo = document.createElement('div');
  fundo.className = 'modal-fundo';
  fundo.innerHTML = `
    <div class="modal" role="dialog" aria-modal="true" style="max-width:${largura}px">
      <div class="modal-topo"><h3>${h(titulo)}</h3>
        <button class="btn-icone" data-fechar aria-label="Fechar">${icone('x')}</button></div>
      <div class="modal-corpo">${corpo}</div>
      ${rodape ? `<div class="modal-rodape">${rodape}</div>` : ''}
    </div>`;
  document.body.appendChild(fundo);
  document.body.classList.add('com-modal');
  const fechar = () => {
    fundo.remove(); pilha = pilha.filter(f => f !== fechar);
    if (!pilha.length) document.body.classList.remove('com-modal');
  };
  pilha.push(fechar);
  fundo.addEventListener('mousedown', e => { if (e.target === fundo) fechar(); });
  fundo.querySelectorAll('[data-fechar]').forEach(b => b.addEventListener('click', fechar));
  setTimeout(() => fundo.querySelector('input:not([type=hidden]):not([type=file]),select,textarea')?.focus(), 30);
  return { el: fundo.querySelector('.modal'), fechar };
}
document.addEventListener('keydown', e => { if (e.key === 'Escape' && pilha.length) pilha[pilha.length - 1](); });

export function confirmar(msg, { ok = 'Confirmar', perigo = false } = {}) {
  return new Promise(res => {
    const m = abrirModal({
      titulo: 'Confirmação', largura: 420,
      corpo: `<p class="confirma-txt">${h(msg)}</p>`,
      rodape: `<button class="btn" data-fechar>Cancelar</button>
               <button class="btn ${perigo ? 'btn-perigo' : 'btn-primario'}" data-ok>${h(ok)}</button>`,
    });
    m.el.querySelector('[data-ok]').addEventListener('click', () => { m.fechar(); res(true); });
    m.el.querySelectorAll('[data-fechar]').forEach(b => b.addEventListener('click', () => res(false)));
  });
}

// ---------------------------------------------------------------- formulários
/**
 * Campo: { nome, rotulo, tipo: text|number|date|select|textarea|moeda|arquivo|checkbox,
 *          opcoes: [[valor, texto]], obrigatorio, largura: 'meia'|'terco', ajuda, placeholder }
 */
export function campoHTML(c, valor) {
  const id = 'f_' + c.nome;
  const req = c.obrigatorio ? 'required' : '';
  const v = valor ?? c.padrao ?? '';
  let input;
  switch (c.tipo) {
    case 'select':
      input = `<select id="${id}" name="${c.nome}" ${req}>
        ${c.vazio !== false ? `<option value="">${h(c.vazio || 'Selecione…')}</option>` : ''}
        ${(c.opcoes || []).map(([val, txt]) => `<option value="${h(val)}" ${String(val) === String(v) ? 'selected' : ''}>${h(txt)}</option>`).join('')}
      </select>`; break;
    case 'textarea':
      input = `<textarea id="${id}" name="${c.nome}" rows="${c.linhas || 3}" ${req} placeholder="${h(c.placeholder || '')}">${h(v)}</textarea>`; break;
    case 'moeda':
      input = `<div class="campo-moeda"><span>R$</span><input id="${id}" name="${c.nome}" type="number" step="0.01" min="0" inputmode="decimal" value="${h(v)}" ${req}></div>`; break;
    case 'arquivo':
      input = `<input id="${id}" name="${c.nome}" type="file" ${c.multiplo ? 'multiple' : ''} ${c.aceita ? `accept="${c.aceita}"` : ''}>`; break;
    case 'checkbox':
      return `<label class="campo campo-check ${c.largura || ''}"><input type="checkbox" name="${c.nome}" ${v ? 'checked' : ''}> ${h(c.rotulo)}</label>`;
    default:
      input = `<input id="${id}" name="${c.nome}" type="${c.tipo || 'text'}" value="${h(v)}" ${req} placeholder="${h(c.placeholder || '')}" ${c.tipo === 'number' ? 'step="any"' : ''}>`;
  }
  return `<div class="campo ${c.largura || ''}">
    <label for="${id}">${h(c.rotulo)}${c.obrigatorio ? ' <span class="obrig">*</span>' : ''}</label>
    ${input}${c.ajuda ? `<small>${h(c.ajuda)}</small>` : ''}</div>`;
}

export function lerFormulario(form, campos) {
  const fd = new FormData(form); const out = {};
  campos.forEach(c => {
    if (c.tipo === 'arquivo') out[c.nome] = c.multiplo ? [...form.elements[c.nome].files] : form.elements[c.nome].files[0] || null;
    else if (c.tipo === 'checkbox') out[c.nome] = !!form.elements[c.nome].checked;
    else if (c.tipo === 'number' || c.tipo === 'moeda') { const v = fd.get(c.nome); out[c.nome] = v === '' || v == null ? null : Number(v); }
    else out[c.nome] = (fd.get(c.nome) ?? '').toString().trim();
  });
  return out;
}

/** Abre um modal com formulário; onSalvar(dados) pode ser async. Retorna o modal. */
export function formModal({ titulo, campos, valores = {}, onSalvar, botao = 'Salvar', largura = 600, extraRodape = '' }) {
  const m = abrirModal({
    titulo, largura,
    corpo: `<form class="form-grade" novalidate>${campos.map(c => campoHTML(c, valores[c.nome])).join('')}</form>`,
    rodape: `${extraRodape}<span class="espaco"></span><button class="btn" data-fechar type="button">Cancelar</button>
             <button class="btn btn-primario" data-salvar type="button">${h(botao)}</button>`,
  });
  const form = m.el.querySelector('form');
  const btn = m.el.querySelector('[data-salvar]');
  const enviar = async () => {
    const falta = campos.find(c => c.obrigatorio && c.tipo !== 'arquivo' && !form.elements[c.nome].value.trim());
    if (falta) { aviso(`Preencha: ${falta.rotulo}`, 'erro'); form.elements[falta.nome].focus(); return; }
    btn.disabled = true; btn.textContent = 'Salvando…';
    try { await onSalvar(lerFormulario(form, campos), m); m.fechar(); }
    catch (e) { console.error(e); aviso(e.message || 'Erro ao salvar', 'erro'); btn.disabled = false; btn.textContent = botao; }
  };
  btn.addEventListener('click', enviar);
  form.addEventListener('submit', e => { e.preventDefault(); enviar(); });
  return m;
}

/** Executa uma ação async mostrando erro amigável. */
export async function tentar(fn, msgOk) {
  try { const r = await fn(); if (msgOk) aviso(msgOk); return r; }
  catch (e) { console.error(e); aviso(e.message || 'Algo deu errado', 'erro'); }
}
