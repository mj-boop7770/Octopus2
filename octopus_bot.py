import os
import requests
import json
from datetime import datetime

class Octopus2Bot:
    def __init__(self):
        # Récupération sécurisée de l'IP depuis l'environnement GitHub
        self.cible_ip = os.getenv("IP_CIBLE", "127.0.0.1")
        self.fichier_donnees = "octopus_essentiel.json"

    def interroger_movitel(self):
        horodatage = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        print(f"[🐙 Octopus2] Initialisation de l'analyse sur la cible.")
        
        if self.cible_ip == "127.0.0.1":
            print("[⚠️] Erreur : L'IP cible n'a pas été injectée correctement.")
            return

        try:
            # Envoi de la requête de test vers l'IP Movitel
            url = f"http://{self.cible_ip}"
            print(f"📡 Connexion en cours vers l'infrastructure de l'opérateur...")
            reponse = requests.get(url, timeout=10)
            
            resultat = {
                "statut": "REUSSITE",
                "timestamp": horodatage,
                "code_http": reponse.status_code,
                "headers": dict(reponse.headers),
                "serveur": reponse.headers.get('Server', 'Non spécifié')
            }
            print(f"[✨] Réponse reçue avec succès (Code {reponse.status_code}).")
            
        except Exception as e:
            resultat = {
                "statut": "ECHEC",
                "timestamp": horodatage,
                "erreur": str(type(e).__name__)
            }
            print(f"[❌] Erreur de connexion : {type(e).__name__}")

        # Enregistrement dans le registre local
        self.sauvegarder(resultat)

    def sauvegarder(self, donnee):
        # Ajoute la nouvelle ligne au fichier JSON sans écraser les anciennes
        with open(self.fichier_donnees, 'a') as f:
            f.write(json.dumps(donnee) + "\n")
        print("[💾] Registre 'octopus_essentiel.json' mis à jour.")

if __name__ == "__main__":
    bot = Octopus2Bot()
    bot.interroger_movitel()
      
