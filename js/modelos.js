// =====================================================================
//  MODELOS DE ETAPAS — baseados no Checklist de Desenvolvimento de
//  Projetos (ABNT NBR 16636-1, 16636-2, 16636-5 e NBR 6492).
//
//  Para alterar o caminho padrão de um tipo de projeto, edite aqui.
//  Cada etapa tem: chave, nome, dias (duração sugerida), entrega,
//  opcional (aparece como opção no cadastro) e grupos de itens.
//  Os itens de cada grupo são separados por "|".
// =====================================================================

export const CATEGORIAS = {
  arquitetonico: 'Projeto Arquitetônico',
  interiores: 'Projeto de Interiores',
  complementares: 'Projetos Complementares',
};

export const TIPOS = {
  arquitetonico: {
    residencial: 'Residencial',
    comercial: 'Comercial',
    industrial: 'Industrial',
    paginacao_piso: 'Paginação de piso',
    forro: 'Projeto de forro',
  },
  interiores: {
    residencial: 'Interiores residencial',
    comercial: 'Interiores comercial',
    industrial: 'Interiores industrial',
  },
  complementares: {
    complementares: 'Complementares (parceiros)',
  },
};

export const INTERVENCOES = { novo: 'Novo', reforma: 'Reforma', ampliacao: 'Ampliação' };

// tipos que pedem novo / reforma / ampliação
export const TIPOS_COM_INTERVENCAO = ['residencial', 'comercial', 'industrial'];

// Complementares que o escritório contrata com os engenheiros parceiros
// (aparecem para marcar no cadastro do projeto)
export const COMPLEMENTARES_PRINCIPAIS = [
  'Projeto estrutural',
  'Projeto hidrossanitário e drenagem',
  'Projeto elétrico de baixa tensão',
  'Projeto de subestação',
  'Projeto SPDA',
  'Projeto de incêndio',
];
export const DISCIPLINAS = [
  ...COMPLEMENTARES_PRINCIPAIS,
  'Fundações', 'Climatização (HVAC)', 'Gás', 'Cabeamento / Automação', 'Luminotécnico',
  'Paisagismo', 'Impermeabilização', 'Topografia', 'Sondagem', 'Outro',
];
// Serviços adicionais vendidos junto com o projeto
// registros: serviço com várias ocorrências (visitas, compras acompanhadas)
// etapa: chave da etapa opcional que o serviço inclui automaticamente no projeto
export const SERVICOS_ADICIONAIS = [
  { nome: 'Processo de alvará na prefeitura', etapa: 'licenciamento', ref: 'Nº do protocolo' },
  { nome: 'Assinatura de RRT de projeto', ref: 'Nº da RRT' },
  { nome: 'Assinatura de RRT de execução', ref: 'Nº da RRT' },
  { nome: 'Visita técnica', registros: 'visita' },
  { nome: 'Acompanhamento da obra', etapa: 'acompanhamento', registros: 'visita' },
  { nome: 'Acompanhamento de compras', registros: 'compra' },
];
export const infoServico = (nome) => SERVICOS_ADICIONAIS.find(x => x.nome === nome) || {};

/** Opções de disciplina incluindo um valor antigo que não esteja mais na lista. */
export const opcoesDisciplina = (atual) => [...DISCIPLINAS, ...(atual && !DISCIPLINAS.includes(atual) ? [atual] : [])].map(d => [d, d]);

// Fases usadas nas colunas do quadro de projetos
export const FASES = [
  { chave: 'contratacao', nome: 'Contratação' },
  { chave: 'briefing', nome: 'Briefing e levantamento' },
  { chave: 'estudo', nome: 'Estudo preliminar / 3D' },
  { chave: 'anteprojeto', nome: 'Anteprojeto' },
  { chave: 'executivo', nome: 'Executivo / Legalização' },
  { chave: 'revisao', nome: 'Compatibilização e revisão' },
  { chave: 'entrega', nome: 'Entrega e obra' },
];
// para onde cada chave de etapa vai no quadro
export const FASE_DA_CHAVE = {
  contratacao: 'contratacao', briefing: 'briefing', viabilidade: 'briefing',
  estudo: 'estudo', anteprojeto: 'anteprojeto', licenciamento: 'executivo',
  executivo: 'executivo', parceiros: 'executivo', desenvolvimento: 'executivo',
  compatibilizacao: 'revisao', revisao: 'revisao', entrega: 'entrega', acompanhamento: 'entrega',
};

