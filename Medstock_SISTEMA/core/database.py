import mysql.connector
from mysql.connector import Error
from bd_config import DB_CONFIG

# CONECTA AO BANCO DE DADOS DO SISTEMA
class conectar_banco:
    @staticmethod
    def connect():
        try:
            return mysql.connector.connect(**DB_CONFIG)
        except Error as e:
            raise Exception(f"Falha na conexão com o banco de dados: {e}")
