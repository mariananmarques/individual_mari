from datetime import datetime
from core.crud_base import Crudmedstock
from core.database import conectar_banco
from core.validador import Validador
from models.produto import Produto

#from models.movimentacao import Movimentacao #! err

#! = Feito pela -- Ana Beatriz //  𖹭.ᐟ

#============================ CLASSE PEDIDO ENTRADA =========================
class Movimentacao(Crudmedstock):
    table = "movimentacao"
    fields = [
        "tipo",
        "quantidade",
        "valor_total",
        "data_mov",
        "produto_id",
        "fornecedor_id",
        "cliente_id",
        "entrada_id",
        "saida_id"
    ]

    def __init__(self, tipo, quantidade, valor_total, data_mov, produto_id, fornecedor_id, cliente_id, entrada_id, saida_id):
        self.tipo = tipo
        self.quantidade = quantidade
        self.valor_total = valor_total
        self.data_mov = data_mov or datetime.now()
        self.produto_id = produto_id
        self.fornecedor_id = fornecedor_id
        self.cliente_id = cliente_id
        self.entrada_id = entrada_id
        self.saida_id = saida_id

#============================ VALIDAÇÃO =========================
    @classmethod
    def movimentar_tudo(cls):
        conexao = conectar_banco.connect()
        cursor = conexao.cursor(dictionary=True)
        cursor.execute("""
            SELECT
                m.*,
                p.nome AS produto,
                f.nome_fornecedor AS fornecedor,
                c.nome AS cliente

            FROM movimentacao m

            INNER JOIN produto p
            ON m.produto_id = p.id

            LEFT JOIN fornecedor f
            ON m.fornecedor_id = f.id

            LEFT JOIN clientes_cadastro c
            ON m.cliente_id = c.id

            ORDER BY m.data_mov DESC
        """)
        dados = cursor.fetchall()
        cursor.close()
        conexao.close()
        return dados    