// ---------------------------------------------------------------------
//  Blocos reutilizáveis
// ---------------------------------------------------------------------
const CONTRATACAO = {
  chave: 'contratacao', nome: 'Contratação', dias: 3,
  entrega: 'Contrato assinado, prazos definidos e entrada recebida.',
  grupos: {
    'Cadastro e contrato': 'Cadastrar cliente e responsáveis pelas decisões|Aprovar proposta / orçamento|Anexar contrato assinado|Definir prazos de cada fase|Programar os pagamentos (entrada, 3D, entrega final)|Receber pagamento da entrada|Emitir RRT',
  },
};

const ARQ_BRIEFING = {
  chave: 'briefing', nome: 'Levantamento de informações e briefing', dias: 10,
  entrega: 'Briefing consolidado, programa de necessidades, levantamento e relatório de condicionantes.',
  grupos: {
    '1.1 Informações do cliente': 'Identificar o cliente e os responsáveis pelas decisões|Definir o objetivo do projeto|Identificar o tipo de edificação|Definir o padrão construtivo desejado|Identificar o orçamento disponível para a obra|Estabelecer o prazo pretendido|Levantar referências arquitetônicas|Identificar necessidades específicas dos usuários',
    '1.2 Levantamento do terreno': 'Conferir dimensões e área do terreno|Verificar matrícula e documentação imobiliária|Solicitar levantamento topográfico, quando necessário|Identificar níveis e desníveis|Verificar orientação solar|Identificar direção predominante dos ventos|Registrar acessos existentes|Identificar edificações vizinhas|Identificar vegetação existente|Verificar redes públicas disponíveis|Realizar levantamento fotográfico',
    '1.3 Legislação e condicionantes': 'Consultar Plano Diretor|Consultar Código de Obras municipal|Verificar zoneamento e uso permitido|Conferir taxa de ocupação|Conferir coeficiente de aproveitamento|Verificar afastamentos obrigatórios|Conferir taxa de permeabilidade|Verificar altura máxima permitida|Verificar exigências de vagas|Identificar restrições ambientais|Verificar requisitos de acessibilidade|Identificar exigências do Corpo de Bombeiros|Identificar necessidade de licenciamento específico',
    '1.4 Programa de necessidades': 'Relacionar todos os ambientes|Definir atividades de cada ambiente|Estimar áreas necessárias|Identificar relações entre ambientes|Definir fluxos de circulação|Identificar necessidades de privacidade|Levantar equipamentos especiais|Identificar necessidades de expansão futura',
  },
};

const ARQ_VIABILIDADE = {
  chave: 'viabilidade', nome: 'Estudo de viabilidade', dias: 7, opcional: true,
  entrega: 'Relatório ou estudo de viabilidade, conforme escopo contratado.',
  grupos: {
    '2.1 Viabilidade técnica e legal': 'Avaliar potencial construtivo do terreno|Verificar possibilidade de implantação|Avaliar restrições legais|Verificar condições de acesso|Avaliar condicionantes topográficas|Identificar possíveis limitações estruturais|Identificar necessidade de estudos complementares',
    '2.2 Viabilidade econômica': 'Estimar área construída|Estimar custo preliminar da obra|Comparar custo estimado com orçamento do cliente|Identificar soluções de maior impacto financeiro|Avaliar alternativas de implantação',
  },
};

const ARQ_ESTUDO = {
  chave: 'estudo', nome: 'Estudo preliminar e apresentação 3D', dias: 20,
  entrega: 'Estudo preliminar aprovado pelo cliente.',
  grupos: {
    '3.1 Implantação': 'Definir posição da edificação|Verificar orientação solar dos ambientes|Estudar ventilação natural|Definir acessos de veículos e pedestres|Definir áreas externas|Avaliar privacidade em relação aos vizinhos|Verificar afastamentos e ocupação',
    '3.2 Organização espacial': 'Desenvolver setorização|Definir distribuição dos ambientes|Estudar circulações|Verificar dimensões preliminares|Definir relações entre áreas sociais, íntimas e de serviço|Avaliar acessibilidade e funcionalidade',
    '3.3 Concepção arquitetônica': 'Definir conceito arquitetônico|Estudar volumetria|Definir linguagem das fachadas|Estudar materiais predominantes|Avaliar soluções de cobertura|Estudar aberturas e iluminação natural|Avaliar conforto térmico',
    '3.4 Documentação e apresentação': 'Planta de implantação preliminar|Plantas baixas preliminares|Estudo volumétrico|Perspectivas ou imagens 3D, se contratadas|Quadro preliminar de áreas|Apresentação das soluções ao cliente|Registro das alterações solicitadas|Aprovação formal do estudo preliminar',
  },
};

