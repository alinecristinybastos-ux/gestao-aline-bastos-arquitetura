// =====================================================================
//  RECIBO EM PDF — no papel do modelo "Recibo dourado"
//  Fundo (curvas + logo) em assets/recibo-fundo.jpg; os textos são
//  escritos por cima nas mesmas posições do modelo do Word.
//  Os dados pessoais (nome, CAU, CPF, PIX) ficam no banco (tabela
//  config), e não no código, porque o site é público.
// =====================================================================
import { store, porId, inserir, atualizar } from './dados.js?v=202611221742';
import { h, moeda, hoje, formModal, aviso, icone } from './util.js?v=202611221742';
import { CATEGORIAS } from './modelos.js?v=202611221742';

// ---------------------------------------------------------------- dados do escritório
export const configEscritorio = () => store.config.find(c => c.id === 'escritorio')?.dados || null;

export function formConfigRecibo(depois) {
  const c = configEscritorio() || {};
  formModal({
    titulo: 'Dados do recibo', largura: 560,
    campos: [
      { nome: 'nome', rotulo: 'Nome na assinatura', obrigatorio: true },
      { nome: 'registro', rotulo: 'Profissão e registro', placeholder: 'Ex.: Arquiteta – CAU PA A000000-0' },
      { nome: 'cpf', rotulo: 'CPF / CNPJ (linha abaixo da assinatura)', largura: 'meia' },
      { nome: 'cidade', rotulo: 'Cidade (para a data)', obrigatorio: true, largura: 'meia' },
      { nome: 'pix', rotulo: 'Bloco "PIX para pagamento" (uma informação por linha)', tipo: 'textarea', linhas: 4,
        placeholder: 'CPF: 000.000.000-00\nNOME COMPLETO\nBANCO', ajuda: 'Deixe vazio para não mostrar o PIX no recibo' },
    ],
    valores: c,
    onSalvar: async d => {
      if (store.config.find(x => x.id === 'escritorio')) await atualizar('config', 'escritorio', { dados: d });
      else await inserir('config', { id: 'escritorio', dados: d });
      aviso('Dados do recibo salvos');
      if (depois) setTimeout(depois, 50);
    },
  });
}

// ---------------------------------------------------------------- valor por extenso
const UN = ['', 'um', 'dois', 'três', 'quatro', 'cinco', 'seis', 'sete', 'oito', 'nove', 'dez', 'onze', 'doze', 'treze',
  'quatorze', 'quinze', 'dezesseis', 'dezessete', 'dezoito', 'dezenove'];
const DEZ = ['', '', 'vinte', 'trinta', 'quarenta', 'cinquenta', 'sessenta', 'setenta', 'oitenta', 'noventa'];
const CEM = ['', 'cento', 'duzentos', 'trezentos', 'quatrocentos', 'quinhentos', 'seiscentos', 'setecentos', 'oitocentos', 'novecentos'];

function ate999(n) {
  if (n === 0) return '';
  if (n === 100) return 'cem';
  const c = Math.floor(n / 100), r = n % 100, p = [];
  if (c) p.push(CEM[c]);
  if (r < 20) { if (r) p.push(UN[r]); } else { p.push(DEZ[Math.floor(r / 10)] + (r % 10 ? ' e ' + UN[r % 10] : '')); }
  return p.join(' e ');
}
function inteiroExtenso(n) {
  if (n === 0) return 'zero';
  const grupos = [];
  for (let x = n; x > 0; x = Math.floor(x / 1000)) grupos.push(x % 1000);
  const escalas = [['', ''], ['mil', 'mil'], ['milhão', 'milhões'], ['bilhão', 'bilhões']];
  // do maior para o menor; "e" antes de um grupo menor que 100 ou de centena redonda
  const partes = [];
  for (let i = grupos.length - 1; i >= 0; i--) {
    const g = grupos[i];
    if (!g) continue;
    const txt = i === 1 && g === 1 ? 'mil' : ate999(g) + (i ? ' ' + escalas[i][g === 1 ? 0 : 1] : '');
    partes.push({ txt, g });
  }
  return partes.map((p, k) => (k === 0 ? '' : (p.g < 100 || p.g % 100 === 0 ? ' e ' : ' ')) + p.txt).join('');
}
export function valorExtenso(v) {
  const centavos = Math.round(Number(v || 0) * 100);
  const reais = Math.floor(centavos / 100), cent = centavos % 100;
  const milhaoRedondo = reais >= 1000000 && reais % 1000000 === 0;
  const tr = reais ? `${inteiroExtenso(reais)}${milhaoRedondo ? ' de' : ''} ${reais === 1 ? 'real' : 'reais'}` : '';
  const tc = cent ? `${inteiroExtenso(cent)} ${cent === 1 ? 'centavo' : 'centavos'}` : '';
  return [tr, tc].filter(Boolean).join(' e ') || 'zero reais';
}

