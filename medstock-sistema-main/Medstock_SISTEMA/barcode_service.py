"""
barcode_service.py
==================
Cadastro Inteligente do MedStock: valida o código de barras (GTIN/EAN) e
consulta várias bases de dados ao mesmo tempo para preencher o produto.

Bases consultadas (em ordem de prioridade):
  1. Cosmos Bluesoft  -> base brasileira (EAN 789...). Precisa de token GRATUITO:
                         https://cosmos.bluesoft.com.br  (defina COSMOS_TOKEN no ambiente)
  2. Open Products Facts / Open Beauty Facts / Open Food Facts  -> abertas, sem chave
  3. UPCitemdb (plano trial, sem chave, limite diário baixo)

Dependência:  pip install requests

# $env:COSMOS_TOKEN="th8i6PVxyNMv8khJ8mvwoA"

# $env:COSMOS_TOKEN="th8i6PVxyNMv8khJ8mvwoA" 
>> python app.py
"""

import ipaddress
import os
import re
import socket
import threading
import time
import uuid
from concurrent.futures import ThreadPoolExecutor
from urllib.parse import urlparse

import requests

# ---------------------------------------------------------
# CONFIGURAÇÃO
# ---------------------------------------------------------
COSMOS_TOKEN = os.getenv("COSMOS_TOKEN", "").strip()

TIMEOUT_CONSULTA = 5          # segundos por base
CACHE_TTL = 60 * 60 * 24      # 24 horas
TAMANHO_MAX_IMAGEM = 3 * 1024 * 1024  # 3 MB

HEADERS = {
    "User-Agent": "Cosmos-API-Request",
}


# ---------------------------------------------------------
# CACHE EM MEMÓRIA (evita gastar a cota das APIs)
# ---------------------------------------------------------
_cache = {}
_cache_lock = threading.Lock()


def _cache_get(chave):
    with _cache_lock:
        item = _cache.get(chave)
        if not item:
            return None
        expira, valor = item
        if expira < time.time():
            _cache.pop(chave, None)
            return None
        return valor


def _cache_set(chave, valor):
    with _cache_lock:
        _cache[chave] = (time.time() + CACHE_TTL, valor)


# ---------------------------------------------------------
# VALIDAÇÃO DO CÓDIGO DE BARRAS
# ---------------------------------------------------------
def somente_digitos(valor):
    return re.sub(r"\D", "", valor or "")


def gtin_valido(codigo):
    """Valida EAN-8, UPC-A (12), EAN-13 e GTIN-14 pelo dígito verificador."""
    if not codigo or not codigo.isdigit() or len(codigo) not in (8, 12, 13, 14):
        return False

    digitos = [int(c) for c in codigo]
    verificador = digitos.pop()

    soma = 0
    for i, d in enumerate(reversed(digitos)):
        soma += d * (3 if i % 2 == 0 else 1)

    return (10 - soma % 10) % 10 == verificador


# ---------------------------------------------------------
# INTERPRETAÇÃO DOS DADOS (categoria / tipo)
# ---------------------------------------------------------
# palavra-chave -> categoria EXATAMENTE como está no <select> do formulário
_CATEGORIAS = [
    (("antibiotic", "amoxicilina", "azitromicina", "cefalexina"), "Antibióticos"),
    (("anti-inflamat", "ibuprofeno", "diclofenaco", "nimesulida", "cetoprofeno"), "Anti-inflamatórios"),
    (("analg", "dipirona", "paracetamol", "ácido acetilsalicílico", "acido acetilsalicilico", "aspirina", "dor"), "Analgésicos"),
    (("antialérg", "antialerg", "loratadina", "desloratadina", "cetirizina", "alergia"), "Antialérgicos"),
    (("antifúng", "antifung", "antivir", "fluconazol", "aciclovir"), "Antifúngicos e Antivirais"),
    (("gastro", "omeprazol", "pantoprazol", "antiácid", "antiacid", "sal de fruta", "estomac", "digest"), "Gastrointestinais"),
    (("anti-hipertens", "losartana", "enalapril", "captopril", "anlodipino", "atenolol"), "Anti-hipertensivos"),
    (("cardio",), "Cardiovasculares"),
    (("antidiab", "metformina", "glibenclamida", "insulina"), "Antidiabéticos"),
    (("respirat", "xarope", "tosse", "expectorante", "nasal", "bronco", "salbutamol"), "Respiratórios"),
    (("corticoide", "prednisona", "dexametasona", "betametasona"), "Corticoides"),
    (("vacina",), "Vacinas"),
    (("fitoter", "chá", "cha de", "herbal", "extrato"), "Fitoterápicos"),
    (("vitamina", "suplemento", "ômega", "omega", "colágeno", "colageno", "whey", "creatina", "cálcio", "calcio", "magnésio", "magnesio"), "Vitaminas e Suplementos"),
    (("fralda", "bebê", "bebe", "infantil", "mamadeira", "chupeta"), "Infantil e Bebês"),
    (("dermocosm", "protetor solar", "hidratante", "facial"), "Dermocosméticos"),
    (("dermat", "pomada", "creme", "antisséptic", "antisseptic"), "Dermatológicos"),
    (("shampoo", "sabonete", "desodorante", "escova", "creme dental", "pasta de dente", "absorvente", "higiene", "enxaguante", "fio dental", "cotonete"), "Higiene e Cuidados Pessoais"),
    (("colírio", "colirio", "oftalm", "otológ", "otolog"), "Oftalmológicos e Otológicos"),
    (("anticoncepcional", "ginecolog", "preservativo", "camisinha"), "Ginecologia e Saúde da Mulher"),
    (("curativo", "band-aid", "bandaid", "gaze", "atadura", "esparadrapo", "algodão", "algodao"), "First Aid e Curativos"),
    (("seringa", "agulha", "luva", "hospitalar", "cateter", "sonda"), "Materiais Hospitalares"),
    (("máscara", "mascara", "epi"), "EPIs"),
]


