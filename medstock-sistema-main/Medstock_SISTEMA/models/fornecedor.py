from core.crud_base import Crudmedstock
from core.database import conectar_banco
from core.validador import Validador

#! = Feito pela -- Ana Beatriz // linha 1 a 41 𖹭.ᐟ

#============================ CLASSE FORNECEDOR =========================

class Fornecedor(Crudmedstock):
    table = "fornecedor"
    fields = [
        "nome_fornecedor",
        "cnpj",
        "email",
        "ativo"
    ]

    def __init__(self, nome_fornecedor, cnpj, email, ativo=True):
        self.nome_fornecedor = nome_fornecedor
        self.cnpj = cnpj
        self.email = email
        self.ativo = ativo

#=============================VALIDAÇÃO==============================
    def validate(self):
        erros = [
            Validador.obrigatorio(self.nome_fornecedor, "nome_fornecedor"),
            Validador.minimo_de_caracteres(self.nome_fornecedor, "nome_fornecedor", 3),
            Validador.minimo_de_caracteres(self.cnpj, "cnpj", 14),
            Validador.valida_externa_email(self.email, "email", "22558|TvTq03AbZrLvC2Db5SLfeCW67P49qnQ3"),
        ]
        return [erro for erro in erros if erro]
#===========================================================
    @classmethod
    def deletar_fornecedor(cls, id):
        conexao = conectar_banco.connect()
        cursor = conexao.cursor()

        try:
            sql = """
            UPDATE fornecedor
            SET ativo = FALSE
            WHERE id = %s
            """

            cursor.execute(sql, (id,))
            conexao.commit()

        finally:
            cursor.close()
            conexao.close()

    @classmethod
    def seleciona_todos_fornecedores(cls):
        conexao = conectar_banco.connect()
        cursor = conexao.cursor(dictionary=True)

        try:
            sql = """
            SELECT *
            FROM fornecedor
            WHERE ativo = TRUE
            ORDER BY nome_fornecedor
            """

            cursor.execute(sql)
            return cursor.fetchall()

        finally:
            cursor.close()
            conexao.close()


#! = Feito pela -- Ana Beatriz // linha 1 a 41 𖹭.ᐟ