const ARQ_ANTEPROJETO = {
  chave: 'anteprojeto', nome: 'Anteprojeto', dias: 20,
  entrega: 'Anteprojeto consolidado.',
  grupos: {
    '4.1 Desenvolvimento arquitetônico': 'Consolidar dimensões dos ambientes|Definir espessuras de paredes|Definir níveis de pisos|Definir alturas e pés-direitos|Dimensionar escadas e rampas|Definir aberturas|Definir esquadrias preliminares|Definir sistema de cobertura|Consolidar fachadas|Definir materiais principais',
    '4.2 Integração técnica': 'Definir diretrizes estruturais|Identificar espaços para instalações|Prever shafts|Definir áreas técnicas|Verificar reservatórios|Prever equipamentos de climatização|Verificar interferências entre sistemas',
    '4.3 Documentação': 'Plantas baixas cotadas|Planta de implantação|Planta de cobertura|Cortes principais|Fachadas|Quadro de áreas|Memorial descritivo preliminar, se previsto|Aprovação formal do anteprojeto',
  },
};

const ARQ_LICENCIAMENTO = {
  chave: 'licenciamento', nome: 'Projeto para licenciamento (prefeitura)', dias: 15, opcional: true,
  entrega: 'Documentação para licenciamento e, quando contratado, acompanhamento até a decisão do órgão competente.',
  grupos: {
    '5.1 Conferências': 'Conferir legislação municipal|Conferir áreas construídas|Conferir índices urbanísticos|Conferir afastamentos|Conferir acessibilidade|Conferir vagas e acessos|Conferir exigências específicas da atividade',
    '5.2 Documentação': 'Planta de situação|Planta de implantação|Plantas baixas|Cortes|Fachadas|Planta de cobertura, quando exigida|Quadro de áreas|Memorial descritivo, quando exigido|RRT correspondente|Documentação do proprietário|Protocolar projeto no órgão competente, se contratado|Acompanhar exigências e correções, se contratado',
  },
};

const ARQ_EXECUTIVO = {
  chave: 'executivo', nome: 'Projeto executivo arquitetônico', dias: 30,
  entrega: 'Projeto executivo completo para execução da obra.',
  grupos: {
    '6.1 Planta de implantação': 'Limites do terreno|Dimensões do terreno|Afastamentos|Locação da edificação|Cotas de implantação|Níveis externos|Acessos|Calçadas|Áreas permeáveis|Áreas pavimentadas|Indicação do norte',
    '6.2 Plantas baixas executivas': 'Identificação dos ambientes|Dimensões internas|Cotas externas|Cotas parciais e totais|Espessuras das paredes|Indicação das esquadrias|Sentido de abertura das portas|Níveis dos pisos|Indicação de cortes|Identificação dos detalhes|Indicação dos materiais|Identificação dos elementos construtivos|Conferência das dimensões com a estrutura',
    '6.3 Cortes executivos': 'Cotas verticais|Níveis dos pavimentos|Pés-direitos|Alturas das esquadrias|Alturas de peitoris|Espessuras das lajes, conforme projeto estrutural|Escadas e rampas|Coberturas|Forros|Impermeabilizações relevantes|Detalhes construtivos referenciados',
    '6.4 Fachadas': 'Indicação dos revestimentos|Identificação dos materiais|Definição das cores|Dimensões relevantes|Níveis|Esquadrias|Elementos decorativos|Elementos de proteção solar|Indicação de detalhes construtivos',
    '6.5 Cobertura': 'Tipo de cobertura|Inclinação|Sentido das águas|Calhas|Rufos|Cumeeiras|Beirais|Platibandas|Pontos de drenagem|Acessos para manutenção|Compatibilização com águas pluviais',
    '6.6 Esquadrias': 'Identificação de todas as esquadrias|Dimensões|Tipo de abertura|Material|Acabamento|Especificação de vidros|Peitoris|Soleiras|Ferragens, quando incluídas no escopo|Detalhes de instalação necessários',
    '6.7 Escadas e rampas': 'Larguras|Pisos e espelhos|Patamares|Inclinações|Guarda-corpos|Corrimãos|Revestimentos|Detalhes de acabamento|Compatibilização estrutural',
    '6.8 Áreas molhadas': 'Caimentos|Ralos|Desníveis|Impermeabilização|Soleiras|Revestimentos|Encontros entre materiais|Detalhes de boxes e áreas de banho',
    '6.9 Memorial e especificações': 'Descrição dos sistemas construtivos|Especificação dos materiais|Acabamentos|Revestimentos|Esquadrias|Cobertura|Critérios de execução pertinentes|Referências normativas aplicáveis',
  },
};

