# Importações FLASK =========
from flask import Flask, jsonify, request, url_for, render_template, redirect, flash, session
#============================

# Importações Criptografia ===
import os
from werkzeug.utils import secure_filename
from core.seguranca import login_obrigatorio, gerar_hash_senha
#============================

# Importações CLASSES =======
from core.database import conectar_banco
from models.cliente import Cliente
from models.produto import Produto
from models.entrada import PedidoEntrada
from models.saida import PedidoSaida
from models.fornecedor import Fornecedor
from models.cliente_cadastro import ClientesCadastro
from models.movimentacao import Movimentacao
#============================

# Importações E-MAIL ========
from email.mime.text import MIMEText # Texto no email
from email.mime.image import MIMEImage # Imagem no email
from email.mime.multipart import MIMEMultipart
import smtplib #Simple Mail Transfer Protocol - protocolo para enviar e-mail pela internet
#============================

# OUTRAS Importações ========
import uuid
import random
from datetime import datetime, date
import re
#re.sub() → substitui partes de um texto.
#r'\D' - "qualquer caractere que NÃO seja número".
#'' - substitui por vazio (remove).
#"123.456.789-01" - texto original.
#============================

from flask_cors import CORS

app = Flask(__name__)
CORS(app)
app.secret_key = "Medstock_programa_de_estoque_123456"

#! = Feito pela -- Ana Beatriz // linha 1 a 1880 𖹭.ᐟ

UPLOAD_FOLDER = "static/uploads/produtos"

app.config["UPLOAD_FOLDER"] = UPLOAD_FOLDER

os.makedirs(UPLOAD_FOLDER, exist_ok=True)


# TRANSFORMA DADOS ============
# inteiro
def to_int(value, default=0):
    try:
        return int(value)
    except (TypeError, ValueError):
        return default

# decimal
def to_float(value, default=0.0):
    try:
        return float(value)
    except (TypeError, ValueError):
        return default
# ===============================

# ======================= API LOGIN =====================
@app.route("/api/cliente/login", methods=["POST"])
def api_cliente_login():

    try:
        dados = request.get_json()

        if not dados:
            return jsonify({
                "sucesso": False,
                "erro": "Nenhum dado foi enviado."
            }), 400

        email = dados.get("email")
        senha = dados.get("senha")

        if not email or not senha:
            return jsonify({
                "sucesso": False,
                "erro": "Informe o email e a senha."
            }), 400

        # Usa a mesma autenticação do Desktop
        cliente = Cliente.autenticar(email, senha)

        if cliente:

            return jsonify({
                "sucesso": True,
                "mensagem": "Login realizado com sucesso!",

                "cliente": {
                    "id": cliente["id"],
                    "nome": cliente["nome"],
                    "email": cliente.get("email")
                }
            }), 200

        return jsonify({
            "sucesso": False,
            "erro": "Email ou senha inválidos!"
        }), 401

    except Exception as e:

        print("ERRO API LOGIN:", e)

        return jsonify({
            "sucesso": False,
            "erro": "Erro interno do servidor."
        }), 500


# ==========================================================
# API - PERFIL DO CLIENTE
# ==========================================================

@app.route("/api/cliente/perfil", methods=["GET"])
def api_cliente_perfil():

    try:

        cliente_id = request.args.get("id")

        if not cliente_id:
            return jsonify({
                "sucesso": False,
                "erro": "ID do cliente não informado."
            }), 400

        try:
            cliente_id = int(cliente_id)
        except ValueError:
            return jsonify({
                "sucesso": False,
                "erro": "ID do cliente inválido."
            }), 400

        cliente = Cliente.seleciona_por_id(cliente_id)

        if not cliente:
            return jsonify({
                "sucesso": False,
                "erro": "Cliente não encontrado."
            }), 404

        return jsonify({
            "sucesso": True,
            "cliente": {
                "id": cliente["id"],
                "nome": cliente.get("nome"),
                "email": cliente.get("email"),
                "cpf": cliente.get("cpf")
            }
        }), 200

    except Exception as e:

        print("ERRO API PERFIL:", e)

        return jsonify({
            "sucesso": False,
            "erro": "Erro interno do servidor."
        }), 500

# ======================= API DASHBOARD =====================
@app.route("/api/dashboard", methods=["GET"])
def api_dashboard():

    try:
        conn = conectar_banco.connect()
        cursor = conn.cursor(dictionary=True)

        # ==========================================================
        # PRODUTOS
        # ==========================================================

        cursor.execute("""
            SELECT
                COUNT(*) AS total_produtos,

                SUM(
                    CASE
                        WHEN quantidade_estoque > estoque_minimo
                        THEN 1
                        ELSE 0
                    END
                ) AS estoque_normal,

                SUM(
                    CASE
                        WHEN quantidade_estoque > 0
                         AND quantidade_estoque <= estoque_minimo
                        THEN 1
                        ELSE 0
                    END
                ) AS estoque_baixo,

                SUM(
                    CASE
                        WHEN quantidade_estoque <= 0
                        THEN 1
                        ELSE 0
                    END
                ) AS estoque_critico,

                COALESCE(
                    SUM(quantidade_estoque * preco_custo),
                    0
                ) AS valor_custo,

                COALESCE(
                    SUM(quantidade_estoque * preco_venda),
                    0
                ) AS valor_venda

            FROM produto
            WHERE ativo = TRUE
        """)

        estoque = cursor.fetchone()

        total_produtos = int(estoque["total_produtos"] or 0)
        estoque_normal = int(estoque["estoque_normal"] or 0)
        estoque_baixo = int(estoque["estoque_baixo"] or 0)
        estoque_critico = int(estoque["estoque_critico"] or 0)

        valor_custo = float(estoque["valor_custo"] or 0)
        valor_venda = float(estoque["valor_venda"] or 0)

        lucro_potencial = valor_venda - valor_custo

        # ==========================================================
        # PEDIDOS DE ENTRADA
        # ==========================================================

        cursor.execute("""
            SELECT
                COUNT(*) AS total,

                SUM(
                    CASE
                        WHEN status = 'PROCESSADO'
                        THEN 1
                        ELSE 0
                    END
                ) AS processados,

                SUM(
                    CASE
                        WHEN status = 'PENDENTE'
                        THEN 1
                        ELSE 0
                    END
                ) AS pendentes,

                SUM(
                    CASE
                        WHEN status = 'CANCELADO'
                        THEN 1
                        ELSE 0
                    END
                ) AS cancelados

            FROM entrada
        """)

        entrada = cursor.fetchone()

        pedidos_entrada = {
            "total": int(entrada["total"] or 0),
            "processados": int(entrada["processados"] or 0),
            "pendentes": int(entrada["pendentes"] or 0),
            "cancelados": int(entrada["cancelados"] or 0)
        }

        # ==========================================================
        # PEDIDOS DE SAÍDA
        # ==========================================================

        cursor.execute("""
            SELECT
                COUNT(*) AS total,

                SUM(
                    CASE
                        WHEN status = 'PROCESSADO'
                        THEN 1
                        ELSE 0
                    END
                ) AS processados,

                SUM(
                    CASE
                        WHEN status = 'PENDENTE'
                        THEN 1
                        ELSE 0
                    END
                ) AS pendentes,

                SUM(
                    CASE
                        WHEN status = 'CANCELADO'
                        THEN 1
                        ELSE 0
                    END
                ) AS cancelados

            FROM saida
        """)

        saida = cursor.fetchone()

        pedidos_saida = {
            "total": int(saida["total"] or 0),
            "processados": int(saida["processados"] or 0),
            "pendentes": int(saida["pendentes"] or 0),
            "cancelados": int(saida["cancelados"] or 0)
        }

        # ==========================================================
        # PRODUTOS COM ESTOQUE BAIXO
        # ==========================================================

        cursor.execute("""
            SELECT
                id,
                nome,
                quantidade_estoque,
                estoque_minimo
            FROM produto
            WHERE ativo = TRUE
              AND quantidade_estoque > 0
              AND quantidade_estoque <= estoque_minimo
            ORDER BY quantidade_estoque ASC
        """)

        produtos_baixo_db = cursor.fetchall()

        produtos_baixo = []

        for p in produtos_baixo_db:

            quantidade = int(p["quantidade_estoque"] or 0)
            minimo = int(p["estoque_minimo"] or 0)

            if quantidade <= 0:
                situacao = "Sem estoque"
            else:
                situacao = "Estoque baixo"

            produtos_baixo.append({
                "id": p["id"],
                "produto": p["nome"],
                "quantidade": quantidade,
                "minimo": minimo,
                "situacao": situacao
            })

        # ==========================================================
        # PRODUTOS CRÍTICOS
        # ==========================================================

        cursor.execute("""
            SELECT
                id,
                nome,
                quantidade_estoque,
                estoque_minimo
            FROM produto
            WHERE ativo = TRUE
              AND quantidade_estoque <= 0
            ORDER BY nome ASC
        """)

        produtos_criticos_db = cursor.fetchall()

        produtos_criticos = []

        for p in produtos_criticos_db:
            produtos_criticos.append({
                "id": p["id"],
                "produto": p["nome"],
                "quantidade": int(p["quantidade_estoque"] or 0),
                "minimo": int(p["estoque_minimo"] or 0)
            })

        # ==========================================================
        # FECHAR BANCO
        # ==========================================================

        cursor.close()
        conn.close()

        # ==========================================================
        # RESPOSTA
        # ==========================================================

        return jsonify({
            "sucesso": True,

            "totalProdutos": total_produtos,

            "estoqueNormal": estoque_normal,

            "estoqueBaixo": estoque_baixo,

            "estoqueCritico": estoque_critico,

            "valorCusto": valor_custo,

            "valorVenda": valor_venda,

            "lucroPotencial": lucro_potencial,

            "pedidosEntrada": pedidos_entrada,

            "pedidosSaida": pedidos_saida,

            "produtosBaixo": produtos_baixo,

            "produtosCriticos": produtos_criticos
        })

    except Exception as e:

        print("ERRO API DASHBOARD:", e)

        return jsonify({
            "sucesso": False,
            "erro": str(e)
        }), 500