// ---------------------------------------------------------------- texto padrão
function textoReferente(r) {
  const p = porId('projetos', r.projeto_id);
  const d = String(r.descricao || '').trim();
  let parcela;
  if (/^entrada/i.test(d)) parcela = 'da entrada';
  else if (/3d|estudo preliminar/i.test(d)) parcela = 'da parcela da apresentação do 3D';
  else if (/entrega final/i.test(d)) parcela = 'da parcela da entrega final';
  else parcela = `da parcela "${d}"`;
  const servico = { arquitetonico: 'Projeto de Arquitetura', interiores: 'Projeto de Interiores', complementares: 'Projetos Complementares' }[p?.categoria] || CATEGORIAS[p?.categoria] || 'Projeto';
  return `ao pagamento ${parcela} do Contrato de prestação de serviço de ${servico}${p?.nome ? ` – ${p.nome}` : ''}`;
}

const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
const dataExtenso = (iso) => { const [a, m, d] = iso.split('-').map(Number); return `${d} de ${MESES[m - 1]} de ${a}`; };

// ---------------------------------------------------------------- janela do recibo
export function abrirRecibo(r) {
  if (!configEscritorio()) {
    aviso('Antes do primeiro recibo, preencha os dados que aparecem na assinatura.');
    return formConfigRecibo(() => abrirRecibo(r));
  }
  const p = porId('projetos', r.projeto_id);
  const cli = porId('clientes', p?.cliente_id);
  const m = formModal({
    titulo: 'Gerar recibo em PDF', largura: 620, botao: 'Gerar PDF',
    campos: [
      { nome: 'recebido_de', rotulo: 'Recebi de', obrigatorio: true },
      { nome: 'documento', rotulo: 'CPF / CNPJ do cliente (opcional)', largura: 'meia' },
      { nome: 'valor', rotulo: 'Valor', tipo: 'moeda', obrigatorio: true, largura: 'meia' },
      { nome: 'referente', rotulo: 'Referente', tipo: 'textarea', linhas: 3 },
      { nome: 'cidade', rotulo: 'Cidade', largura: 'meia' },
      { nome: 'data', rotulo: 'Data', tipo: 'date', largura: 'meia' },
      { nome: 'pix', rotulo: 'Mostrar o bloco "PIX para pagamento"', tipo: 'checkbox' },
    ],
    valores: {
      recebido_de: cli?.nome || '', documento: cli?.documento || '', valor: r.valor,
      referente: textoReferente(r), cidade: configEscritorio().cidade, data: r.pago_em || hoje(),
      pix: !!configEscritorio().pix,
    },
    extraRodape: `<button type="button" class="btn btn-leve" data-config>${icone('editar', 15)} Dados da assinatura e PIX</button>`,
    onSalvar: async d => { await gerarPdf(d); aviso('Recibo gerado'); },
  });
  m.el.querySelector('[data-config]').addEventListener('click', () => formConfigRecibo());
}

// ---------------------------------------------------------------- PDF
let libPdf = null;
function carregarJsPdf() {
  if (window.jspdf) return Promise.resolve(window.jspdf.jsPDF);
  if (libPdf) return libPdf;
  libPdf = new Promise((ok, erro) => {
    const s = document.createElement('script');
    s.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
    s.onload = () => ok(window.jspdf.jsPDF);
    s.onerror = () => { libPdf = null; erro(new Error('Não foi possível carregar o gerador de PDF. Verifique a internet.')); };
    document.head.appendChild(s);
  });
  return libPdf;
}
async function base64(url) {
  const buf = await (await fetch(url)).arrayBuffer();
  let bin = ''; const b = new Uint8Array(buf);
  for (let i = 0; i < b.length; i += 0x8000) bin += String.fromCharCode(...b.subarray(i, i + 0x8000));
  return btoa(bin);
}

const VERDE = [37, 50, 25];
const FONTE = 'Questrial';

/** Texto "em negrito": a Questrial só tem peso normal, então desenha duas vezes deslocado. */
function negrito(doc, txt, x, y, opts = {}, espessura = 0.2) {
  for (const dx of [0, espessura / 2, espessura]) doc.text(txt, x + dx, y, opts);
}

