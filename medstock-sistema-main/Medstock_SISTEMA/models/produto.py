
from core.crud_base import Crudmedstock
from core.database import conectar_banco
from core.validador import Validador


# ============================================================
# CLASSE PRODUTO
# Feito por Ana Beatriz
# ============================================================

class Produto(Crudmedstock):

    table = "produto"

    # Campos utilizados pelo CRUD herdado de Crudmedstock.
    # codigo_barras e marca foram adicionados.
    fields = [
        "fornecedor_id",
        "nome",
        "codigo_barras",
        "marca",
        "quantidade_estoque",
        "categoria",
        "estoque_minimo",
        "preco_custo",
        "preco_venda",
        "imagem",
        "data_validade",
        "tipo_medicamento",
        "ativo"
    ]

    # ========================================================
    # CONSTRUTOR
    # ========================================================

    def __init__(
        self,
        fornecedor_id,
        nome,
        quantidade_estoque,
        categoria,
        estoque_minimo,
        preco_custo,
        preco_venda,
        imagem=None,
        data_validade=None,
        tipo_medicamento="outros",
        ativo=True,
        codigo_barras=None,
        marca=None,
        id=None,
        **kwargs
    ):
        self.id = id
        self.fornecedor_id = fornecedor_id
        self.nome = nome
        self.codigo_barras = codigo_barras
        self.marca = marca
        self.quantidade_estoque = quantidade_estoque
        self.categoria = categoria
        self.estoque_minimo = estoque_minimo
        self.preco_custo = preco_custo
        self.preco_venda = preco_venda
        self.imagem = imagem
        self.data_validade = data_validade
        self.tipo_medicamento = tipo_medicamento
        self.ativo = ativo

        # Permite receber outros atributos sem quebrar
        # chamadas antigas que enviem campos adicionais.
        for campo, valor in kwargs.items():
            setattr(self, campo, valor)

    # ========================================================
    # VALIDAÇÃO
    # ========================================================

    def validate(self):
        erros = [
            Validador.obrigatorio(self.nome, "nome"),
            Validador.obrigatorio(
                self.quantidade_estoque,
                "quantidade_estoque"
            ),
            Validador.nao_negativo(
                self.quantidade_estoque,
                "quantidade_estoque"
            ),
            Validador.obrigatorio(
                self.preco_custo,
                "preço de custo"
            ),
            Validador.nao_negativo(
                self.preco_custo,
                "preço de custo"
            ),
            Validador.obrigatorio(
                self.preco_venda,
                "preço de venda"
            ),
            Validador.nao_negativo(
                self.preco_venda,
                "preço de venda"
            ),
            Validador.obrigatorio(
                self.estoque_minimo,
                "estoque_minimo"
            ),
            Validador.nao_negativo(
                self.estoque_minimo,
                "estoque_minimo"
            )
        ]

        return [erro for erro in erros if erro]

    # ========================================================
    # SELECIONAR TODOS OS PRODUTOS COM FORNECEDOR
    # ========================================================

    @classmethod
    def seleciona_todos_produtos(cls):
        conexao = conectar_banco.connect()
        cursor = conexao.cursor(dictionary=True)

        try:
            sql = """
                SELECT
                    p.*,
                    f.nome_fornecedor
                FROM produto p
                LEFT JOIN fornecedor f
                    ON p.fornecedor_id = f.id
                WHERE p.ativo = TRUE
                ORDER BY p.nome
            """

            cursor.execute(sql)
            return cursor.fetchall()

        finally:
            cursor.close()
            conexao.close()

    # ========================================================
    # ALIAS PARA COMPATIBILIDADE COM OUTRAS ROTAS
    # ========================================================

    @classmethod
    def seleciona_tudo(cls):
        return cls.seleciona_todos_produtos()

    # ========================================================
    # SELECIONAR PRODUTO POR ID
    # ========================================================

    @classmethod
    def seleciona_por_id(cls, id):
        conexao = conectar_banco.connect()
        cursor = conexao.cursor(dictionary=True)

        try:
            sql = """
                SELECT *
                FROM produto
                WHERE id = %s
                  AND ativo = TRUE
                LIMIT 1
            """

            cursor.execute(sql, (id,))
            return cursor.fetchone()

        finally:
            cursor.close()
            conexao.close()

    # ========================================================
    # SELECIONAR PRODUTO POR ID COM FORNECEDOR
    # ========================================================

    @classmethod
    def seleciona_por_id_com_fornecedor(cls, id):
        conexao = conectar_banco.connect()
        cursor = conexao.cursor(dictionary=True)

        try:
            sql = """
                SELECT
                    p.*,
                    f.nome_fornecedor
                FROM produto p
                LEFT JOIN fornecedor f
                    ON p.fornecedor_id = f.id
                WHERE p.id = %s
                  AND p.ativo = TRUE
                LIMIT 1
            """

            cursor.execute(sql, (id,))
            return cursor.fetchone()

        finally:
            cursor.close()
            conexao.close()

    # ========================================================
    # NOVO: SELECIONAR PRODUTO POR CÓDIGO DE BARRAS
    # ========================================================

    @classmethod
    def seleciona_por_codigo_barras(cls, codigo):
        if codigo is None:
            return None

        codigo = str(codigo).strip()

        if not codigo:
            return None

        conexao = conectar_banco.connect()
        cursor = conexao.cursor(dictionary=True)

        try:
            sql = """
                SELECT
                    p.*,
                    f.nome_fornecedor
                FROM produto p
                LEFT JOIN fornecedor f
                    ON p.fornecedor_id = f.id
                WHERE p.codigo_barras = %s
                  AND p.ativo = TRUE
                LIMIT 1
            """

            cursor.execute(sql, (codigo,))
            return cursor.fetchone()

        finally:
            cursor.close()
            conexao.close()

    # ========================================================
    # DELETAR PRODUTO (EXCLUSÃO LÓGICA)
    # ========================================================

    @classmethod
    def deletar_produto(cls, id):
        conexao = conectar_banco.connect()
        cursor = conexao.cursor()

        try:
            sql = """
                UPDATE produto
                SET ativo = FALSE
                WHERE id = %s
            """

            cursor.execute(sql, (id,))
            conexao.commit()

            return cursor.rowcount

        except Exception:
            conexao.rollback()
            raise

        finally:
            cursor.close()
            conexao.close()

    # ========================================================
    # SELECIONAR PRODUTOS POR FORNECEDOR
    # ========================================================

    @classmethod
    def seleciona_por_fornecedor(cls, fornecedor_id):
        conexao = conectar_banco.connect()
        cursor = conexao.cursor(dictionary=True)

        try:
            sql = """
                SELECT *
                FROM produto
                WHERE fornecedor_id = %s
                  AND ativo = TRUE
                ORDER BY nome
            """

            cursor.execute(sql, (fornecedor_id,))
            return cursor.fetchall()

        finally:
            cursor.close()
            conexao.close()

    # ========================================================
    # ATUALIZAR QUANTIDADE EM ESTOQUE
    # ========================================================

    @classmethod
    def upd_quantidade(
        cls,
        id,
        nova_quantidade,
        connection=None
    ):
        conexao = connection or conectar_banco.connect()
        cursor = conexao.cursor()

        try:
            sql = """
                UPDATE produto
                SET quantidade_estoque = %s
                WHERE id = %s
            """

            cursor.execute(sql, (nova_quantidade, id))

            if connection is None:
                conexao.commit()

            return cursor.rowcount

        except Exception:
            if connection is None:
                conexao.rollback()
            raise

        finally:
            cursor.close()

            if connection is None:
                conexao.close()

    # ========================================================
    # PRODUTOS COM ESTOQUE BAIXO
    # ========================================================

    @classmethod
    def seleciona_produtos_estoque_baixo(cls):
        conexao = conectar_banco.connect()
        cursor = conexao.cursor(dictionary=True)

        try:
            sql = """
                SELECT
                    id,
                    nome,
                    codigo_barras,
                    marca,
                    quantidade_estoque AS quantidade,
                    estoque_minimo,
                    categoria
                FROM produto
                WHERE ativo = TRUE
                  AND quantidade_estoque <= estoque_minimo
                ORDER BY quantidade_estoque ASC
            """

            cursor.execute(sql)
            return cursor.fetchall()

        finally:
            cursor.close()
            conexao.close()

    # ========================================================
    # PRODUTOS COM ESTOQUE CRÍTICO
    # ========================================================

    @classmethod
    def estoque_critico(cls):
        conexao = conectar_banco.connect()
        cursor = conexao.cursor(dictionary=True)

        try:
            sql = """
                SELECT
                    COUNT(*) OVER() AS total_criticos,
                    id,
                    nome,
                    codigo_barras,
                    marca,
                    quantidade_estoque AS quantidade,
                    estoque_minimo,
                    categoria
                FROM produto
                WHERE ativo = TRUE
                  AND quantidade_estoque <= estoque_minimo / 2
                ORDER BY quantidade_estoque ASC
            """

            cursor.execute(sql)
            return cursor.fetchall()

        finally:
            cursor.close()
            conexao.close()

    # ========================================================
    # VALORES FINANCEIROS DO ESTOQUE
    # ========================================================

    @classmethod
    def valores_financeiros_estoque(cls):
        conexao = conectar_banco.connect()
        cursor = conexao.cursor(dictionary=True)

        try:
            sql = """
                SELECT
                    COALESCE(
                        SUM(quantidade_estoque * preco_custo),
                        0
                    ) AS valor_custo,

                    COALESCE(
                        SUM(quantidade_estoque * preco_venda),
                        0
                    ) AS valor_venda,

                    COALESCE(
                        SUM(
                            quantidade_estoque *
                            (preco_venda - preco_custo)
                        ),
                        0
                    ) AS lucro_potencial

                FROM produto
                WHERE ativo = TRUE
            """

            cursor.execute(sql)
            return cursor.fetchone()

        finally:
            cursor.close()
            conexao.close()