const COMPATIBILIZACAO_ARQ = {
  chave: 'compatibilizacao', nome: 'Compatibilização dos projetos', dias: 7,
  entrega: 'Interferências resolvidas e versões atualizadas conferidas.',
  grupos: {
    'Disciplinas': 'Arquitetônico × estrutural|Arquitetônico × hidrossanitário|Arquitetônico × elétrico|Arquitetônico × climatização|Arquitetônico × prevenção contra incêndio|Arquitetônico × paisagismo|Esquadrias × mobiliário',
    'Controle': 'Registrar interferências encontradas|Encaminhar correções aos responsáveis|Conferir versões atualizadas|Registrar conclusão da compatibilização',
  },
};

const COMPATIBILIZACAO_INT = {
  chave: 'compatibilizacao', nome: 'Compatibilização dos projetos', dias: 5,
  entrega: 'Interferências resolvidas e versões atualizadas conferidas.',
  grupos: {
    'Disciplinas': 'Interiores × elétrico|Interiores × hidráulico|Interiores × climatização|Interiores × marcenaria|Forro × iluminação|Forro × ar-condicionado|Bancadas × instalações|Esquadrias × mobiliário',
    'Controle': 'Registrar interferências encontradas|Encaminhar correções aos responsáveis|Conferir versões atualizadas|Registrar conclusão da compatibilização',
  },
};

const REVISAO = {
  chave: 'revisao', nome: 'Revisão final', dias: 5,
  entrega: 'Projeto conferido e liberado para emissão.',
  grupos: {
    'Conferência técnica': 'Conferir todas as cotas|Conferir níveis|Conferir dimensões de portas|Conferir dimensões de janelas|Conferir alturas de bancadas|Conferir alturas de tomadas|Conferir posicionamento de luminárias|Conferir circulação e ergonomia|Conferir paginações|Conferir materiais|Conferir correspondência entre plantas, cortes e vistas|Conferir detalhes construtivos|Conferir compatibilização',
    'Conferência das pranchas': 'Nome do projeto|Nome do cliente|Endereço da obra|Identificação do responsável técnico|Numeração das pranchas|Títulos dos desenhos|Escalas|Legendas|Simbologias|Data de emissão|Identificação da revisão|Referências entre pranchas|Legibilidade dos textos|Espessuras de linhas|Qualidade da impressão em PDF',
  },
};

const ENTREGA = {
  chave: 'entrega', nome: 'Entrega final do projeto', dias: 3,
  entrega: 'Projeto entregue, recebimento confirmado e versão final arquivada.',
  grupos: {
    'Entrega': 'Conferir lista de documentos contratados|Gerar PDFs finais|Verificar arquivos e páginas|Organizar arquivos por disciplina|Identificar revisão final|Entregar memoriais|Entregar especificações|Entregar arquivos editáveis, se contratados|Registrar data da entrega|Solicitar confirmação de recebimento|Arquivar versão final|Registrar eventuais pendências',
  },
};

const ACOMPANHAMENTO = {
  chave: 'acompanhamento', nome: 'Acompanhamento da execução', dias: 90, opcional: true,
  entrega: 'Serviço de acompanhamento formalmente encerrado.',
  grupos: {
    'Obra': 'Realizar reunião inicial com executores|Esclarecer dúvidas do projeto|Conferir execução em relação aos desenhos|Registrar divergências|Avaliar solicitações de alteração|Emitir revisões quando necessárias|Registrar visitas e orientações|Verificar necessidade de documentação conforme construído|Formalizar encerramento do serviço',
  },
};

