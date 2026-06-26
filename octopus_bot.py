import os
import requests
import json
from datetime import datetime

class Octopus2Bot:
    def __init__(self):
        # Récupération stricte des variables d'environnement fournies par les Secrets GitHub
        self.cible_ip = os.getenv("IP_CIBLE")
        self.api_token = os.getenv("MON_API_TOKEN")
        self.fichier_donnees = "octopus_essentiel.json"

    def interroger_movitel(self):
        horodatage = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        print("[🐙 Octopus2] Initialisation de l'analyse.")
        
        # Vérification de sécurité pour s'assurer que le bot a trouvé les clés
        if not self.cible_ip:
            print("[❌] Erreur : Le bot n'a pas trouvé la clé MOVITEL_IP dans les Secrets.")
            return
        if not self.api_token:
            print("[❌] Erreur : Le bot n'a pas trouvé la clé GH_TOKEN dans les Secrets.")
            return

        print("📡 Connexion sécurisée en cours vers l'IP de l'opérateur...")
        try:
            url = f"http://{self.cible_ip}"
            reponse = requests.get(url, timeout=10)
            
            resultat = {
                "statut": "REUSSITE",
                "timestamp": horodatage,
                "code_http": reponse.status_code,
                "headers": dict(reponse.headers)
            }
            print("[✨] Réponse reçue de l'infrastructure.")
            
        except Exception as e:
            resultat = {
                "statut": "ECHEC",
                "timestamp": horodatage,
                "erreur": str(type(e).__name__)
            }
            print(f"[⚠️] Impossible de joindre l'IP directement : {type(e).__name__}")

        self.sauvegarder(resultat)

    def sauvegarder(self, donnee):
        with open(self.fichier_donnees, 'a') as f:
            f.write(json.dumps(donnee) + "\n")
        print("[💾] Données écrites avec succès dans 'octopus_essentiel.json'.")

if __name__ == "__main__":
    bot = Octopus2Bot()
    bot.interroger_movitel()
        
