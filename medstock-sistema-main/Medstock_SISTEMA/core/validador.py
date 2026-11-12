import requests
import urllib.parse

# = Feito pela -- Ana Beatriz //

    #==================== CLASSE - VALIDAÇÃO poo=========================

class Validador:

    #NÃO DEVE SER VAZIO=========================
    @staticmethod
    def obrigatorio(value, field_name):
        if value is None or str(value).strip() == "":
            return f"O campo {field_name} é obrigatório."
        return None

    #NÃO PODE SER NEGATIVO=========================
    @staticmethod
    def nao_negativo(value, field_name):
        try:
            if float(value) < 0:
                return f"O campo {field_name} não pode ser negativo."
        except (TypeError, ValueError):
            return f"O campo {field_name} deve ser numérico."
        return None

    #DEVE SER MAIOR QUE ZERO=========================
    @staticmethod
    def positivo(value, field_name):
        try:
            if int(value) <= 0:
                return f"O campo {field_name} deve ser maior que zero."
        except (TypeError, ValueError):
            return f"O campo {field_name} deve ser numérico."
        return None

    @staticmethod
    def letra_maiuscula(value, field_name):
        try:
            for caractere in value:
                if caractere.isupper():
                    return None
            return f"O campo {field_name} deve ter pelo menos uma letra maiúscula."
        except (TypeError, ValueError):
            return f"O campo {field_name} é obrigatório"


    @staticmethod
    def letra_minuscula(value, field_name):
        try:
            for caractere in value:
                if caractere.islower():
                    return None
            return f"O campo {field_name} deve ter pelo menos uma letra minúscula."
        except (TypeError, ValueError):
            return f"O campo {field_name} é obrigatório"

    #DEVE CONTER UM NÚMERO =========================
    @staticmethod
    def contem_numero(value, field_name):
        try:
            for caractere in value:
                if caractere.isdigit():
                    return None
            return f"O campo {field_name} deve ter pelo menos um número"
        except (TypeError, ValueError):
            return f"O campo {field_name} é obrigatório"

    #DEVE POSSUIR UM MINIMO DE CARACTERES (EX: 3, 8, 12)=========================
    @staticmethod
    def minimo_de_caracteres(value, field_name, min_len): #validador.minimo_de_caracteres(self.nome, "nome", nº)
        try:
            if len(value) < min_len:
                return f"O campo {field_name} deve ter pelo menos {min_len} caracteres."
        except (TypeError, ValueError):
            return f"O campo {field_name} é obrigatório"
        return None

    #DEVE POSSUIR ESPAÇO =========================
    @staticmethod
    def contem_espaco(value, field_name):
        try:
            for caractere in value:
                if caractere.isspace():
                    return None
            return f"O campo {field_name} deve ter pelo menos um espaço."
        except (TypeError, ValueError):
            return f"O campo {field_name} é obrigatório"

    #NÃO DEVE POSSUIR LETRA =========================
    @staticmethod
    def contem_letra(value, field_name):
        try:
            for caractere in value:
                if caractere.isalpha():
                    return f"O campo {field_name} não deve possuir letra."
        except (TypeError, ValueError):
            return f"O campo {field_name} é obrigatório"
        return None

    #NÃO DEVE POSSUIR NÚMERO =========================
    @staticmethod
    def nao_contem_numero(value, field_name):
        try:
            for caractere in value:
                if caractere.isdigit():
                    return f"O campo {field_name} não deve possuir número."
        except (TypeError, ValueError):
            return f"O campo {field_name} é obrigatório"
        return None

#=================VALIDAÇÃO EXTERNA=========================
    #Valida email externamente==============================
    # token = "22558|TvTq03AbZrLvC2Db5SLfeCW67P49qnQ3"
    @staticmethod #Validador.valida_externa_email(self.email, "email" token)
    def valida_externa_email(value, field_name, token):
        base_url = "https://api.invertexto.com/v1/email-validator"
        email_encoded = urllib.parse.quote(value)
        url = f"{base_url}/{email_encoded}"
        params = {"token": token}

        try:
            response = requests.get(url, params=params)
            response.raise_for_status()
            data = response.json()

            # Verifica se o email é valido
            if not data.get('valid_format') or not data.get('valid_mx'):
                return f"O campo {field_name} é inválido."
            return None

        except requests.exceptions.HTTPError as errh:
            return f"Erro HTTP: {errh}"
        except requests.exceptions.ConnectionError as errc:
            return f"Erro de conexão: {errc}"
        except requests.exceptions.Timeout as errt:
            return f"Timeout: {errt}"
        except requests.exceptions.RequestException as err:
            return f"Erro: {err}"

    #Valida cpf externamente==============================
    # token = "22601|DhtAI0atZD6XdPErFqF1sG0c5jQ2y9Vy"
    @staticmethod #Validador.valida_externa_cpf(self.cpf, "cpf" token)
    def valida_externa_cpf(value, field_name, token):
        base_url = "https://api.invertexto.com/v1/validator"

        params = {
        "token": token,
        "value": value
        }

        try:
            response = requests.get(base_url, params=params)
            response.raise_for_status()
            data = response.json()

            if 'valid' in data:
                if not data['valid']:
                    return f"O campo {field_name} é inválido."
            return None

        except requests.exceptions.HTTPError as errh:
            return f"Erro HTTP: {errh}"
        except requests.exceptions.ConnectionError as errc:
            return f"Erro de conexão: {errc}"
        except requests.exceptions.Timeout as errt:
            return f"Timeout: {errt}"
        except requests.exceptions.RequestException as err:
            return f"Erro: {err}"