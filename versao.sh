#!/bin/sh
# Marca uma nova versão em todos os arquivos JS/CSS, para o navegador
# não usar cópias antigas guardadas depois de uma atualização.
# Uso: sh versao.sh   (rode antes de enviar alterações ao GitHub)
V=$(date +%Y%m%d%H%M)
cd "$(dirname "$0")"
sed -i -E "s#(from '\.{1,2}/[^'?]+\.js)(\?v=[0-9]+)?'#\1?v=$V'#g" js/*.js js/telas/*.js
sed -i -E "s#(src=\"js/app\.js)(\?v=[0-9]+)?\"#\1?v=$V\"#; s#(href=\"css/estilo\.css)(\?v=[0-9]+)?\"#\1?v=$V\"#" index.html
echo "Versão $V aplicada"