@app.route("/api/movimentacoes", methods=["GET"])
def api_movimentacoes():

    try:
        conn = conectar_banco.connect()
        cursor = conn.cursor(dictionary=True)

        sql = """
            SELECT
                m.id,
                m.tipo,
                m.quantidade,
                m.valor_total,
                m.data_mov,

                p.nome AS produto,

                f.nome_fornecedor AS fornecedor,

                c.nome AS cliente

            FROM movimentacao m

            LEFT JOIN produto p
                ON m.produto_id = p.id

            LEFT JOIN fornecedor f
                ON m.fornecedor_id = f.id

            LEFT JOIN clientes_cadastro c
                ON m.cliente_id = c.id

            ORDER BY m.data_mov DESC
        """

        cursor.execute(sql)

        movimentacoes = cursor.fetchall()

        resultado = []

        for item in movimentacoes:

            # Entrada → fornecedor
            if item["tipo"] == "Entrada":
                parceiro = item["fornecedor"]

            # Saída → cliente
            else:
                parceiro = item["cliente"]

            resultado.append({
                "id": item["id"],
                "tipo": item["tipo"],
                "produto": item["produto"] or "Produto não encontrado",
                "parceiro": parceiro or "Não informado",
                "quantidade": item["quantidade"],
                "valor": float(item["valor_total"] or 0),
                "data": (
                    item["data_mov"].strftime("%d/%m/%Y")
                    if item["data_mov"]
                    else ""
                )
            })

        cursor.close()
        conn.close()

        return jsonify({
            "sucesso": True,
            "movimentacoes": resultado
        })

    except Exception as e:

        return jsonify({
            "sucesso": False,
            "erro": str(e)
        }), 500
#=========================================================


# ======================= ROTAS =====================

# TELA DE ERRO 404 ===============
@app.errorhandler(404)
def pagina_nao_encontrada(error):
    return render_template("404.html"), 404
#==============================================

# LANDING PAGE ===============
@app.route("/lp")
def lp():
    return render_template("index.html")
#==============================================

# TELA DE CADASTRO ===============
@app.route("/")
def index():
    if "cliente_id" in session:
        return redirect(url_for("tela_inicial"))
    return render_template("index.html")
#==============================================

# TELA DE CADASTRO ===============
@app.route("/cadastro")
def tela_cadastro():
    return render_template("tela_cadastro.html") 
#==============================================

# TELA DE LOGIN ===============
@app.route("/entrar")
def tela_login():
    return render_template("tela_login.html")
#==============================================

# TELA HOME ===============
@app.route("/home")
def tela_home():
    cliente_id = session.get("cliente_id")
    return render_template("tela_home.html", cliente=Cliente.seleciona_por_id(cliente_id))
#==============================================

# LOGIN DO USUÁRIO ===============
@app.context_processor
def carregar_cliente():
    cliente_id = session.get("cliente_id")
    if cliente_id:
        cliente = Cliente.seleciona_por_id(cliente_id)
    else:
        cliente = None
    return dict(cliente=cliente)
#==============================================

@app.context_processor
def carregar_notificacoes():

    produtos = Produto.seleciona_todos_produtos()

    notificacoes = []

    for produto in produtos:

        if produto["quantidade_estoque"] == 0:
            notificacoes.append({
                "tipo": "vermelho",
                "titulo": "Fora de Estoque",
                "mensagem": f'{produto["nome"]} está fora de estoque'
            })

        elif produto["quantidade_estoque"] <= produto["estoque_minimo"]:
            notificacoes.append({
                "tipo": "amarelo",
                "titulo": "Alerta",
                "mensagem": f'{produto["nome"]} está com estoque baixo'
            })

    return dict(notificacoes=notificacoes)

# TELA INICIAL ===============
@app.route("/inicial")
def tela_inicial():
    cliente_id = session.get("cliente_id")

    produtos = Produto.seleciona_todos_produtos()
    slc_prod = len(produtos)

    entradas = PedidoEntrada.historico_entrada()
    saidas = PedidoSaida.historico_saida()

    entradas_pendentes = 0
    saidas_pendentes = 0

    for entrada in entradas:
        if entrada["status"] == "PENDENTE":
            entradas_pendentes += 1

    for saida in saidas:
        if saida["status"] == "PENDENTE":
            saidas_pendentes += 1

    return render_template(
        "tela_inicial.html",
        cliente=Cliente.seleciona_por_id(cliente_id),
        slc_prod=slc_prod,
        entradas_pendentes=entradas_pendentes,
        saidas_pendentes=saidas_pendentes
    )
#==============================================

# TELA DASHBOARD ===============
@app.route("/dashboard")
def tela_dashboard():
    # ==========================
    # PRODUTOS
    # ==========================

    produtos = Produto.seleciona_todos_produtos()
    produtos_baixos = Produto.seleciona_produtos_estoque_baixo()

    total_produtos = len(produtos)
    estoque_baixo = len(produtos_baixos)
    estoque_normal = total_produtos - estoque_baixo

    total_estoque = estoque_baixo + estoque_normal

    if total_estoque > 0:
        percentual_baixo = round((estoque_baixo / total_estoque) * 100)
    else:
        percentual_baixo = 0


