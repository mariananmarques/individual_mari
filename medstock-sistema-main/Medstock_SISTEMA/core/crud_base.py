from core.database import conectar_banco

# = Feito pela -- Ana Beatriz //

# CLASSE CRUD ==============================

class Crudmedstock:
    table = ""
    fields = []

# SELECIONA TUDO NO BANCO E ORDENA
    @classmethod
    def seleciona_tudo(cls, order_by="id"):
        conexao = conectar_banco.connect()
        cursor = conexao.cursor(dictionary=True)
        try:
            sql = f"SELECT * FROM {cls.table} ORDER BY {order_by}"
            cursor.execute(sql)
            return cursor.fetchall()
        finally:
            cursor.close()
            conexao.close()

# SELECIONA TUDO NO BANCO PELO ID
    @classmethod
    def seleciona_por_id(cls, id):
        conexao = conectar_banco.connect()
        cursor = conexao.cursor(dictionary=True)
        try:
            sql = f"SELECT * FROM {cls.table} WHERE id = %s"
            cursor.execute(sql, (id,))
            return cursor.fetchone()
        finally:
            cursor.close()
            conexao.close()



# DELETA SELECIONANDO POR ID
    @classmethod
    def delete(cls, id):
        conexao = conectar_banco.connect()
        cursor = conexao.cursor()
        try:
            sql = f"DELETE FROM {cls.table} WHERE id = %s"
            cursor.execute(sql, (id,))
            conexao.commit()
            return cursor.rowcount
        except Exception:
            conexao.rollback()
            raise
        finally:
            cursor.close()
            conexao.close()


# GRAVA NO BANCO
    def insert(self):
        conexao = conectar_banco.connect()
        cursor = conexao.cursor()
        try:
            colunas = ", ".join(self.fields)
            marcadores = ", ".join(["%s"] * len(self.fields))
            valores = tuple(getattr(self, campo) for campo in self.fields)
            sql = f"INSERT INTO {self.table} ({colunas}) VALUES ({marcadores})"
            print(sql)
            cursor.execute(sql, valores)
            conexao.commit()
            return cursor.lastrowid
        except Exception:
            conexao.rollback()
            raise
        finally:
            cursor.close()
            conexao.close()


# ATUALIZA OS DADOS DO BANCO
    def atualizar(self, id):
        conexao = conectar_banco.connect()
        cursor = conexao.cursor()
        try:
            campos = ", ".join([f"{campo} = %s" for campo in self.fields])
            valores = tuple(getattr(self, campo) for campo in self.fields) + (id,)
            sql = f"UPDATE {self.table} SET {campos} WHERE id = %s"
            print(sql)
            print(valores)          
            cursor.execute(sql, valores)
            conexao.commit()
            return cursor.rowcount
        except Exception:
            conexao.rollback()
            raise
        finally:
            cursor.close()
            conexao.close()