// ---------------------- INTERIORES ----------------------
const INT_BRIEFING = {
  chave: 'briefing', nome: 'Briefing e levantamento', dias: 7,
  entrega: 'Briefing e levantamento cadastral.',
  grupos: {
    '1.1 Informações dos usuários': 'Identificar quem utilizará os ambientes|Levantar rotina dos usuários|Identificar necessidades funcionais|Levantar preferências estéticas|Definir estilo desejado|Identificar cores e materiais preferidos|Levantar necessidades de armazenamento|Identificar equipamentos existentes|Definir orçamento|Definir prioridades do cliente',
    '1.2 Levantamento físico': 'Medir todos os ambientes|Conferir pé-direito|Localizar portas e janelas|Medir vãos|Identificar pilares e vigas|Identificar pontos elétricos|Identificar pontos hidráulicos|Localizar equipamentos existentes|Registrar condições de pisos e revestimentos|Realizar levantamento fotográfico|Verificar necessidade de reforma',
  },
};

const INT_ESTUDO = {
  chave: 'estudo', nome: 'Estudo preliminar de interiores e apresentação 3D', dias: 20,
  entrega: 'Estudo preliminar de interiores aprovado.',
  grupos: {
    '2.1 Layout': 'Distribuir mobiliário|Conferir circulações|Verificar ergonomia|Conferir abertura de portas|Verificar espaços de utilização dos móveis|Definir áreas de armazenamento|Avaliar acessibilidade|Definir posicionamento de equipamentos',
    '2.2 Conceito': 'Definir linguagem estética|Elaborar painel de referências|Definir paleta de cores|Selecionar materiais preliminares|Definir conceito de iluminação|Estudar revestimentos|Estudar marcenaria',
    '2.3 Apresentação': 'Planta de layout|Imagens 3D, se contratadas|Painel de materiais|Apresentação ao cliente|Registro das alterações|Aprovação formal',
  },
};

const INT_ANTEPROJETO = {
  chave: 'anteprojeto', nome: 'Anteprojeto de interiores', dias: 15,
  entrega: 'Anteprojeto de interiores aprovado.',
  grupos: {
    '3.1 Desenvolvimento': 'Consolidar layout|Definir dimensões do mobiliário|Definir revestimentos|Definir paginação preliminar|Definir conceito de forro|Definir iluminação|Definir marcenaria|Definir bancadas|Definir louças e metais|Definir elementos decorativos fixos',
    '3.2 Compatibilização': 'Conferir instalações elétricas|Conferir instalações hidráulicas|Conferir climatização|Conferir interferências estruturais|Conferir alturas e espaços técnicos|Avaliar viabilidade das soluções propostas',
  },
};

const PAGINACAO_PISO_GRUPO = 'Identificar revestimentos|Especificar dimensões das peças|Definir sentido de assentamento|Definir ponto de início|Indicar juntas|Definir encontros entre materiais|Definir soleiras|Indicar rodapés|Definir desníveis|Indicar caimentos, quando aplicável|Elaborar detalhes especiais';
const FORRO_GRUPO = 'Definir tipo de forro|Indicar alturas|Definir sancas|Definir cortineiros|Indicar tabicas|Definir rebaixos|Indicar juntas e arremates|Compatibilizar com climatização|Compatibilizar com iluminação|Prever acessos de manutenção';

