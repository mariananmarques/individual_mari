"""
iot_mqtt.py
Envia comandos do site MedStock (Flask) para o ESP32 via HiveMQ Cloud.

Instalar:  pip install paho-mqtt

Uso:
    from iot_mqtt import sinalizar
    sinalizar("busca")      # bip curto + LED
    sinalizar("cadastro")   # bip longo + LED
"""

import json
import os
import threading

import paho.mqtt.client as mqtt


# =====================================================
# CONFIGURACAO (pode ser trocada por variaveis de ambiente)
# =====================================================

MQTT_BROKER = os.getenv(
    "MQTT_BROKER",
    "b1600c60a35c4520b32b9507d0b47b02.s1.eu.hivemq.cloud"
)

MQTT_PORT = int(os.getenv("MQTT_PORT", "8883"))

MQTT_USER = os.getenv("MQTT_USER", "IOT-SENAI")
MQTT_PASSWORD = os.getenv("MQTT_PASSWORD", "12345678")

# Mesmo topico que o ESP32 escuta
MQTT_TOPIC_COMANDOS = os.getenv("MQTT_TOPIC_COMANDOS", "medstock/comandos")

DEVICE_ID = "medstock"

# Client ID DIFERENTE do ESP32 (se fosse igual, um derrubaria o outro).
# O PID evita conflito quando o Flask roda com reloader (2 processos).
MQTT_CLIENT_ID = "medstock-web-" + str(os.getpid())


# Duracao de cada evento (milissegundos)
EVENTOS = {
    "busca": 50,       # bip curto ao buscar codigo de barras
    "cadastro": 100,    # bip longo ao cadastrar produto
    "saida": 50,
}


# =====================================================
# CLIENTE MQTT (criado uma unica vez e reaproveitado)
# =====================================================

_client = None
_lock = threading.Lock()


def _obter_cliente():

    global _client

    with _lock:

        if _client is None:

            cliente = mqtt.Client(
                mqtt.CallbackAPIVersion.VERSION2,
                client_id=MQTT_CLIENT_ID
            )

            cliente.username_pw_set(MQTT_USER, MQTT_PASSWORD)

            # TLS com os certificados do sistema (HiveMQ Cloud exige TLS)
            cliente.tls_set()

            cliente.reconnect_delay_set(min_delay=1, max_delay=30)

            # Conecta em segundo plano, sem travar o site
            cliente.connect_async(MQTT_BROKER, MQTT_PORT, keepalive=60)

            cliente.loop_start()

            _client = cliente

        return _client


# =====================================================
# FUNCOES PUBLICAS
# =====================================================

def enviar_comando(comando):
    """Publica um comando JSON no topico do ESP32. Retorna True/False."""

    try:

        comando = dict(comando)
        comando.setdefault("device_id", DEVICE_ID)

        cliente = _obter_cliente()

        # qos=1: se ainda estiver conectando, a mensagem fica na fila
        cliente.publish(
            MQTT_TOPIC_COMANDOS,
            json.dumps(comando),
            qos=1
        )

        return True

    except Exception as erro:

        print("[IoT] Falha ao enviar comando:", erro)

        return False


def sinalizar(evento):
    """Acende o LED e apita o buzzer. evento: 'busca' ou 'cadastro'."""

    duracao = EVENTOS.get(evento)

    if duracao is None:

        print("[IoT] Evento desconhecido:", evento)

        return False

    return enviar_comando({
        "atuador": "alerta",
        "acao": "sinal",
        "duracao_ms": duracao
    })