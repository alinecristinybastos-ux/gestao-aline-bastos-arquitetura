#!/bin/sh
# Marca uma nova versão em todos os arquivos JS/CSS, para o navegador
# não usar cópias antigas guardadas depois de uma atualização.
# Uso: sh versao.sh        -> só renova a marca de cache
#      sh versao.sh nova   -> também sobe o número da versão (v.30 -> v.31)
#                             e atualiza a data mostrada no menu
V=$(date +%Y%m%d%H%M)
cd "$(dirname "$0")"
if [ "$1" = "nova" ]; then
  N=$(sed -n 's/^export const VERSAO = \([0-9]*\);/\1/p' js/versao.js)
  N=$((N + 1))
  sed -i "s/^export const VERSAO = [0-9]*;/export const VERSAO = $N;/" js/versao.js
  sed -i "s#^export const DATA_VERSAO = '[^']*';#export const DATA_VERSAO = '$(date +%d/%m/%Y)';#" js/versao.js
  echo "Versão do app: v.$N"
fi
sed -i -E "s#(from '\.{1,2}/[^'?]+\.js)(\?v=[0-9]+)?'#\1?v=$V'#g" js/*.js js/telas/*.js
sed -i -E "s#(src=\"js/app\.js)(\?v=[0-9]+)?\"#\1?v=$V\"#; s#(href=\"css/estilo\.css)(\?v=[0-9]+)?\"#\1?v=$V\"#" index.html
echo "Marca de cache $V aplicada"