# PEDIDOS DE ENTRADAS ====================================
    status_entrada = PedidoEntrada.status_pedido_entrada()
    if not status_entrada:
        status_entrada = {
            "processados": 0,
            "pendentes": 0,
            "cancelados": 0,
            "total_status": 0,
            "percentual_processado": 0,
            "percentual_pendente": 0,
            "percentual_cancelado": 0
        }
# =====================================================

# PEDIDOS DE SAIDA SAÍDAS ==============================================
    status_saida = PedidoSaida.status_pedido_saida()
    if not status_saida:
        status_saida = {
            "processados": 0,
            "pendentes": 0,
            "cancelados": 0,
            "total_status": 0,
            "percentual_processado": 0,
            "percentual_pendente": 0,
            "percentual_cancelado": 0
        }

# ESTOQUE CRITICO ========================================
    estoque_critico = Produto.estoque_critico()

    if estoque_critico:
        total_criticos = estoque_critico[0]["total_criticos"]
    else:
        total_criticos = 0
# =======================================================

# ================= VALOR FINANCEIRO DO ESTOQUE =================
    valores_financeiros = Produto.valores_financeiros_estoque()

    if not valores_financeiros:
        valores_financeiros = {
            "valor_custo": 0,
            "valor_venda": 0,
            "lucro_potencial": 0
        }


    return render_template( "tela_dashboard.html",

        total_produtos=total_produtos,
        estoque_baixo=estoque_baixo,
        estoque_normal=estoque_normal,
        percentual_baixo=percentual_baixo,
        status_entrada=status_entrada,
        status_saida=status_saida,
        produtos_baixos=produtos_baixos,
        estoque_critico=estoque_critico,
        total_criticos=total_criticos,
        valores_financeiros=valores_financeiros,
    )

#==============================================

# TELA HISTORICO DE FORNECEDOR ===============
@app.route("/historico/fornecedor")
def tela_historico_de_fornecedor():
    return render_template("tela_historico_de_fornecedor.html", fornecedores = Fornecedor.seleciona_todos_fornecedores()) 
#==============================================

# TELA HISTORICO DE CLIENTE ===============
@app.route("/historico/cliente")
def tela_historico_de_cliente():
    cliente_id = session.get("cliente_id")
    return render_template("tela_historico_de_cliente.html", clientes = ClientesCadastro.seleciona_todos_clientescadastro(), cliente = Cliente.seleciona_por_id(cliente_id)) 
#==============================================

# TELA CADASTRO DE FORNECEDOR ===============
@app.route("/cadastro/fornecedor")
def tela_cadastro_de_fornecedor():
    cliente_id = session.get("cliente_id")
    return render_template("tela_cadastro_de_fornecedor.html", cliente = Cliente.seleciona_por_id(cliente_id)) 
#==============================================

# TELA CLIENTES CADASTRO ===============
@app.route("/cadastro/clientescadastro")
def tela_clientes_cadastro():
    cliente_id = session.get("cliente_id")
    return render_template("tela_clientes_cadastro.html", cliente = Cliente.seleciona_por_id(cliente_id)) 
#==============================================

# TELA CADASTRO PRODUTO==============
@app.route("/cadastro/produto")
def tela_cadastro_produto():
    cliente_id = session.get("cliente_id")
    return render_template("tela_cadastro_produto.html", fornecedores = Fornecedor.seleciona_todos_fornecedores() , cliente = Cliente.seleciona_por_id(cliente_id), produto = None)
#==============================================

# TELA PRODUTO==============
@app.route("/produto")
def tela_produtos():
    cliente_id = session.get("cliente_id")
    fornecedor_id = request.args.get("fornecedor_id")
    estoque = request.args.get("estoque")
    # LISTA DE FORNECEDORES
    fornecedores = Fornecedor.seleciona_tudo()
    # FILTRO
    if fornecedor_id:
        produtos = Produto.seleciona_por_fornecedor(fornecedor_id)
    else:
        produtos = Produto.seleciona_todos_produtos()
    # ADICIONA O FORNECEDOR EM CADA PRODUTO
    for produto in produtos:
        if "fornecedor_id" in produto and produto["fornecedor_id"]:
            produto["fornecedor"] = Fornecedor.seleciona_por_id(produto["fornecedor_id"])
        else:
            produto["fornecedor"] = None
        # filtro de estoque
    if estoque == "baixo":
        produtos = [
            p for p in produtos
            if p["quantidade_estoque"] <= p["estoque_minimo"]
        ]

    elif estoque == "normal":
        produtos = [
            p for p in produtos
            if p["quantidade_estoque"] > p["estoque_minimo"]
        ]
    return render_template("tela_produtos.html", produtos=produtos,fornecedores=fornecedores, fornecedor_selecionado=fornecedor_id, estoque_selecionado=estoque, cliente = Cliente.seleciona_por_id(cliente_id))
#==============================================

# TELA ENTRADA==============
@app.route("/pedido/entrada")
def tela_entrada():
    cliente_id = session.get("cliente_id")
    produto = request.args.get("produto")
    fornecedor = request.args.get("fornecedor")
    status = request.args.get("status")

    entradas = PedidoEntrada.historico_entrada()

    # filtros
    if produto:
        entradas = [
            e for e in entradas
            if e["nome"] == produto
        ]

    if fornecedor:
        entradas = [
            e for e in entradas
            if e["nome_fornecedor"] == fornecedor
        ]

    if status:
        entradas = [
            e for e in entradas
            if e["status"] == status
        ]

    # listas para popular os selects
    produtos_filtro = []
    fornecedores_filtro = []

    historico = PedidoEntrada.historico_entrada()

    for item in historico:
        if not any(p["nome"] == item["nome"] for p in produtos_filtro):
            produtos_filtro.append({"nome": item["nome"]})

        if not any(
            f["nome_fornecedor"] == item["nome_fornecedor"]
            for f in fornecedores_filtro
        ):
            fornecedores_filtro.append({
                "nome_fornecedor": item["nome_fornecedor"]
            })

    return render_template("tela_entrada.html", entradas=entradas,produtos_filtro=produtos_filtro ,fornecedores_filtro=fornecedores_filtro, produto_selecionado=produto, fornecedor_selecionado=fornecedor, status_selecionado=status, cliente = Cliente.seleciona_por_id(cliente_id))
#==============================================

# TELA ENTRADA FORNECEDOR ESPECIFICO==============
@app.route("/pedido/entrada/fornecedor/<int:fornecedor_id>")
def tela_pedidos_fornecedor(fornecedor_id):
    cliente_id = session.get("cliente_id")
    entradas = PedidoEntrada.seleciona_por_fornecedor(fornecedor_id)
    return render_template("tela_entrada.html", entradas=entradas, cliente=Cliente.seleciona_por_id(cliente_id))
#==============================================