def _sem_acento_baixo(txt):
    import unicodedata
    txt = unicodedata.normalize("NFKD", txt or "")
    return "".join(c for c in txt if not unicodedata.combining(c)).lower()


def inferir_categoria(*textos):
    base = _sem_acento_baixo(" ".join(t for t in textos if t))
    if not base:
        return ""
    for palavras, categoria in _CATEGORIAS:
        for p in palavras:
            if _sem_acento_baixo(p) in base:
                return categoria
    return ""


def inferir_tipo_medicamento(*textos):
    base = _sem_acento_baixo(" ".join(t for t in textos if t))
    if "generico" in base:
        return "generico"
    if "similar" in base:
        return "similar"
    if "fitoterap" in base:
        return "fitoterapico"
    if "biologic" in base:
        return "biologico"
    return ""


def _limpar_nome(nome):
    nome = re.sub(r"\s+", " ", (nome or "")).strip()
    # Muitas bases devolvem TUDO EM MAIÚSCULAS: deixa legível
    if nome.isupper():
        nome = nome.title()
    return nome[:100]


def _limpar_marca(marca):
    marca = re.sub(r"\s+", " ", (marca or "")).strip()
    if "," in marca:                       # Open*Facts pode devolver "Marca A, Marca B"
        marca = marca.split(",")[0].strip()
    if marca.isupper():
        marca = marca.title()
    return marca[:100]


def _resultado(fonte, nome="", marca="", categoria_bruta="", imagem="", preco=None, extra=""):
    nome = _limpar_nome(nome)
    if not nome:
        return None
    return {
        "fonte": fonte,
        "nome": nome,
        "marca": _limpar_marca(marca),
        "categoria": inferir_categoria(categoria_bruta, nome),
        "tipo_medicamento": inferir_tipo_medicamento(nome, categoria_bruta, extra),
        "imagem_url": imagem or "",
        "preco_referencia": preco,
    }


# ---------------------------------------------------------
# FONTES
# ---------------------------------------------------------
def _get_json(url, headers=None):
    h = dict(HEADERS)
    if headers:
        h.update(headers)
    r = requests.get(url, headers=h, timeout=TIMEOUT_CONSULTA)
    if r.status_code != 200:
        return None
    return r.json()


def _fonte_cosmos(codigo):
    if not COSMOS_TOKEN:
        return None
    d = _get_json(
    f"https://cosmos.bluesoft.com.br/api/gtins/{codigo}.json",
    headers={"X-Cosmos-Token": COSMOS_TOKEN},
)
    if not d:
        return None

    marca = (d.get("brand") or {}).get("name", "")
    gpc = (d.get("gpc") or {}).get("description", "")
    ncm = (d.get("ncm") or {}).get("description", "")

    return _resultado(
        "Cosmos Bluesoft",
        nome=d.get("description", ""),
        marca=marca,
        categoria_bruta=f"{gpc} {ncm}",
        imagem=d.get("thumbnail", ""),
        preco=d.get("avg_price"),
    )


def _fonte_open_facts(dominio, rotulo):
    def consulta(codigo):
        d = _get_json(
            f"https://{dominio}/api/v2/product/{codigo}.json"
            "?fields=product_name,product_name_pt,brands,categories,image_front_url,quantity"
        )
        if not d or d.get("status") != 1:
            return None
        p = d.get("product") or {}
        nome = p.get("product_name_pt") or p.get("product_name") or ""
        qtd = p.get("quantity") or ""
        if qtd and qtd.lower() not in nome.lower():
            nome = f"{nome} {qtd}".strip()
        return _resultado(
            rotulo,
            nome=nome,
            marca=p.get("brands", ""),
            categoria_bruta=p.get("categories", ""),
            imagem=p.get("image_front_url", ""),
        )

    return consulta