const INT_EXECUTIVO = {
  chave: 'executivo', nome: 'Projeto executivo de interiores', dias: 30,
  entrega: 'Executivo de interiores com detalhamentos e memorial de especificações.',
  grupos: {
    '4.1 Planta de layout executivo': 'Dimensões dos móveis|Distâncias de circulação|Identificação dos móveis|Localização dos equipamentos|Cotas de posicionamento|Identificação dos ambientes|Referências para detalhamentos',
    '4.3 Paginação de pisos': PAGINACAO_PISO_GRUPO,
    '4.4 Paginação de paredes': 'Identificar revestimentos|Definir alturas|Definir sentido de assentamento|Definir alinhamentos|Indicar encontros entre materiais|Detalhar nichos|Detalhar frisos|Detalhar painéis|Indicar arremates|Especificar rejuntes e juntas pertinentes',
    '4.5 Planta de forro': FORRO_GRUPO,
    '4.6 Projeto de iluminação': 'Definir pontos de iluminação|Identificar luminárias|Indicar posicionamento|Definir alturas de instalação|Definir circuitos e comandos propostos|Indicar iluminação decorativa|Indicar iluminação de marcenaria|Definir temperatura de cor|Definir características fotométricas necessárias|Verificar necessidade de cálculo luminotécnico|Compatibilizar com o projeto elétrico',
    '4.7 Planta de pontos elétricos': 'Localizar tomadas|Definir alturas|Localizar interruptores|Indicar pontos de TV|Indicar pontos de internet|Identificar tomadas para equipamentos|Prever pontos para marcenaria|Prever iluminação de espelhos|Prever pontos para automação|Compatibilizar com o projeto elétrico',
    '4.8 Planta de pontos hidráulicos': 'Localizar pontos de água|Localizar pontos de esgoto|Identificar pontos de água quente|Definir posições de torneiras|Definir pontos para duchas|Definir pontos para equipamentos|Conferir alturas|Compatibilizar com bancadas e marcenaria|Compatibilizar com o projeto hidrossanitário',
    '4.9 Detalhamento de marcenaria': 'Identificação do móvel|Planta|Vista frontal|Vistas laterais necessárias|Cortes|Dimensões gerais|Dimensões dos módulos|Espessuras dos materiais|Identificação dos MDFs|Acabamentos|Portas e gavetas|Sentido de abertura|Ferragens especificadas|Prateleiras|Nichos|Iluminação integrada|Passagens para instalações|Detalhes especiais|Conferência de medidas na obra antes da fabricação',
    '4.10 Detalhamento de bancadas': 'Planta|Vista frontal|Cortes|Dimensões|Alturas|Material|Espessura|Acabamento das bordas|Rodabancas|Saias|Recortes|Cubas|Metais|Emendas|Sistema de apoio|Detalhes de instalação',
    '4.11 Detalhamento de banheiros': 'Planta de layout|Paginação de piso|Paginação de paredes|Vistas internas|Detalhamento do box|Detalhamento de nichos|Detalhamento de bancadas|Detalhamento de espelhos|Detalhamento de marcenaria|Localização de louças|Localização de metais|Iluminação|Pontos elétricos|Pontos hidráulicos|Impermeabilização e caimentos, conforme escopo e projetos complementares',
    '4.12 Detalhamento de cozinhas': 'Layout executivo|Vistas internas|Marcenaria|Bancadas|Localização da cuba|Localização do cooktop|Localização dos fornos|Localização da geladeira|Localização da lava-louças|Espaços de ventilação dos equipamentos|Pontos elétricos|Pontos hidráulicos|Coifa e exaustão|Iluminação|Revestimentos|Conferência das especificações dos fabricantes',
    '4.13 Memorial de especificações': 'Relação de revestimentos|Relação de pisos|Relação de rodapés|Especificação de tintas|Especificação de MDFs|Especificação de pedras|Relação de louças|Relação de metais|Relação de luminárias|Relação de ferragens relevantes|Relação de equipamentos|Códigos, fabricantes e modelos|Quantitativos, quando contratados|Observações técnicas de instalação',
  },
};

const DEMOLIR_CONSTRUIR = 'Identificar paredes a demolir|Identificar paredes a construir|Identificar elementos a preservar|Indicar remoção de revestimentos|Identificar alterações de vãos|Identificar mudanças de níveis|Indicar interferências que exigem avaliação técnica|Compatibilizar com projetos complementares';

// ---------------------------------------------------------------------
//  Montagem do caminho de cada tipo de projeto
// ---------------------------------------------------------------------
function clonar(e) { return JSON.parse(JSON.stringify(e)); }