# TELA MOVIMENTAÇÃO==============
@app.route("/movimentacao")
def tela_movimentacao():
    cliente_id = session.get("cliente_id")
    produto = request.args.get("produto")
    tipo = request.args.get("tipo")
    fornecedor = request.args.get("fornecedor")
    movimentacoes = Movimentacao.movimentar_tudo()

        # Listas dos filtros
    produtos_filtro = []
    fornecedores_filtro = []

    for item in movimentacoes:

        if item["produto"] not in [p["produto"] for p in produtos_filtro]:
            produtos_filtro.append({
                "produto": item["produto"]
            })

        nome_pessoa = item["fornecedor"] if item["fornecedor"] else item["cliente"]

        if nome_pessoa not in [f["nome"] for f in fornecedores_filtro]:
            fornecedores_filtro.append({
                "nome": nome_pessoa
            })

    # Filtro produto
    if produto:
        movimentacoes = [
            m for m in movimentacoes
            if m["produto"] == produto
        ]

    # Filtro tipo
    if tipo:
        movimentacoes = [
            m for m in movimentacoes
            if m["tipo"] == tipo
        ]

    # Filtro fornecedor/cliente
    if fornecedor:
        movimentacoes = [
            m for m in movimentacoes
            if (
                m["fornecedor"] == fornecedor or
                m["cliente"] == fornecedor
            )
        ]


    return render_template("tela_movimentacao.html",movimentacoes=movimentacoes,
        produtos_filtro=produtos_filtro,
        fornecedores_filtro=fornecedores_filtro,
        produto_selecionado=produto,
        tipo_selecionado=tipo,
        fornecedor_selecionado=fornecedor,
        cliente=Cliente.seleciona_por_id(cliente_id))

# TELA SAIDA==============
@app.route("/pedido/saida")
def tela_saida():
    cliente_id = session.get("cliente_id")
    produto = request.args.get("produto")
    cliente_filtro = request.args.get("cliente")
    status = request.args.get("status")
    saidas = PedidoSaida.historico_saida()

        # Listas para os filtros
    produtos_filtro = []
    clientes_filtro = []

    for item in saidas:
        if item not in produtos_filtro:
            produtos_filtro.append({
                "nome": item["nome"]
            })

        if item["cliente"] not in [c["cliente"] for c in clientes_filtro]:
            clientes_filtro.append({
                "cliente": item["cliente"]
            })

    # Aplicar filtros
    if produto:
        saidas = [
            s for s in saidas
            if s["nome"] == produto
        ]

    if cliente_filtro:
        saidas = [
            s for s in saidas
            if s["cliente"] == cliente_filtro
        ]

    if status:
        saidas = [
            s for s in saidas
            if s["status"] == status
        ]

    return render_template("tela_saida.html", saidas=saidas,produtos_filtro=produtos_filtro, clientes_filtro=clientes_filtro,produto_selecionado=produto,cliente_selecionado=cliente_filtro,status_selecionado=status, cliente = Cliente.seleciona_por_id(cliente_id))
#==============================================

# TELA SAIDA CLIENTE ESPECIFICO==============
@app.route("/pedido/saida/cliente/<int:clientes_cadastro_id>")
def tela_pedidos_clientes(clientes_cadastro_id):
    cliente_id = session.get("cliente_id")
    saidas = PedidoSaida.seleciona_por_clientes(clientes_cadastro_id)
    return render_template("tela_saida.html", saidas=saidas, cliente=Cliente.seleciona_por_id(cliente_id))
#==============================================

# TELA CADASTRO PEDIDOS==============
@app.route("/cadastro/pedido")
def tela_cadastro_pedidos():
    cliente_id = session.get("cliente_id")
    return render_template("tela_cadastro_pedidos.html", pedidos=PedidoEntrada.encontra_tudo_com_produto(), cliente = Cliente.seleciona_por_id(cliente_id))
#==============================================

# TELA CADASTRO PEDIDOS==============
@app.route("/cadastro/pedido/saida")
def tela_cadastro_pedidos_saida():
    cliente_id = session.get("cliente_id")
    return render_template("tela_cadastro_pedidos_saida.html",  clientes_cadastro = ClientesCadastro.seleciona_todos_clientescadastro(), cliente = Cliente.seleciona_por_id(cliente_id))
#==============================================

# TELA PERFIL DO USUARIO==============
@app.route("/perfil")
def tela_perfil_do_usuario():
    cliente_id = session.get("cliente_id")
    return render_template("tela_perfil_do_usuario.html", cliente = Cliente.seleciona_por_id(cliente_id))
#==============================================

# -------------------------------------- CLIENTE ------------------------------------------
# GET FORM TELA DE CADASTRO ===============
def get_cliente_form_cadastro():
    return {
        "nome": request.form.get("nome").strip(),
        "email": request.form.get("email").strip(),
        "cpf": request.form.get("cpf").strip(),
        "senha": request.form.get("senha").strip(),
        "status": request.form.get("status", "ativo")
    }
#==============================================

# POST SALVA CLIENTE ===============
@app.route("/cliente/salvar", methods=["POST"])
def salvar_cliente():
    dados = get_cliente_form_cadastro()
    cliente = Cliente(**dados)
    erros = cliente.validate()

    if erros:
            flash(erros[0], "danger")
            return render_template("tela_cadastro.html", cliente=dados)

    try:
        cliente.inserir_usuario(dados)
        flash("Cliente cadastrado com sucesso.", "success")
        return redirect(url_for("tela_login"))
    except Exception as e:
        # Verifica se o erro é de entrada duplicada (código 1062 do MySQL)
        if "1062" in str(e):
            flash("E-mail ou CPF já cadastrado no sistema.", "danger")
        else:
            flash(f"Erro ao cadastrar Cliente: {e}", "danger")
        return render_template("tela_cadastro.html", cliente=dados)
#==============================================

# POST ATUALIZAR CLIENTE ======================
@app.route("/cliente/atualizar/<int:id>", methods=["POST"])
def atualizar_cliente(id):
    dados = get_cliente_form_cadastro()
    cliente = Cliente(**dados)
    erros = cliente.validate()

    if erros:
        for erro in erros:
            flash(erro[0], "erro")
        dados["id"] = id
        return render_template("tela_cadastro.html", cliente=dados)

    try:
        if not Cliente.seleciona_por_id(id):
            flash("Cliente não encontrado.", "danger")
            return redirect(url_for("tela_login"))

        cliente.atualizar(id)
        flash("Cliente atualizado com sucesso.", "success")
        return redirect(url_for("tela_login"))
    except Exception as e:
        dados["id"] = id
        flash(f"Erro ao atualizar cliente: {e}", "danger")
        return render_template("tela_cadastro.html", cliente=dados)
# =========================================

# DELETAR CLIENTE ==================
@app.route("/cliente/excluir/<int:id>")
def excluir_cliente(id):
    try:
        Cliente.deletar_cliente(id)
        flash("Cliente excluído com sucesso.", "success")
    except ValueError as e:
        flash(str(e), "danger")
    except Exception as e:
        flash(f"Erro ao excluir cliente: {e}", "danger")
    return redirect(url_for("tela_login"))
# ====================================

# Faz LOGIN CLIENTE ===============
@app.route("/cliente/login", methods=['POST'])
def fazer_login():
    if request.method == "POST":
        email = request.form.get("email")
        senha = request.form.get("senha")

        cliente = Cliente.autenticar(email, senha)

        if cliente:
            session["cliente_id"] = cliente["id"]
            session["cliente_nome"] = cliente["nome"]

            flash("Login realizado com sucesso!", "success")
            return redirect(url_for("tela_inicial"))
        else:
            flash("Email ou senha inválidos!", "danger")
            return render_template("tela_login.html")
# ====================================

# Faz LOGOUT CLIENTE ===============
@app.route("/cliente/logout")
def logout():
    session.clear()
    flash("Você saiu da sua conta.", "info")
    return redirect(url_for("tela_login"))
# ====================================

# Faz LOGOUT CLIENTE E ACASSA TELA CADASTRO ===============
@app.route("/cliente/logout/cadastro")
def logout2():
    session.clear()
    flash("Você saiu da sua conta.", "info")
    return redirect(url_for("tela_cadastro"))
# ====================================