def _fonte_upcitemdb(codigo):
    d = _get_json(f"https://api.upcitemdb.com/prod/trial/lookup?upc={codigo}")
    if not d or not d.get("items"):
        return None
    item = d["items"][0]
    imagens = item.get("images") or []
    preco = item.get("lowest_recorded_price") or None
    return _resultado(
        "UPCitemdb",
        nome=item.get("title", ""),
        marca=item.get("brand", ""),
        categoria_bruta=item.get("category", ""),
        imagem=imagens[0] if imagens else "",
        preco=preco,
    )


_FONTES = [
    _fonte_cosmos,
    _fonte_open_facts("world.openproductsfacts.org", "Open Products Facts"),
    _fonte_open_facts("world.openbeautyfacts.org", "Open Beauty Facts"),
    _fonte_open_facts("world.openfoodfacts.org", "Open Food Facts"),
    _fonte_upcitemdb,
]


def _executar_fonte(fonte, codigo):
    try:
        return fonte(codigo)
    except Exception:
        return None  # uma base fora do ar não pode derrubar o cadastro


# ---------------------------------------------------------
# CONSULTA PRINCIPAL
# ---------------------------------------------------------
def consultar_codigo_barras(codigo):
    """
    Consulta todas as bases em paralelo e combina os resultados:
    o campo vazio de uma base é completado pela próxima na ordem de prioridade.

    Retorna dict com nome, marca, categoria, tipo_medicamento, imagem_url,
    preco_referencia, fonte -- ou None se nenhuma base conhecer o código.
    """
    codigo = somente_digitos(codigo)

    em_cache = _cache_get(codigo)
    if em_cache is not None:
        return em_cache or None

    with ThreadPoolExecutor(max_workers=len(_FONTES)) as pool:
        futuros = [pool.submit(_executar_fonte, f, codigo) for f in _FONTES]
        resultados = [f.result() for f in futuros]   # mantém a ordem de prioridade

    resultados = [r for r in resultados if r]
    if not resultados:
        _cache_set(codigo, {})      # cache negativo (evita repetir consulta)
        return None

    final = dict(resultados[0])
    fontes = [final["fonte"]]
    for outro in resultados[1:]:
        for campo in ("marca", "categoria", "tipo_medicamento", "imagem_url", "preco_referencia"):
            if not final.get(campo) and outro.get(campo):
                final[campo] = outro[campo]
                if outro["fonte"] not in fontes:
                    fontes.append(outro["fonte"])
    final["fonte"] = " + ".join(fontes)
    final["codigo"] = codigo

    _cache_set(codigo, final)
    return final


# ---------------------------------------------------------
# DOWNLOAD SEGURO DA IMAGEM DO PRODUTO
# ---------------------------------------------------------
def _host_publico(host):
    """Bloqueia IPs internos (proteção contra SSRF)."""
    try:
        for info in socket.getaddrinfo(host, 443):
            ip = ipaddress.ip_address(info[4][0])
            if (ip.is_private or ip.is_loopback or ip.is_link_local
                    or ip.is_multicast or ip.is_reserved):
                return False
        return True
    except Exception:
        return False


def _extensao_pelo_conteudo(dados):
    if dados.startswith(b"\x89PNG\r\n\x1a\n"):
        return ".png"
    if dados.startswith(b"\xff\xd8\xff"):
        return ".jpg"
    if dados[:4] == b"RIFF" and dados[8:12] == b"WEBP":
        return ".webp"
    return None


def baixar_imagem(url, pasta_destino):
    """
    Baixa a imagem de uma URL https e salva em pasta_destino.
    Retorna o nome do arquivo salvo ou None se falhar / não for imagem válida.
    """
    try:
        p = urlparse(url or "")
        if p.scheme != "https" or not p.hostname or not _host_publico(p.hostname):
            return None

        with requests.get(url, headers=HEADERS, timeout=TIMEOUT_CONSULTA,
                          stream=True, allow_redirects=False) as r:
            if r.status_code != 200:
                return None

            conteudo = b""
            for bloco in r.iter_content(64 * 1024):
                conteudo += bloco
                if len(conteudo) > TAMANHO_MAX_IMAGEM:
                    return None

        extensao = _extensao_pelo_conteudo(conteudo)
        if not extensao:
            return None

        os.makedirs(pasta_destino, exist_ok=True)
        nome = f"{uuid.uuid4().hex}{extensao}"
        with open(os.path.join(pasta_destino, nome), "wb") as f:
            f.write(conteudo)
        return nome
    except Exception:
        return None
