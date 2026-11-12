from datetime import datetime
from core.crud_base import Crudmedstock
from core.database import conectar_banco
from core.validador import Validador
from models.produto import Produto

#from models.movimentacao import Movimentacao #! err

#! = Feito pela -- Ana Beatriz //  𖹭.ᐟ

#============================ CLASSE PEDIDO ENTRADA =========================
class PedidoSaida(Crudmedstock):
    table = "saida"
    fields = [
        "data_pedido",
        "valor_total",
        "observacao",
        "quantidade_pedido",
        "data_processamento",
        "status",
        "clientes_cadastro_id",
        "produto_id"
    ]

    def __init__(self, data_pedido, valor_total, clientes_cadastro_id, produto_id, quantidade_pedido,status="PENDENTE", observacao="", data_processamento=None):
        self.data_pedido = data_pedido or datetime.now()
        self.valor_total = valor_total
        self.clientes_cadastro_id = clientes_cadastro_id
        self.produto_id = produto_id
        self.observacao = observacao
        self.quantidade_pedido = quantidade_pedido
        self.data_processamento = data_processamento
        self.status = status

#============================ VALIDAÇÃO =========================
    def validate(self):
        erros = [
            Validador.obrigatorio(self.quantidade_pedido, "quantidade_pedido"),
        ]
        return [erro for erro in erros if erro]

    @classmethod
    def encontra_tudo_com_produto(cls):
        conexao = conectar_banco.connect()
        cursor = conexao.cursor(dictionary=True)
        try:
            sql = """
            SELECT * from saida 
            order by data_pedido desc
            """
            cursor.execute(sql)
            return cursor.fetchall()
        finally:
            cursor.close()
            conexao.close()

    @classmethod
    def historico_saida(cls):

        conexao = conectar_banco.connect()
        cursor = conexao.cursor(dictionary=True)

        try:

            sql = """
            SELECT
                e.id,
                c.nome AS cliente,
                p.nome,
                p.imagem,
                e.quantidade_pedido,
                e.observacao,
                e.valor_total,
                e.status,
                e.data_pedido

            FROM saida e

            JOIN clientes_cadastro c
                ON e.clientes_cadastro_id = c.id

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
    def seleciona_por_clientes(cls, clientes_cadastro_id):

        conexao = conectar_banco.connect()
        cursor = conexao.cursor(dictionary=True)

        try:

            sql = """
            SELECT
                s.id,
                p.nome,
                c.nome AS cliente,
                s.quantidade_pedido,
                s.observacao,
                s.valor_total,
                s.status,
                s.data_pedido

            FROM saida s

            JOIN produto p
                ON s.produto_id = p.id

            JOIN clientes_cadastro c
                ON s.clientes_cadastro_id = c.id

            WHERE s.clientes_cadastro_id = %s

            ORDER BY s.data_pedido DESC
            """

            cursor.execute(sql, (clientes_cadastro_id,))
            return cursor.fetchall()

        finally:
            cursor.close()
            conexao.close()


    @classmethod
    def processar_saida(cls, id):
        conexao = conectar_banco.connect()
        cursor = conexao.cursor(dictionary=True)
        try:
            conexao.start_transaction()
            # ==========================================
            # BUSCA SAÍDA
            # ==========================================
            cursor.execute(
                """
                SELECT *
                FROM saida
                WHERE id = %s
                FOR UPDATE
                """,
                (id,)
            )

            saida = cursor.fetchone()

            if not saida:
                raise ValueError("Saída não encontrada.")

            # ==========================================
            # VERIFICA SE JÁ FOI PROCESSADA
            # ==========================================
            if saida["status"] != "PENDENTE":
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
                (saida["produto_id"],)
            )

            produto = cursor.fetchone()

            if not produto:
                raise ValueError("Produto não encontrado.")

            # ==========================================
            # VERIFICA ESTOQUE
            # ==========================================
            if produto["quantidade_estoque"] < saida["quantidade_pedido"]:
                raise ValueError("Estoque insuficiente.")

            # ==========================================
            # CALCULA NOVO ESTOQUE
            # ==========================================
            nova_quantidade = (
                produto["quantidade_estoque"]
                - saida["quantidade_pedido"]
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
                    cliente_id,
                    saida_id
                )
                VALUES (
                    %s, %s, %s, %s, %s, %s, %s
                )
                """,
                (
                    "SAIDA",
                    saida["quantidade_pedido"],
                    saida["valor_total"],
                    datetime.now(),
                    saida["produto_id"],
                    saida["clientes_cadastro_id"],
                    saida["id"]
                )
            )

            # ==========================================
            # MARCA COMO PROCESSADA
            # ==========================================
            cursor.execute(
    """
    UPDATE saida
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

            return "Saída processada com sucesso."

        except Exception:

            conexao.rollback()
            raise

        finally:

            cursor.close()
            conexao.close()


    @classmethod
    def deletar_saida(cls, id):

        conexao = conectar_banco.connect()

        cursor = conexao.cursor(dictionary=True)

        try:

            conexao.start_transaction()

            # ==========================================
            # BUSCA SAÍDA
            # ==========================================
            cursor.execute(
                """
                SELECT *
                FROM saida
                WHERE id = %s
                """,
                (id,)
            )

            saida = cursor.fetchone()

            if not saida:
                raise ValueError("Saída não encontrada.")

            # ==========================================
            # VERIFICA STATUS
            # ==========================================
            if saida["status"] != "PENDENTE":
                raise ValueError("Somente pedidos pendentes podem ser cancelados.")

            # ==========================================
            # MARCA COMO CANCELADO
            # ==========================================
            cursor.execute(
                """
                UPDATE saida
                SET status = %s
                WHERE id = %s
                """,
                ("CANCELADO", id)
            )

            # ==========================================
            # COMMIT
            # ==========================================
            conexao.commit()

            return "Saída deletada com sucesso."

        except Exception:

            conexao.rollback()
            raise

        finally:

            cursor.close()
            conexao.close()


    @classmethod
    def status_pedido_saida(cls):
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

                FROM saida;
            """

            cursor.execute(sql)

            return cursor.fetchone()

        finally:
            cursor.close()
            conexao.close()