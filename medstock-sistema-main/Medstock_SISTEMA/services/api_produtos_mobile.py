
# ============================================================
# API MOBILE - PRODUTOS MEDSTOCK
# Flask + MySQL
# ============================================================

from decimal import Decimal, InvalidOperation
import re

import mysql.connector
from flask import Blueprint, jsonify, request, current_app

from core.database import conectar_banco


mobile_produtos = Blueprint("mobile_produtos", __name__)


TIPOS_MEDICAMENTO = {
    "referencia",
    "generico",
    "similar",
    "biologico",
    "fitoterapico",
    "outros",
}


# ============================================================
# CONEXÃO COM O BANCO
# ============================================================

def conectar():
    # Utiliza a conexão já configurada no projeto MEDSTOCK.
    return conectar_banco.connect()


# ============================================================
# RESPOSTAS DE ERRO
# ============================================================

def erro(mensagem, status=400):
    return jsonify({
        "sucesso": False,
        "erro": mensagem
    }), status


# ============================================================
# CONVERSÃO DE VALORES
# ============================================================

def converter_inteiro(valor, padrao=None):
    if valor is None or valor == "":
        if padrao is not None:
            return padrao
        raise ValueError("Valor inteiro obrigatório.")

    if isinstance(valor, bool):
        raise ValueError("Valor inteiro inválido.")

    numero = Decimal(str(valor))

    if not numero.is_finite() or numero != numero.to_integral_value():
        raise ValueError("Informe um número inteiro válido.")

    return int(numero)


def converter_preco(valor):
    if valor is None or valor == "":
        raise ValueError("Informe os preços de custo e venda.")

    numero = Decimal(str(valor))

    if not numero.is_finite():
        raise ValueError("Preço inválido.")

    if numero <= 0:
        raise ValueError("Os preços devem ser maiores que zero.")

    if numero.as_tuple().exponent < -2:
        raise ValueError("Informe preços com até duas casas decimais.")

    return numero.quantize(Decimal("0.01"))


# ============================================================
# CONSULTA DE PRODUTO PELO CÓDIGO DE BARRAS
# GET /api/produtos/codigo/<codigo>
# ============================================================

@mobile_produtos.route(
    "/api/produtos/codigo/<codigo>",
    methods=["GET"]
)
def produto_por_codigo(codigo):
    if not re.fullmatch(r"\d{8,14}", codigo):
        return erro("Código de barras inválido.", 400)

    conn = None
    cur = None

    try:
        conn = conectar()
        cur = conn.cursor(dictionary=True)

        cur.execute(
            """
            SELECT
                p.id,
                p.nome,
                p.marca,
                p.codigo_barras,
                p.categoria,
                p.quantidade_estoque,
                p.estoque_minimo,
                p.preco_custo,
                p.preco_venda,
                p.tipo_medicamento,
                p.fornecedor_id,
                p.ativo
            FROM produto AS p
            WHERE p.codigo_barras = %s
            LIMIT 1
            """,
            (codigo,)
        )

        linha = cur.fetchone()

        if not linha:
            return jsonify({
                "sucesso": True,
                "produto": None,
                "mensagem": "Produto não encontrado no estoque."
            }), 200

        produto = {
            "id": linha["id"],
            "nome": linha["nome"],
            "marca": linha["marca"],
            "codigo_barras": linha["codigo_barras"],
            "categoria": linha["categoria"],
            "quantidade_estoque": linha["quantidade_estoque"],
            "estoque_minimo": linha["estoque_minimo"],
            "preco_custo": float(linha["preco_custo"] or 0),
            "preco_venda": float(linha["preco_venda"] or 0),
            "tipo_medicamento": linha["tipo_medicamento"],
            "fornecedor_id": linha["fornecedor_id"],
            "ativo": bool(linha["ativo"])
        }

        return jsonify({
            "sucesso": True,
            "produto": produto
        }), 200

    except Exception:
        current_app.logger.exception(
            "Erro ao consultar produto por código de barras."
        )
        return erro("Não foi possível consultar o produto.", 500)

    finally:
        if cur:
            cur.close()
        if conn:
            conn.close()


# ============================================================
# LISTAGEM DE FORNECEDORES
# GET /api/mobile/fornecedores
# ============================================================