/** Parágrafo justificado com recuo na 1ª linha; trechos marcados com negrito. */
function paragrafo(doc, trechos, x, y, largura, recuo, entrelinha) {
  const palavras = [];
  trechos.forEach(t => String(t.txt).split(/\s+/).filter(Boolean).forEach(w => palavras.push({ w, b: t.b })));
  const esp = doc.getTextWidth(' ');
  const linhas = []; let atual = []; let larg = 0;
  palavras.forEach(p => {
    const wl = doc.getTextWidth(p.w) + (p.b ? 0.18 : 0);
    const max = largura - (linhas.length === 0 ? recuo : 0);
    if (atual.length && larg + esp + wl > max) { linhas.push(atual); atual = []; larg = 0; }
    larg += (atual.length ? esp : 0) + wl; atual.push({ ...p, wl });
  });
  if (atual.length) linhas.push(atual);
  linhas.forEach((ln, i) => {
    const x0 = x + (i === 0 ? recuo : 0);
    const max = largura - (i === 0 ? recuo : 0);
    const soma = ln.reduce((s, p) => s + p.wl, 0);
    const ultima = i === linhas.length - 1;
    const gap = ultima || ln.length === 1 ? esp : (max - soma) / (ln.length - 1);
    let cx = x0;
    ln.forEach(p => {
      if (p.b) negrito(doc, p.w, cx, y + i * entrelinha, { baseline: 'top' });
      else doc.text(p.w, cx, y + i * entrelinha, { baseline: 'top' });
      cx += p.wl + gap;
    });
  });
  return y + linhas.length * entrelinha;
}

export async function gerarPdf(d) {
  const cfg = configEscritorio() || {};
  const JsPDF = await carregarJsPdf();
  const doc = new JsPDF({ unit: 'mm', format: 'a4' });
  const [fundo, fonte] = await Promise.all([base64('assets/recibo-fundo.jpg'), base64('assets/Questrial-Regular.ttf')]);
  doc.addImage('data:image/jpeg;base64,' + fundo, 'JPEG', 0, 0, 210, 297);
  doc.addFileToVFS('Questrial.ttf', fonte);
  doc.addFont('Questrial.ttf', FONTE, 'normal');
  doc.setFont(FONTE, 'normal');
  doc.setTextColor(...VERDE);

  const valorTxt = moeda(d.valor).replace(/ /g, ' ');
  // título e valor
  doc.setFontSize(26);
  negrito(doc, 'RECIBO', 109.3, 45, { align: 'center', baseline: 'top' }, 0.45);
  negrito(doc, valorTxt, 193.3, 56.1, { align: 'right', baseline: 'top' }, 0.45);

  // corpo
  doc.setFontSize(14);
  const quem = d.documento ? `${d.recebido_de}, ${d.documento.replace(/\D/g, '').length > 11 ? 'CNPJ' : 'CPF'} ${d.documento},` : `${d.recebido_de},`;
  const fim = paragrafo(doc, [
    { txt: `Recebi de ${quem} a quantia de` }, { txt: valorTxt, b: true },
    { txt: `(${valorExtenso(d.valor)}), referente ${String(d.referente || '').replace(/[.\s]+$/, '')}.` },
  ], 30.3, 102.2, 164.4, 12.5, 5.95);

  const yData = Math.max(132.1, fim + 12);
  doc.text(`${d.cidade || cfg.cidade || ''}, ${dataExtenso(d.data || hoje())}.`, 112.4, yData, { align: 'center', baseline: 'top' });

  const yAss = yData + 41.8;
  [cfg.nome, cfg.registro, cfg.cpf && (/^\s*(cpf|cnpj)/i.test(cfg.cpf) ? cfg.cpf : `CPF: ${cfg.cpf}`)].filter(Boolean)
    .forEach((t, i) => doc.text(t, 109.3, yAss + i * 6, { align: 'center', baseline: 'top' }));

  if (d.pix && cfg.pix) {
    doc.setFontSize(12); doc.setTextColor(255, 0, 0);
    ['PIX PARA PAGAMENTO:', ...String(cfg.pix).split('\n').map(s => s.trim()).filter(Boolean)]
      .forEach((t, i) => doc.text(t, 25.3, 245.5 + i * 5.15, { baseline: 'top' }));
  }
  const nomeArq = `Recibo - ${d.recebido_de} - ${d.data || hoje()}.pdf`.replace(/[\\/:*?"<>|]/g, '');
  doc.save(nomeArq);
}

export const botaoRecibo = (r) => r.status === 'pago'
  ? `<button class="btn-icone" data-recibo="${h(r.id)}" title="Gerar recibo em PDF">${icone('pdf', 15)}</button>` : '';
export function ligarRecibos(raiz) {
  raiz.querySelectorAll('[data-recibo]').forEach(b => b.addEventListener('click', e => {
    e.stopPropagation(); abrirRecibo(porId('recebimentos', b.dataset.recibo));
  }));
}