# -------------------------------------- CLIENTE FIM ------------------------------------------

# -------------------------------------- FORNECEDOR ------------------------------------------
# GET FORM TELA DE CADASTRO FORNECEDOR ===============
def get_fornecedor_form_cadastro():
    return {
        "nome_fornecedor": request.form.get("nome_fornecedor").strip(),
        "cnpj": re.sub(r'\D', '', request.form.get("cnpj").strip()),
        "email": request.form.get("email").strip(),
    }
#==============================================

# POST SALVA FORNECEDOR ===============
@app.route("/fornecedor/salvar", methods=["POST"])
def salvar_fornecedor():
    dados = get_fornecedor_form_cadastro()
    fornecedor = Fornecedor(**dados)
    erros = fornecedor.validate()

    if erros:
        flash(erros[0], "danger")
        return render_template("tela_cadastro_de_fornecedor.html", fornecedor=dados, ) 

    try:
        fornecedor.insert()
        flash("Fornecedor cadastrado com sucesso.", "success")
        return redirect(url_for("tela_historico_de_fornecedor")) 
    except Exception as e:
            # Verifica se o erro é de entrada duplicada (código 1062 do MySQL)
        if "1062" in str(e):
            flash("CNPJ ou E-MAIL já cadastrado no sistema.", "danger")
        else:
            flash(f"Erro ao cadastrar Fornecedor: {e}", "danger")
        return render_template("tela_cadastro_de_fornecedor.html", fornecedor=dados) 
#==============================================

# POST ATUALIZAR FORNECEDOR ======================
@app.route("/fornecedor/editar/<int:id>")
def editar_fornecedor(id):
    fornecedor_editar = Fornecedor.seleciona_por_id(id)
    cliente_id = session.get("cliente_id")
    if not fornecedor_editar:
        flash("Fornecedor não encontrado.", "danger")
        return redirect(url_for("tela_cadastro_de_fornecedor"))
    return render_template("tela_cadastro_de_fornecedor.html", cliente = Cliente.seleciona_por_id(cliente_id), fornecedor=fornecedor_editar, fornecedores=Fornecedor.seleciona_tudo(order_by="nome_fornecedor"))
# ==============================

# POST ATUALIZAR FORNECEDOR ======================
@app.route("/fornecedor/atualizar/<int:id>", methods=["POST"])
def atualizar_fornecedor(id):
    dados = get_fornecedor_form_cadastro()
    fornecedor = Fornecedor(**dados)
    erros = fornecedor.validate()

    if erros:
        for erro in erros:
            flash(erro[0], "erro")
        dados["id"] = id
        return render_template("tela_historico_de_fornecedor.html", fornecedor=dados) 

    try:
        if not Fornecedor.seleciona_por_id(id):
            flash("Fornecedor não encontrado.", "erro")
            return redirect(url_for("tela_historico_de_fornecedor"))

        fornecedor.atualizar(id)
        flash("Fornecedor atualizado com sucesso.", "success")
        return redirect(url_for("tela_historico_de_fornecedor"))
    except Exception as e:
        dados["id"] = id
        flash(f"Erro ao atualizar Fornecedor: {e}", "danger")
        return render_template("tela_cadastro_de_fornecedor.html", fornecedor=dados)
# =========================================

# DELETAR FORNECEDOR ==================
@app.route("/fornecedor/excluir/<int:id>")
def excluir_fornecedor(id):
    try:
        Fornecedor.deletar_fornecedor(id)
        flash("Fornecedor excluído com sucesso.", "success")
    except ValueError as e:
        flash(str(e), "danger")
    except Exception as e:
        flash(f"Erro ao excluir Fornecedor: {e}", "danger")
    return redirect(url_for("tela_historico_de_fornecedor")) 
# ====================================

# -------------------------------------- FORNECEDOR FIM ------------------------------------------

# -------------------------------------- CLIENTE CADASTRO ------------------------------------------
# GET FORM TELA DE CLIENTE CADASTRO ===============
def get_form_cliente_cadastro():
    return {
        "nome": request.form.get("nome").strip(),
        "cpf": re.sub(r'\D', '', request.form.get("cpf").strip()),
        "telefone": re.sub(r'\D', '', request.form.get("telefone").strip()),
        "cidade": request.form.get("cidade").strip(),
        "estado": request.form.get("estado").strip(),
        "cep": re.sub(r'\D', '', request.form.get("cep").strip()),
    }
#==============================================

# POST SALVA CLIENTE CADASTRO ===============
@app.route("/clientescadastro/salvar", methods=["POST"])
def salvar_clientes_cadastro():
    dados = get_form_cliente_cadastro()
    clientes = ClientesCadastro(**dados)
    erros = clientes.validate()

    cliente_id = session.get("cliente_id")

    if erros:
        flash(erros[0], "danger")
        return render_template("tela_clientes_cadastro.html", clientes=dados, cliente = Cliente.seleciona_por_id(cliente_id)) #!

    try:
        clientes.insert()
        flash("Cliente cadastrado com sucesso!", "success")
        return redirect(url_for("tela_historico_de_cliente")) 
    except Exception as e:
            # Verifica se o erro é de entrada duplicada (código 1062 do MySQL)
        if "1062" in str(e):
            flash("CPF já cadastrado no sistema.", "danger")
        else:
            flash(f"Erro ao cadastrar Cliente: {e}", "danger")
        return render_template("tela_clientes_cadastro.html", clientes=dados, cliente = Cliente.seleciona_por_id(cliente_id)) 
#==============================================

# POST EIDTAR CLIENTE CADASTRO ======================
@app.route("/clientes/cadastro/editar/<int:id>")
def editar_clientes_cadastro(id):
    clientes_cadastro_editar = ClientesCadastro.seleciona_por_id(id)
    cliente_id = session.get("cliente_id")
    if not clientes_cadastro_editar:
        flash("Cliente não encontrado.", "danger")
        return redirect(url_for("tela_clientes_cadastro"))
    return render_template("tela_clientes_cadastro.html", cliente = Cliente.seleciona_por_id(cliente_id), clientes_cadastro=clientes_cadastro_editar)
# ==============================

# POST ATUALIZAR CLIENTES CADASTRO ======================
@app.route("/clientes/cadastro/atualizar/<int:id>", methods=["POST"])
def atualizar_clientes_cadastro(id):
    dados = get_form_cliente_cadastro()
    clientes= ClientesCadastro(**dados)
    erros = clientes.validate()

    if erros:
        for erro in erros:
            flash(erro, "erro")
        dados["id"] = id
        return render_template("tela_clientes_cadastro.html", clientes = ClientesCadastro.seleciona_tudo(order_by="nome")) 

    try:
        if not ClientesCadastro.seleciona_por_id(id):
            flash("Cliente não encontrado.", "erro")
            return redirect(url_for("tela_historico_de_cliente"))

        clientes.atualizar(id)
        flash("Cliente atualizado com sucesso.", "success")
        return redirect(url_for("tela_historico_de_cliente"))
    except Exception as e:
        dados["id"] = id
        flash(f"Erro ao atualizar Cliente: {e}", "danger")
        return render_template("tela_clientes_cadastro.html", clientes=dados)
# =========================================

# DELETAR FORNECEDOR ==================
@app.route("/clientescadastro/excluir/<int:id>")
def excluir_clientes_cadastro(id):
    try:
        ClientesCadastro.deletar_clientes_cadastro(id)
        flash("Cliente excluído com sucesso!", "danger")
    except ValueError as e:
        flash(str(e), "danger")
    except Exception as e:
        flash(f"Erro ao excluir Cliente: {e}", "danger")
    return redirect(url_for("tela_historico_de_cliente")) 
