from datetime import datetime
from core.crud_base import Crudmedstock
from core.database import conectar_banco
from core.validador import Validador
from models.produto import Produto

#from models.movimentacao import Movimentacao #! err

#! = Feito pela -- Ana Beatriz //  𖹭.ᐟ

#============================ CLASSE PEDIDO ENTRADA =========================
class PedidoEntrada(Crudmedstock):
    table = "entrada"
    fields = [
        "data_pedido",
        "valor_total",
        "observacao",
        "quantidade_pedido",
        "data_processamento",
        "status",
        "fornecedor_id",
        "produto_id"
    ]

    def __init__(self, data_pedido, valor_total, fornecedor_id, produto_id, quantidade_pedido, status="PENDENTE", observacao="", data_processamento=None):
        self.data_pedido = data_pedido or datetime.now()
        self.valor_total = valor_total
        self.fornecedor_id = fornecedor_id
        self.produto_id = produto_id
        self.observacao = observacao
        self.status = status
        self.quantidade_pedido = quantidade_pedido
        self.data_processamento = data_processamento

#============================ VALIDAÇÃO =========================
    def validate(self):
        erros = []

        erro_fornecedor = Validador.positivo(self.fornecedor_id, "fornecedor")
        if erro_fornecedor:
            erros.append(erro_fornecedor)

        return erros

    @classmethod
    def encontra_tudo_com_produto(cls):
        conexao = conectar_banco.connect()
        cursor = conexao.cursor(dictionary=True)
        try:
            sql = """
            SELECT * from entrada 
            order by data_pedido desc
            """
            cursor.execute(sql)
            return cursor.fetchall()
        finally:
            cursor.close()
            conexao.close()

    @classmethod
    def historico_entrada(cls):

        conexao = conectar_banco.connect()
        cursor = conexao.cursor(dictionary=True)

        try:
            sql = """
            SELECT
                e.id,
                e.status,
                f.nome_fornecedor,
                p.nome,
                p.imagem,
                e.quantidade_pedido,
                e.observacao,
                e.valor_total,
                e.data_pedido
            FROM entrada e
            JOIN fornecedor f
                ON e.fornecedor_id = f.id
            JOIN produto p
                ON e.produto_id = p.id
            ORDER BY e.data_pedido DESC
            """

            cursor.execute(sql)

            return cursor.fetchall()

        finally:
            cursor.close()
            conexao.close()

    @classmethod
    def seleciona_por_fornecedor(cls, fornecedor_id):

        conexao = conectar_banco.connect()
        cursor = conexao.cursor(dictionary=True)

        try:

            sql = """
            SELECT
                e.id,
                p.nome,
                f.nome_fornecedor,
                e.quantidade_pedido,
                e.observacao,
                e.valor_total,
                e.status,
                e.data_pedido
            FROM entrada e

            JOIN produto p
                ON e.produto_id = p.id

            JOIN fornecedor f
                ON e.fornecedor_id = f.id

            WHERE e.fornecedor_id = %s

            ORDER BY e.data_pedido DESC
            """

            cursor.execute(sql, (fornecedor_id,))
            return cursor.fetchall()

        finally:
            cursor.close()
            conexao.close()

    @classmethod
    def processar_entrada(cls, id):
        conexao = conectar_banco.connect()
        cursor = conexao.cursor(dictionary=True)
        try:
            conexao.start_transaction()
            # ==========================================
            # BUSCA ENTRADA
            # ==========================================
            cursor.execute(
                """
                SELECT *
                FROM entrada
                WHERE id = %s
                FOR UPDATE
                """,
                (id,)
            )
            entrada = cursor.fetchone()
            if not entrada:
                raise ValueError("Entrada não encontrada.")
            # ==========================================
            # VERIFICA SE JÁ FOI PROCESSADA
            # ==========================================
            if entrada["status"] != "PENDENTE":
                raise ValueError("Somente pedidos pendentes podem ser processados.")
            # ==========================================
            # BUSCA PRODUTO
            # ==========================================
            cursor.execute(
                """
                SELECT *
                FROM produto
                WHERE id = %s
                FOR UPDATE
                """,
                (entrada["produto_id"],)
            )

            produto = cursor.fetchone()

            if not produto:
                raise ValueError("Produto não encontrado.")

            # ==========================================
            # CALCULA NOVO ESTOQUE
            # ==========================================
            nova_quantidade = (
                produto["quantidade_estoque"]
                + entrada["quantidade_pedido"]
            )

            # ==========================================
            # ATUALIZA ESTOQUE
            # ==========================================
            cursor.execute(
                """
                UPDATE produto
                SET quantidade_estoque = %s
                WHERE id = %s
                """,
                (nova_quantidade, produto["id"])
            )

            # ==========================================
            # CRIA MOVIMENTAÇÃO
            # ==========================================
            cursor.execute(
                """
                INSERT INTO movimentacao (
                    tipo,
                    quantidade,
                    valor_total,
                    data_mov,
                    produto_id,
                    fornecedor_id,
                    entrada_id
                )
                VALUES (
                    %s, %s, %s, %s, %s, %s, %s
                )
                """,
                (
                    "ENTRADA",
                    entrada["quantidade_pedido"],
                    entrada["valor_total"],
                    datetime.now(),
                    entrada["produto_id"],
                    entrada["fornecedor_id"],
                    entrada["id"]
                )
            )

            # ==========================================
            # MARCA COMO PROCESSADA
            # ==========================================
            cursor.execute(
                """
                UPDATE entrada
                SET
                    status = %s,
                    data_processamento = %s
                WHERE id = %s
                """,
                ("PROCESSADO", datetime.now(), id)
            )

            # ==========================================
            # COMMIT
            # ==========================================
            conexao.commit()

            return "Entrada processada com sucesso."

        except Exception:

            conexao.rollback()
            raise

        finally:

            cursor.close()
            conexao.close()

    @classmethod
    def cancelar_entrada(cls, id):

        conexao = conectar_banco.connect()

        cursor = conexao.cursor(dictionary=True)

        try:

            conexao.start_transaction()

            # ==========================================
            # BUSCA ENTRADA
            # ==========================================
            cursor.execute(
                """
                SELECT *
                FROM entrada
                WHERE id = %s
                """,
                (id,)
            )

            entrada = cursor.fetchone()

            if not entrada:
                raise ValueError("Entrada não encontrada.")

            # ==========================================
            # VERIFICA STATUS
            # ==========================================
            if entrada["status"] != "PENDENTE":
                raise ValueError(
                    "Somente pedidos pendentes podem ser cancelados."
                )

            # ==========================================
            # CANCELA PEDIDO
            # ==========================================
            cursor.execute(
                """
                UPDATE entrada
                SET status = %s
                WHERE id = %s
                """,
                ("CANCELADO", id)
            )

            # ==========================================
            # COMMIT
            # ==========================================
            conexao.commit()

            return "Entrada cancelada com sucesso."

        except Exception:

            conexao.rollback()
            raise

        finally:

            cursor.close()
            conexao.close()


    @classmethod
    def status_pedido_entrada(cls):
        conexao = conectar_banco.connect()
        cursor = conexao.cursor(dictionary=True)
        try:
            sql = """
            SELECT
    SUM(status = 'PROCESSADO') AS processados,
    SUM(status = 'PENDENTE') AS pendentes,
    SUM(status = 'CANCELADO') AS cancelados,

    (
        SUM(status = 'PROCESSADO') +
        SUM(status = 'PENDENTE') +
        SUM(status = 'CANCELADO')
    ) AS total_status,

    CASE
        WHEN (
            SUM(status = 'PROCESSADO') +
            SUM(status = 'PENDENTE') +
            SUM(status = 'CANCELADO')
        ) > 0
        THEN ROUND(
            SUM(status = 'PROCESSADO') * 100 /
            (
                SUM(status = 'PROCESSADO') +
                SUM(status = 'PENDENTE') +
                SUM(status = 'CANCELADO')
            )
        )
        ELSE 0
    END AS percentual_processado,

    CASE
        WHEN (
            SUM(status = 'PROCESSADO') +
            SUM(status = 'PENDENTE') +
            SUM(status = 'CANCELADO')
        ) > 0
        THEN ROUND(
            SUM(status = 'PENDENTE') * 100 /
            (
                SUM(status = 'PROCESSADO') +
                SUM(status = 'PENDENTE') +
                SUM(status = 'CANCELADO')
            )
        )
        ELSE 0
    END AS percentual_pendente,

    CASE
        WHEN (
            SUM(status = 'PROCESSADO') +
            SUM(status = 'PENDENTE') +
            SUM(status = 'CANCELADO')
        ) > 0
        THEN ROUND(
            SUM(status = 'CANCELADO') * 100 /
            (
                SUM(status = 'PROCESSADO') +
                SUM(status = 'PENDENTE') +
                SUM(status = 'CANCELADO')
            )
        )
        ELSE 0
    END AS percentual_cancelado

FROM entrada;
            """
            cursor.execute(sql)
            return cursor.fetchone()
        finally:
            cursor.close()
            conexao.close()