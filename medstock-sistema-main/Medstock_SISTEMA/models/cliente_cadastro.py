from core.crud_base import Crudmedstock
from core.database import conectar_banco
from core.validador import Validador

#! = Feito pela -- Ana Beatriz // linha 1 a 45 𖹭.ᐟ

#============================ CLASSE CLIENTE CADASTRO =========================

class ClientesCadastro(Crudmedstock):
    table = "clientes_cadastro"
    fields = [
        "nome",
        "cpf",
        "telefone",
        "cidade",
        "estado",
        "cep",
        "ativo"
    ]

    def __init__(self, nome, cpf, telefone, cidade, estado, cep, ativo=True):
        self.nome = nome
        self.cpf = cpf
        self.telefone = telefone
        self.cidade = cidade
        self.estado = estado
        self.cep = cep
        self.ativo = ativo

#=============================VALIDAÇÃO==============================
    def validate(self):
        erros = [
            Validador.obrigatorio(self.nome, "nome"),
            Validador.obrigatorio(self.cpf, "cpf"),
            Validador.obrigatorio(self.telefone, "telefone"),
            Validador.contem_letra(self.telefone, "telefone"),
            Validador.contem_letra(self.cpf, "cpf"),
            Validador.obrigatorio(self.cidade, "cidade"),
            Validador.obrigatorio(self.estado, "estado"),
            Validador.obrigatorio(self.cep, "cep"),
            Validador.minimo_de_caracteres(self.nome, "nome", 3),
            Validador.minimo_de_caracteres(self.cpf, "cpf", 11),
            Validador.minimo_de_caracteres(self.cep, "cep", 8),
            Validador.minimo_de_caracteres(self.telefone, "telefone", 11),
            Validador.valida_externa_cpf(self.cpf, "cpf", "22601|DhtAI0atZD6XdPErFqF1sG0c5jQ2y9Vy"),
        ]
        return [erro for erro in erros if erro]
#===========================================================
 
    @classmethod
    def deletar_clientes_cadastroa(cls, id):
        clientes_cadastro = cls.seleciona_por_id(id)
        if not clientes_cadastro:
            raise ValueError("Cliente não encontrado.")
        cls.delete(id)


    @classmethod
    def deletar_clientes_cadastro(cls, id):
        conexao = conectar_banco.connect()
        cursor = conexao.cursor()

        try:
            sql = """
            UPDATE clientes_cadastro
            SET ativo = FALSE
            WHERE id = %s
            """
            cursor.execute(sql, (id,))
            conexao.commit()

        finally:
            cursor.close()
            conexao.close()

    
    @classmethod
    def seleciona_todos_clientescadastro(cls):
        conexao = conectar_banco.connect()
        cursor = conexao.cursor(dictionary=True)

        try:
            sql = """
            SELECT *
            FROM clientes_cadastro
            WHERE ativo = TRUE
            ORDER BY nome
            """

            cursor.execute(sql)
            return cursor.fetchall()

        finally:
            cursor.close()
            conexao.close()

#! = Feito pela -- Ana Beatriz // linha 1 a 45 𖹭.ᐟ