# ====================================

# -------------------------------------- CLIENTES CADASTRO FIM ------------------------------------------

# -------------------------------------- ESQUECI A SENHA ------------------------------------------

# ==========================================================
# ESQUECI A SENHA
# ==========================================================

@app.route("/esqueci_a_senha", methods=["GET", "POST"])
def tela_esqueci_a_senha():

    if request.method == "POST":

        email = request.form.get("email", "").strip()

        if not email:
            flash("Digite seu e-mail.", "danger")
            return render_template("tela_esqueci_a_senha.html")

        # Verifica se o cliente existe
        cliente = Cliente.seleciona_por_email(email)

        if not cliente:
            flash("E-mail não encontrado.", "danger")
            return render_template("tela_esqueci_a_senha.html")

        # Gera código de 6 dígitos
        codigo = random.randint(100000, 999999)

        # Salva os dados na sessão
        session["codigo_recuperacao"] = str(codigo)
        session["email_recuperacao"] = email
        session["cliente_recuperacao_id"] = cliente["id"]

        try:

            enviar_codigo_email(email, codigo)

            flash(
                "Código de recuperação enviado para seu e-mail.",
                "success"
            )

            return redirect(
                url_for("verificar_codigo")
            )

        except Exception as e:

            # Limpa a sessão caso o envio falhe
            session.pop("codigo_recuperacao", None)
            session.pop("email_recuperacao", None)
            session.pop("cliente_recuperacao_id", None)

            flash(
                f"Erro ao enviar o código: {e}",
                "danger"
            )

            return render_template(
                "tela_esqueci_a_senha.html"
            )

    return render_template(
        "tela_esqueci_a_senha.html"
    )


# ==========================================================
# VERIFICAR CÓDIGO
# ==========================================================

@app.route("/verificar_codigo", methods=["GET","POST"])
def verificar_codigo():

    if request.method == "POST":

        codigo_digitado = request.form.get(
            "codigo",
            ""
        ).strip()

        codigo_salvo = session.get(
            "codigo_recuperacao"
        )

        if codigo_digitado == codigo_salvo:

            # Marca que o código foi validado
            session["codigo_verificado"] = True

            return redirect(
                url_for("salvar_nova_senha")
            )

        else:

            flash(
                "Código inválido.",
                "danger"
            )

            return render_template(
                "tela_verificar_codigo.html"
            )

    return render_template(
        "tela_verificar_codigo.html"
    )


# ==========================================================
# TELA PARA DIGITAR A NOVA SENHA
# ==========================================================
# ==========================================================
# SALVAR NOVA SENHA
# ==========================================================
@app.route("/salvar_nova_senha", methods=["GET","POST"])
def salvar_nova_senha():

    # Verifica se o código foi validado
    if not session.get("codigo_verificado"):
        flash(
            "Código de recuperação não verificado.",
            "danger"
        )

        return redirect(
            url_for("tela_esqueci_a_senha")
        )

    nova_senha = request.form.get(
        "nova_senha",
        ""
    ).strip()

    confirmar_senha = request.form.get(
        "confirmar_senha",
        ""
    ).strip()

    # Verifica se os campos foram preenchidos
    if not nova_senha or not confirmar_senha:
        flash(
            "Preencha todos os campos.",
            "danger"
        )

        return render_template(
            "tela_nova_senha.html"
        )

    # Verifica se as senhas são iguais
    if nova_senha != confirmar_senha:
        flash(
            "As senhas não coincidem.",
            "danger"
        )

        return render_template(
            "tela_nova_senha.html"
        )

    # Recupera o ID do cliente que solicitou a recuperação
    cliente_id = session.get(
        "cliente_recuperacao_id"
    )

    if not cliente_id:
        flash(
            "Sessão de recuperação inválida.",
            "danger"
        )

        return redirect(
            url_for("tela_esqueci_a_senha")
        )

    try:

        # Busca o cliente
        cliente = Cliente.seleciona_por_id(cliente_id)

        if not cliente:
            flash("Cliente não encontrado.","danger")

            return redirect(url_for("tela_esqueci_a_senha"))

        # ==================================================
        # GERA O HASH DA NOVA SENHA
        # ==================================================
        senha_hash = gerar_hash_senha(
            nova_senha
        )

        # ==================================================
        # ATUALIZA A SENHA NO BANCO
        # ==================================================
        Cliente.atualizar_senha(cliente_id, senha_hash)

        # Limpa os dados da recuperação
        session.pop(
            "codigo_recuperacao",
            None
        )

        session.pop(
            "email_recuperacao",
            None
        )

        session.pop(
            "cliente_recuperacao_id",
            None
        )

        session.pop(
            "codigo_verificado",
            None
        )

        flash(
            "Senha alterada com sucesso! Faça login com sua nova senha.",
            "success"
        )

        return redirect(
            url_for("tela_login")
        )

    except Exception as e:

        print(
            f"Erro ao alterar senha: {e}"
        )

        flash(
            "Erro ao alterar a senha.",
            "danger"
        )

        return render_template(
            "tela_nova_senha.html"
        )
    


# ==========================================================
# ENVIAR CÓDIGO POR E-MAIL
# ==========================================================

def enviar_codigo_email(destinatario, codigo):

    email_remetente = "medstock.sistema@gmail.com"
    senha_app = "hahz uyzh eidq txts"

    mensagem = MIMEMultipart()

    mensagem["From"] = email_remetente
    mensagem["To"] = destinatario
    mensagem["Subject"] = "Código de recuperação MEDSTOCK"

    corpo = f"""
    <html>
        <body style="text-align:center;">

            <img src="cid:logo_medstock" width="200">

            <h2>Seu código de recuperação é:</h2>

            <h1>{codigo}</h1>

            <p>
                Use este código para redefinir sua senha.
            </p>

        </body>
    </html>
    """

    mensagem.attach(
        MIMEText(
            corpo,
            "html"
        )
    )

    with open(
        "static/img/medstock_logo_sf.png",
        "rb"
    ) as imagem:

        img = MIMEImage(
            imagem.read()
        )

        img.add_header(
            "Content-ID",
            "<logo_medstock>"
        )

        mensagem.attach(img)

    servidor = smtplib.SMTP(
        "smtp.gmail.com",
        587
    )

    servidor.starttls()

    servidor.login(
        email_remetente,
        senha_app
    )

    servidor.send_message(
        mensagem
    )

    servidor.quit()


# -------------------------------------- ESQUECI A SENHA FIM ------------------------------------------
# -------------------------------------- PRODUTO ------------------------------------------
# GET FORM TELA CADASTRO DE PRODUTO ===========
def get_produto_form_cadastro():
    return {
        "fornecedor_id": to_int(request.form.get("fornecedor_id", 1)),
        "nome": request.form.get("nome", "").strip(),
        "quantidade_estoque": to_int(request.form.get("quantidade_estoque")),
        "categoria": request.form.get("categoria", "").strip(),
        "estoque_minimo": to_int(request.form.get("estoque_minimo")),
        "preco_custo": to_float(request.form.get("preco_custo").replace(",", ".")),
        "preco_venda": to_float(request.form.get("preco_venda").replace(",", ".")),  
        "data_validade": request.form.get("data_validade") or None,  # Retorna None se estiver vazio
        "tipo_medicamento": request.form.get("tipo_medicamento", "outros").strip(), 
    }
# ===============================