function arquitetonicoCompleto(tipo, intervencao) {
  const etapas = [CONTRATACAO, ARQ_BRIEFING, ARQ_VIABILIDADE, ARQ_ESTUDO, ARQ_ANTEPROJETO,
    ARQ_LICENCIAMENTO, ARQ_EXECUTIVO, COMPATIBILIZACAO_ARQ, REVISAO, ENTREGA, ACOMPANHAMENTO].map(clonar);
  const brief = etapas[1], ante = etapas[4], exec = etapas[6], lic = etapas[5];

  if (intervencao === 'reforma' || intervencao === 'ampliacao') {
    brief.grupos['1.5 Edificação existente'] = 'Levantamento cadastral (medição) da edificação existente|Verificar projeto aprovado e habite-se existentes|Identificar elementos estruturais existentes|Registrar patologias e condições da edificação|Verificar instalações existentes (elétrica, hidráulica, gás)|Levantamento fotográfico detalhado da edificação';
    ante.grupos['4.4 Demolir e construir'] = 'Planta de demolir / construir preliminar|Legenda: existente, a demolir e a construir|Validar intervenções estruturais com engenheiro';
    exec.grupos['6.10 Planta de demolição e construção'] = DEMOLIR_CONSTRUIR;
  }
  if (intervencao === 'ampliacao') {
    brief.grupos['1.5 Edificação existente'] += '|Verificar regularidade da área existente|Conferir potencial construtivo remanescente para ampliação';
    lic.grupos['5.1 Conferências'] += '|Quadro de áreas: existente + a ampliar + total';
  }
  if (tipo === 'comercial') {
    brief.grupos['1.6 Requisitos comerciais'] = 'Definir atividade e público do estabelecimento|Levantar identidade visual da marca|Definir fluxo de atendimento e de serviço|Verificar exigências da Vigilância Sanitária, se aplicável|Verificar acessibilidade (NBR 9050)|Verificar exigências para alvará de funcionamento';
  }
  if (tipo === 'industrial') {
    brief.grupos['1.6 Requisitos industriais'] = 'Levantar o processo e o fluxo produtivo|Levantar layout de máquinas e equipamentos|Verificar cargas de piso e pé-direito necessários|Prever áreas de carga e descarga e circulação de veículos|Verificar vestiários e sanitários (NR-24)|Verificar exigências de segurança do trabalho (NRs aplicáveis)|Verificar licenciamento ambiental|Verificar exigências do Corpo de Bombeiros para a atividade';
  }
  return etapas;
}

function interioresCompleto(tipo, intervencao) {
  const etapas = [CONTRATACAO, INT_BRIEFING, INT_ESTUDO, INT_ANTEPROJETO, INT_EXECUTIVO,
    COMPATIBILIZACAO_INT, REVISAO, ENTREGA, ACOMPANHAMENTO].map(clonar);
  const brief = etapas[1], exec = etapas[4];
  if (intervencao === 'reforma' || intervencao === 'ampliacao') {
    // planta de demolição e construção logo depois do layout executivo (4.1)
    const k41 = '4.1 Planta de layout executivo';
    const { [k41]: layout, ...resto } = exec.grupos;
    exec.grupos = { [k41]: layout, '4.2 Planta de demolição e construção': DEMOLIR_CONSTRUIR, ...resto };
  }
  if (tipo === 'comercial') {
    brief.grupos['1.3 Requisitos comerciais'] = 'Levantar identidade visual da marca|Definir fluxo de atendimento e de clientes|Definir áreas de exposição de produtos|Verificar acessibilidade (NBR 9050)|Verificar exigências da Vigilância Sanitária, se aplicável';
  }
  if (tipo === 'industrial') {
    brief.grupos['1.3 Requisitos industriais'] = 'Levantar áreas administrativas, refeitório e vestiários|Verificar ergonomia dos postos de trabalho (NR-17)|Verificar condições sanitárias e de conforto (NR-24)|Definir materiais de alta resistência e fácil limpeza|Verificar exigências do Corpo de Bombeiros';
  }
  return etapas;
}

function paginacaoPiso() {
  return [clonar(CONTRATACAO), {
    chave: 'briefing', nome: 'Levantamento', dias: 5, entrega: 'Ambientes medidos e revestimentos definidos.',
    grupos: { 'Levantamento': 'Medir todos os ambientes|Conferir níveis e desníveis|Localizar portas, soleiras e ralos|Definir revestimentos escolhidos pelo cliente|Conferir dimensões das peças com o fornecedor|Realizar levantamento fotográfico' },
  }, {
    chave: 'estudo', nome: 'Estudo de paginação e apresentação', dias: 7, entrega: 'Estudo de paginação aprovado.',
    grupos: { 'Estudo': 'Estudar sentido de assentamento|Estudar ponto de início e cortes|Apresentação ao cliente|Registro das alterações|Aprovação formal' },
  }, {
    chave: 'executivo', nome: 'Projeto executivo de paginação de piso', dias: 10, entrega: 'Planta de paginação executiva.',
    grupos: { 'Planta de paginação de pisos': PAGINACAO_PISO_GRUPO, 'Quantitativos': 'Quantificar peças e área por ambiente|Prever percentual de perda|Especificar rejunte e argamassa' },
  }, clonar(REVISAO), clonar(ENTREGA)];
}

