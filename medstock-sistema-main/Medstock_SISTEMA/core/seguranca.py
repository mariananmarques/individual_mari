from functools import wraps
from flask import session, redirect, url_for, flash
import bcrypt


def gerar_hash_senha(senha):
    """
    Recebe uma senha em texto puro e retorna a senha criptografada.
    """
    senha_hash = bcrypt.hashpw(
        senha.encode("utf-8"),
        bcrypt.gensalt()
    )

    return senha_hash.decode("utf-8")


def verificar_senha(senha_digitada, senha_hash_banco):
    """
    Compara a senha digitada com a senha criptografada salva no banco.
    """
    return bcrypt.checkpw(
        senha_digitada.encode("utf-8"),
        senha_hash_banco.encode("utf-8")
    )


def login_obrigatorio(funcao):
    """
    Decorador para proteger rotas que exigem login.
    """
    @wraps(funcao)
    def wrapper(*args, **kwargs):
        if "usuario_id" not in session:
            flash("Faça login para acessar o sistema.", "warning")
            return redirect(url_for("login"))

        return funcao(*args, **kwargs)

    return wrapper