# POST SALVAR PRODUTO =======================
@app.route("/produto/salvar", methods=["POST"])
def salvar_produto():
    dados = get_produto_form_cadastro()

        # ============================================
    # PEGA A IMAGEM
    # ============================================

    imagem = request.files.get("imagem")

    nome_imagem = None

    if imagem and imagem.filename:

        # Extensões permitidas
        extensoes_permitidas = {
            "png",
            "jpg",
            "jpeg",
            "webp"
        }

        extensao = (
            imagem.filename
            .rsplit(".", 1)[-1]
            .lower()
        )

        if extensao not in extensoes_permitidas:

            flash(
                "Formato de imagem inválido. "
                "Use PNG, JPG, JPEG ou WEBP.",
                "danger"
            )

            return render_template(
                "tela_cadastro_produto.html",
                produto=dados
            )

        # Limpa o nome original
        nome_original = secure_filename(
            imagem.filename
        )

        # Cria nome único
        nome_imagem = (
            f"{uuid.uuid4().hex}_"
            f"{nome_original}"
        )

        # Caminho onde a imagem será salva
        caminho_imagem = os.path.join(
            UPLOAD_FOLDER,
            nome_imagem
        )

        # Salva a imagem
        imagem.save(caminho_imagem)

    # ============================================
    # ADICIONA A IMAGEM AOS DADOS DO PRODUTO
    # ============================================

    dados["imagem"] = nome_imagem
    produto = Produto(**dados)
    erros = produto.validate()

    if erros:
        for erro in erros:
            flash(erro[0], "danger")
        return render_template("formulario_produto.html", produto=dados)

    try:
        produto.insert()
        flash("Produto cadastrado com sucesso.", "success")
        return redirect(url_for("tela_produtos"))
    except Exception as e:
        # Verifica se o erro é de entrada duplicada (código 1062 do MySQL)
        if "1062" in str(e):
            flash("Produto já cadastrado.", "danger")
        else:
            flash(f"Erro ao cadastrar produto: {e}", "danger")
        return render_template("tela_cadastro_produto.html", produto=dados)
# ================================================

# POST ATUALIZAR PRODUTO ======================
# =========================================================
# POST - ATUALIZAR PRODUTO
# =========================================================

@app.route("/produto/atualizar/<int:id>", methods=["POST"])
def atualizar_produto(id):

    # -----------------------------------------------------
    # Verifica se o produto existe
    # -----------------------------------------------------

    produto_atual = Produto.seleciona_por_id(id)

    if not produto_atual:

        flash("Produto não encontrado.", "erro")

        return redirect(
            url_for("tela_produtos")
        )


    # -----------------------------------------------------
    # Pega os dados do formulário
    # -----------------------------------------------------

    dados = get_produto_form_cadastro()


    # -----------------------------------------------------
    # IMAGEM
    # -----------------------------------------------------

    arquivo = request.files.get("imagem")


    # Se o usuário selecionou uma nova imagem
    if arquivo and arquivo.filename:

        nome_original = secure_filename(
            arquivo.filename
        )

        # Extensão do arquivo
        extensao = os.path.splitext(
            nome_original
        )[1].lower()


        # Extensões permitidas
        extensoes_permitidas = {
            ".png",
            ".jpg",
            ".jpeg",
            ".webp"
        }


        if extensao not in extensoes_permitidas:

            flash(
                "Formato de imagem inválido. "
                "Use PNG, JPG, JPEG ou WEBP.",
                "erro"
            )

            dados["id"] = id

            return render_template(
                "tela_cadastro_produto.html",
                produto=dados,
                fornecedores=Fornecedor.seleciona_tudo()
            )


        # -------------------------------------------------
        # Cria um nome único para evitar conflito
        # -------------------------------------------------

        import uuid

        nome_arquivo = (
            f"{uuid.uuid4().hex}{extensao}"
        )


        # -------------------------------------------------
        # Pasta onde as imagens serão salvas
        # -------------------------------------------------

        pasta_upload = os.path.join(
            "static",
            "uploads",
            "produtos"
        )


        os.makedirs(
            pasta_upload,
            exist_ok=True
        )


        # -------------------------------------------------
        # Caminho final
        # -------------------------------------------------

        caminho_arquivo = os.path.join(
            pasta_upload,
            nome_arquivo
        )


        # -------------------------------------------------
        # Salva a imagem
        # -------------------------------------------------

        arquivo.save(
            caminho_arquivo
        )


        # Salva somente o nome no banco
        dados["imagem"] = nome_arquivo


    else:

        # -------------------------------------------------
        # Nenhuma nova imagem foi escolhida
        # Mantém a imagem atual
        # -------------------------------------------------

        if isinstance(produto_atual, dict):

            dados["imagem"] = produto_atual.get(
                "imagem"
            )

        else:

            dados["imagem"] = getattr(
                produto_atual,
                "imagem",
                None
            )


    # -----------------------------------------------------
    # Cria objeto para validação
    # -----------------------------------------------------

    produto = Produto(
        **dados
    )


    # -----------------------------------------------------
    # VALIDAÇÃO
    # -----------------------------------------------------

    erros = produto.validate()


    if erros:

        for erro in erros:

            flash(
                erro[0],
                "erro"
            )


        dados["id"] = id


        return render_template(
            "tela_cadastro_produto.html",
            produto=dados,
            fornecedores=Fornecedor.seleciona_tudo()
        )


    # -----------------------------------------------------
    # ATUALIZA
    # -----------------------------------------------------

    try:

        produto.atualizar(id)


        flash(
            "Produto atualizado com sucesso.",
            "success"
        )


        return redirect(
            url_for("tela_produtos")
        )


    except Exception as e:

        dados["id"] = id


        flash(
            f"Erro ao atualizar produto: {e}",
            "danger"
        )


        return render_template(
            "tela_cadastro_produto.html",
            produto=dados,
            fornecedores=Fornecedor.seleciona_tudo()
        )

# PUT EDITAR PRODUTO ==================
@app.route("/produto/editar/<int:id>")
def editar_produto(id):
    produto = Produto.seleciona_por_id(id)
    cliente_id = session.get("cliente_id")
    if not produto:
        flash("Produto não encontrado.", "danger")
        return redirect(url_for("tela_produtos"))
    return render_template("tela_cadastro_produto.html", cliente = Cliente.seleciona_por_id(cliente_id), produto=produto, fornecedores = Fornecedor.seleciona_tudo(order_by="nome_fornecedor"))
# ==============================

# DELETAR PRODUTO ==================
@app.route("/produto/excluir/<int:id>")
def excluir_produto(id):
    try:
        Produto.deletar_produto(id)
        flash("Produto excluído com sucesso.", "success")
    except ValueError as e: 
        flash(str(e), "danger")
    except Exception as e:
        flash(f"Erro ao excluir produto: {e}", "danger")
    return redirect(url_for("tela_produtos"))   
# ====================================
# -------------------------------------- PRODUTO FIM ------------------------------------------

# -------------------------------------- PEDIDO ENTRADA ------------------------------------------
# GET FORM TELA CADASTRO DE PEDIDOS ===========
def get_pedido_form():
    data_campo = request.form.get("data_pedido")
    
    # Se o campo for vazio ou não selecionado gera a data/hora atual formatada para o MySQL
    if not data_campo or data_campo.strip() == "":
        data_pedido = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    else:
        data_pedido = data_campo
    return {
        #"produto_id": request.form.get("produto_id"),
        "data_pedido": data_pedido,
        "valor_total": request.form.get("valor_total"),
        "observacao": request.form.get("observacao", "").strip(),
        "quantidade_pedido": request.form.get("quantidade_pedido", "").strip(),
        "data_processamento": request.form.get("data_processamento"),
        "status": "PENDENTE",
        "fornecedor_id": request.form.get("fornecedor_id"),
        "produto_id": request.form.get("produto_id")
    }

