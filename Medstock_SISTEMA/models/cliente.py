from core.crud_base import Crudmedstock
from core.database import conectar_banco
from core.validador import Validador
from core.seguranca import gerar_hash_senha, verificar_senha

#! = Feito pela -- Ana Beatriz // 𖹭.ᐟ/

#============================ CLASSE CLIENTE =========================

class Cliente(Crudmedstock):
    table = "cliente"
    fields = [
        "nome",
        "email",
        "cpf",
        "senha",
        "status"
    ]

    def __init__(self, nome, email, cpf, senha, status):
        self.nome = nome
        self.email = email
        self.cpf = cpf
        self.senha = senha
        self.status = status

#=============================VALIDAÇÃO==============================
    def validate(self):
        erros = [
            Validador.obrigatorio(self.nome, "nome"),
            Validador.minimo_de_caracteres(self.nome, "nome", 3),
            Validador.nao_contem_numero(self.nome, "nome"),
            Validador.valida_externa_email(self.email, "email", "22558|TvTq03AbZrLvC2Db5SLfeCW67P49qnQ3"),
            Validador.valida_externa_cpf(self.cpf, "cpf", "22601|DhtAI0atZD6XdPErFqF1sG0c5jQ2y9Vy"),
            Validador.letra_maiuscula(self.senha, "senha"),
            Validador.letra_minuscula(self.senha, "senha"),
            Validador.contem_numero(self.senha, "senha"),
            Validador.minimo_de_caracteres(self.senha, "senha", 8),
        ]
        return [erro for erro in erros if erro]
#===========================================================
    @classmethod
    def deletar_cliente(cls, id):
        cliente = cls.seleciona_por_id(id)
        if not cliente:
            raise ValueError("Cliente não encontrado.")
        '''if cls.has_related_records(id): #! atencao
            raise ValueError("Não é possível excluir o produto porque ele possui pedidos ou movimentações vinculadas.")'''
        cls.delete(id)


    def inserir_usuario(self, dados):
        """
        Cadastra um usuário criptografando a senha com bcrypt.
        """
        self.senha = gerar_hash_senha(self.senha)
        return self.insert()

    # SELECIONA TUDO POR EMAIL
    @classmethod
    def seleciona_por_email(cls, email):
        conexao = conectar_banco.connect()
        cursor = conexao.cursor(dictionary=True)
        try:
            sql = f"SELECT * FROM {cls.table} WHERE email = %s"
            cursor.execute(sql, (email,))
            return cursor.fetchone()
        finally:
            cursor.close()
            conexao.close()

    def atualizar_usuario(self, id_usuario, dados):
        """
        Atualiza usuário.
        Caso venha uma nova senha, criptografa antes de salvar.
        """
        senha = dados.get("senha")

        if senha:
            dados["senha"] = gerar_hash_senha(senha)
        else:
            dados.pop("senha", None)

        self.atualizar(id_usuario, dados)

    @classmethod
    def autenticar(cls, email, senha):
        """
        Verifica se o usuário existe e se a senha está correta.
        """
        conexao = conectar_banco.connect()
        cursor = conexao.cursor(dictionary=True)

        sql = """
            SELECT *
            FROM cliente
            WHERE email = %s
            AND status = 'ativo'
        """

        cursor.execute(sql, (email,))
        usuario = cursor.fetchone()

        cursor.close()
        conexao.close()

        if usuario is None:
            return None

        senha_banco = usuario["senha"]

        if verificar_senha(senha, senha_banco):
            return usuario

        return None


    @classmethod
    def seleciona_por_email(cls, email):

        conn = conectar_banco.connect()
        cursor = conn.cursor(dictionary=True)

        try:

            sql = """
                SELECT
                    id,
                    nome,
                    email,
                    cpf,
                    senha,
                    status
                FROM cliente
                WHERE email = %s
                LIMIT 1
            """

            cursor.execute(
                sql,
                (email,)
            )

            return cursor.fetchone()

        finally:

            cursor.close()
            conn.close()

    @classmethod
    def atualizar_senha(cls, cliente_id, senha_hash):

        conn = conectar_banco.connect()
        cursor = conn.cursor()

        try:

            cursor.execute(
                """
                UPDATE cliente
                SET senha = %s
                WHERE id = %s
                """,
                (
                    senha_hash,
                    cliente_id
                )
            )

            conn.commit()

        finally:

            cursor.close()
            conn.close()
'''
    @classmethod
    def atualizar_senha(cls, id, nova_senha):

        conn = conectar_banco.connect()
        cursor = conn.cursor()

        try:

            sql = """
                UPDATE cliente
                SET senha = %s
                WHERE id = %s
            """

            cursor.execute(
                sql,
                (nova_senha, id)
            )

            conn.commit()

        finally:

            cursor.close()
            conn.close()
'''