@mobile_produtos.route(
    "/api/mobile/fornecedores",
    methods=["GET"]
)
def listar_fornecedores():
    conn = None
    cur = None

    try:
        conn = conectar()
        cur = conn.cursor(dictionary=True)

        cur.execute("""
            SELECT id, nome_fornecedor
            FROM fornecedor
            ORDER BY nome_fornecedor
        """)

        linhas = cur.fetchall()

        fornecedores = [
            {
                "id": item["id"],
                "nome": item["nome_fornecedor"],
                "nome_fornecedor": item["nome_fornecedor"]
            }
            for item in linhas
        ]

        return jsonify({
            "sucesso": True,
            "fornecedores": fornecedores
        }), 200

    except Exception:
        current_app.logger.exception(
            "Erro ao carregar fornecedores do MEDSTOCK"
        )

        return jsonify({
            "sucesso": False,
            "erro": "Erro ao consultar fornecedores."
        }), 500

    finally:
        if cur:
            cur.close()
        if conn:
            conn.close()

# ============================================================
# CADASTRO DE PRODUTO
# POST /api/produtos
# ============================================================

@mobile_produtos.route(
    "/api/produtos",
    methods=["POST"]
)
def cadastrar_produto():
    dados = request.get_json(silent=True)

    if not isinstance(dados, dict):
        return erro("Envie os dados do produto em formato JSON.", 400)

    nome = str(dados.get("nome") or "").strip()
    categoria = str(dados.get("categoria") or "").strip()
    marca = str(dados.get("marca") or "").strip() or None
    codigo = str(dados.get("codigo_barras") or "").strip() or None

    if not nome:
        return erro("Informe o nome do produto.")

    if not categoria:
        return erro("Informe a categoria do produto.")

    if codigo and not re.fullmatch(r"\d{8,14}", codigo):
        return erro(
            "Código de barras inválido. Informe de 8 a 14 dígitos."
        )

    try:
        fornecedor_id = converter_inteiro(
            dados.get("fornecedor_id")
        )
        quantidade = converter_inteiro(
            dados.get("quantidade_estoque"), 0
        )
        estoque_minimo = converter_inteiro(
            dados.get("estoque_minimo"), 0
        )

        preco_custo = converter_preco(dados.get("preco_custo"))
        preco_venda = converter_preco(dados.get("preco_venda"))

    except (ValueError, InvalidOperation, TypeError):
        return erro(
            "Verifique o fornecedor, as quantidades e os preços."
        )

    if fornecedor_id <= 0:
        return erro("Selecione um fornecedor válido.")

    if quantidade < 0 or estoque_minimo < 0:
        return erro(
            "O estoque e o estoque mínimo não podem ser negativos."
        )

    tipo = str(
        dados.get("tipo_medicamento") or "outros"
    ).strip().lower()

    if tipo not in TIPOS_MEDICAMENTO:
        return erro("Tipo de medicamento inválido.")

    conn = None
    cur = None

    try:
        conn = conectar()
        cur = conn.cursor(dictionary=True)

        # Confere se o fornecedor existe e está ativo.
        cur.execute(
            """
            SELECT id
            FROM fornecedor
            WHERE id = %s AND ativo = TRUE
            LIMIT 1
            """,
            (fornecedor_id,)
        )

        if not cur.fetchone():
            return erro("Fornecedor não encontrado ou inativo.", 400)

        # Evita cadastrar o mesmo código de barras duas vezes.
        if codigo:
            cur.execute(
                """
                SELECT id
                FROM produto
                WHERE codigo_barras = %s
                LIMIT 1
                """,
                (codigo,)
            )

            if cur.fetchone():
                return erro(
                    "Já existe um produto com este código de barras.",
                    409
                )

        # Não inclui data_validade porque essa coluna não
        # consta no esquema de produto informado.
        cur.execute(
            """
            INSERT INTO produto (
                fornecedor_id,
                nome,
                codigo_barras,
                marca,
                categoria,
                quantidade_estoque,
                estoque_minimo,
                preco_custo,
                preco_venda,
                tipo_medicamento,
                ativo
            )
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, TRUE)
            """,
            (
                fornecedor_id,
                nome,
                codigo,
                marca,
                categoria,
                quantidade,
                estoque_minimo,
                preco_custo,
                preco_venda,
                tipo
            )
        )

        novo_id = cur.lastrowid
        conn.commit()

        return jsonify({
            "sucesso": True,
            "mensagem": "Produto cadastrado com sucesso.",
            "id": novo_id
        }), 201

    except mysql.connector.IntegrityError as exc:
        if conn:
            conn.rollback()

        if exc.errno == 1062:
            return erro(
                "Já existe um produto com este código de barras.",
                409
            )

        mobile_produtos.logger.exception(
            "Erro de integridade ao cadastrar produto."
        )
        return erro("Não foi possível cadastrar o produto.", 500)

    except Exception:
        if conn:
            conn.rollback()

        mobile_produtos.logger.exception(
            "Erro ao cadastrar produto pelo aplicativo."
        )
        return erro("Não foi possível cadastrar o produto.", 500)

    finally:
        if cur:
            cur.close()
        if conn:
            conn.close()