@app.route("/pedido/entrada/<tipo>/<int:id>")
def novo_pedido(tipo, id):
    produto = Produto.seleciona_por_id_com_fornecedor(id)
    tipo = tipo.upper()
    cliente_id = session.get("cliente_id")

    if not produto:
        flash("Produto não encontrado.", "danger")
        return redirect(url_for("tela_produtos"))
    
    if tipo not in ["ENTRADA", "SAIDA"]:
        flash("Tipo de pedido inválido.", "erro")
        return redirect(url_for("tela_produtos"))

    pedido_padrao = {
        "data_pedido": datetime.now().strftime("%Y-%m-%dT%H:%M") # Formato correto para input do tipo datetime-local
    }

    return render_template("tela_cadastro_pedidos.html", produto=produto, tipo=tipo, pedido=pedido_padrao, cliente = Cliente.seleciona_por_id(cliente_id))

@app.route("/pedido/salvar/<int:produto_id>", methods=["POST"])
def salvar_pedido(produto_id):
    dados = get_pedido_form()
    #print("pedido", dados)
    produto = Produto.seleciona_por_id_com_fornecedor(produto_id)

    dados["valor_total"] = (float(produto["preco_custo"]) * int(dados["quantidade_pedido"]))
    dados["status"] = "PENDENTE"
    
    entrada = PedidoEntrada(**dados)
    erros = entrada.validate()

    if not produto:
        flash("Produto não encontrado.", "erro")
        return redirect(url_for("tela_produtos"))

    if erros:
        for erro in erros:
            flash(erro, "erro")
        return render_template("tela_cadastro_pedidos.html", pedido=dados)
    
    try:
        entrada.insert()
        flash("Pedido criado com sucesso.", "success")
        return redirect(url_for("tela_entrada"))
    except Exception as e:
        cliente_id = session.get("cliente_id")
        flash(f"Erro ao criar pedido: {e}", "danger")
        return render_template("tela_cadastro_pedidos.html", pedido=dados, produto=produto, tipo="ENTRADA", cliente=Cliente.seleciona_por_id(cliente_id))

@app.route("/pedido/processar/entrada/<int:id>")
def processar_entrada(id):
    try:
        mensagem = PedidoEntrada.processar_entrada(id)
        flash(mensagem, "success")
    except ValueError as e:
        flash(str(e), "danger")
    except Exception as e:
        flash(f"Erro ao processar pedido: {e}", "danger")
    return redirect(url_for("tela_movimentacao"))

@app.route("/entrada/cancelar/<int:id>")
def cancelar_entrada(id):
    try:
        mensagem = PedidoEntrada.cancelar_entrada(id)
        flash(mensagem, "sucesso")
    except ValueError as e:
        flash(str(e), "erro")
    except Exception as e:
        flash(f"Erro ao cancelar pedido: {e}", "erro")
    return redirect(url_for("tela_entrada"))
# -------------------------------------- PEDIDO ENTRADA FIM ------------------------------------------

# -------------------------------------- PEDIDO SAIDA ------------------------------------------
# GET FORM TELA CADASTRO DE PEDIDOS ===========
def get_pedido_saida_form():
    data_campo = request.form.get("data_pedido")
    
    # Se o campo for vazio ou não selecionado gera a data/hora atual formatada para o MySQL
    if not data_campo or data_campo.strip() == "":
        data_pedido = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    else:
        data_pedido = data_campo
    return {
        #"produto_id": request.form.get("produto_id"),
        "data_pedido": data_pedido,
        "valor_total": request.form.get("valor_total"),
        "observacao": request.form.get("observacao", "").strip(),
        "quantidade_pedido": request.form.get("quantidade_pedido", "").strip(),
        "data_processamento": request.form.get("data_processamento"),
        "status": "PENDENTE",
        "clientes_cadastro_id": request.form.get("clientes_cadastro_id"),
        "produto_id": request.form.get("produto_id")
    }

@app.route("/pedido/saida/<tipo>/<int:id>")
def novo_pedido_saida(tipo, id):
    produto = Produto.seleciona_por_id_com_fornecedor(id)
    tipo = tipo.upper()
    cliente_id = session.get("cliente_id")

    if not produto:
        flash("Produto não encontrado.", "danger")
        return redirect(url_for("tela_produtos"))
    
    if tipo not in ["ENTRADA", "SAIDA"]:
        flash("Tipo de pedido inválido.", "erro")
        return redirect(url_for("tela_produtos"))

    pedido_padrao = {
        "data_pedido": datetime.now().strftime("%Y-%m-%dT%H:%M") # Formato correto para input do tipo datetime-local
    }

    return render_template("tela_cadastro_pedidos_saida.html", produto=produto, tipo=tipo, pedido=pedido_padrao, cliente = Cliente.seleciona_por_id(cliente_id), clientes_cadastro = ClientesCadastro.seleciona_todos_clientescadastro())

@app.route("/pedido/salvar/saida/<int:produto_id>", methods=["POST"])
def salvar_pedido_saida(produto_id):
    dados = get_pedido_saida_form()
    produto = Produto.seleciona_por_id_com_fornecedor(produto_id)
    cliente_id = session.get("cliente_id")

    if not produto:
        flash("Produto não encontrado.", "erro")
        return redirect(url_for("tela_produtos"))

# Valida se estoque está disponivel ============
    quantidade_solicitada = int(dados["quantidade_pedido"])
    if quantidade_solicitada > produto["quantidade_estoque"]:
        flash( f"Estoque insuficiente. Disponível: {produto['quantidade_estoque']}", "danger")
        return render_template("tela_cadastro_pedidos_saida.html", produto=produto, tipo="SAIDA", pedido=dados,cliente=Cliente.seleciona_por_id(cliente_id) )
    dados["valor_total"] = (float(produto["preco_custo"]) * int(dados["quantidade_pedido"]))

    saida = PedidoSaida(**dados)
    erros = saida.validate()

    if erros:
        for erro in erros:
            flash(erro, "erro")
        return render_template("tela_cadastro_pedidos_saida.html",produto=produto, tipo="SAIDA", pedido=dados, cliente = Cliente.seleciona_por_id(cliente_id))
    
    try:
        saida.insert()
        flash("Pedido de saida criado com sucesso.", "success")
        return redirect(url_for("tela_saida"))
    except Exception as e:
        flash(f"Erro ao criar pedido: {e}", "danger")
        return render_template("tela_cadastro_pedidos_saida.html", pedido=dados, produto=produto, tipo="SAIDA", cliente = Cliente.seleciona_por_id(cliente_id))

@app.route("/pedido/processar/<int:id>")
def processar_saida(id):
    try:
        mensagem = PedidoSaida.processar_saida(id)
        flash(mensagem, "sucesso")
    except ValueError as e:
        flash(str(e), "erro")
    except Exception as e:
        flash(f"Erro ao processar pedido: {e}", "erro")
    return redirect(url_for("tela_movimentacao"))

@app.route("/saida/cancelar/<int:id>")
def cancelar_saida(id):
    try:
        mensagem = PedidoSaida.deletar_saida(id)
        flash(mensagem, "sucesso")
    except ValueError as e:
        flash(str(e), "erro")
    except Exception as e:
        flash(f"Erro ao cancelar pedido: {e}", "erro")
    return redirect(url_for("tela_saida"))


#! = Feito pela -- Ana Beatriz // linha 1 a 1880 𖹭.ᐟ

if __name__ == "__main__":
    app.run(
    host="0.0.0.0",
    port=5000,
    debug=True
)