function forro() {
  return [clonar(CONTRATACAO), {
    chave: 'briefing', nome: 'Levantamento', dias: 5, entrega: 'Ambientes medidos e condicionantes registradas.',
    grupos: { 'Levantamento': 'Medir todos os ambientes|Conferir pé-direito|Identificar vigas e elementos estruturais|Localizar pontos de iluminação existentes|Localizar equipamentos de ar-condicionado|Realizar levantamento fotográfico' },
  }, {
    chave: 'estudo', nome: 'Estudo de forro e apresentação', dias: 7, entrega: 'Estudo de forro aprovado.',
    grupos: { 'Estudo': 'Estudar rebaixos e sancas|Estudar integração com iluminação|Apresentação ao cliente|Registro das alterações|Aprovação formal' },
  }, {
    chave: 'executivo', nome: 'Projeto executivo de forro', dias: 10, entrega: 'Planta de forro executiva com cortes e detalhes.',
    grupos: { 'Planta de forro': FORRO_GRUPO, 'Detalhamento': 'Cortes e detalhes de sancas e cortineiros|Especificação de materiais|Quantitativos, quando contratados' },
  }, clonar(REVISAO), clonar(ENTREGA)];
}

function complementares() {
  return [clonar(CONTRATACAO), {
    chave: 'briefing', nome: 'Levantamento de dados e base arquitetônica', dias: 5, entrega: 'Base arquitetônica e informações prontas para envio.',
    grupos: { 'Dados': 'Definir disciplinas contratadas|Reunir base arquitetônica atualizada (DWG/PDF)|Reunir levantamento topográfico e sondagem, se houver|Reunir exigências do cliente e da concessionária' },
  }, {
    chave: 'parceiros', nome: 'Contratação dos engenheiros parceiros', dias: 5, entrega: 'Parceiros definidos com prazo e preço aprovados.',
    grupos: { 'Parceiros': 'Selecionar engenheiro parceiro de cada disciplina|Solicitar orçamento e prazo|Aprovar valores e prazos|Enviar base arquitetônica e informações relevantes|Registrar cada envio na aba Complementares' },
  }, {
    chave: 'desenvolvimento', nome: 'Desenvolvimento pelos parceiros', dias: 30, entrega: 'Projetos complementares recebidos.',
    grupos: { 'Acompanhamento': 'Acompanhar prazos dos parceiros|Responder dúvidas técnicas|Receber versões preliminares|Receber projetos finais e ARTs' },
  }, clonar(COMPATIBILIZACAO_ARQ), clonar(REVISAO), clonar(ENTREGA)];
}

/** Retorna a lista de etapas (com grupos de itens) para o tipo escolhido. */
export function montarModelo(categoria, tipo, intervencao) {
  if (categoria === 'interiores') return interioresCompleto(tipo, intervencao);
  if (categoria === 'complementares') return complementares();
  if (tipo === 'paginacao_piso') return paginacaoPiso();
  if (tipo === 'forro') return forro();
  return arquitetonicoCompleto(tipo, intervencao);
}

/** Transforma "a|b|c" em lista de textos. */
export function itensDoGrupo(txt) { return String(txt).split('|').map(s => s.trim()).filter(Boolean); }

// Pagamentos padrão do escritório (percentuais editáveis no cadastro)
export const PAGAMENTOS_PADRAO = [
  { descricao: 'Entrada (assinatura do contrato)', pct: 30, gatilho: 'etapa', chave: 'contratacao' },
  { descricao: 'Apresentação do 3D / estudo preliminar', pct: 30, gatilho: 'etapa', chave: 'estudo' },
  { descricao: 'Entrega final do projeto', pct: 40, gatilho: 'etapa', chave: 'entrega' },
];
