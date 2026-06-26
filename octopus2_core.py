import os
import json
from datetime import datetime
from scapy.all import sniff, IP, TCP, UDP, DNS

class Octopus2Core:
    def __init__(self):
        print("--- [🐙 Octopus2 : Moteur Réseau Allégé Initialisé] ---")
        self.fichier_essentiel = "octopus_essentiel.json"
        # On définit notre cible principale de filtrage
        self.cible_mot_cle = "movitel"
        print("[⚡] Surveillance active : Passerelle, DNS Movitel et En-têtes HTTP.\n")

    def extraire_donnees_utiles(self, packet):
        if not packet.haslayer(IP):
            return

        ip_layer = packet[IP]
        src = ip_layer.src
        dst = ip_layer.dst
        horodatage = datetime.now().strftime("%H:%M:%S.%f")[:-3]

        # 1. ÉLÉMENT : Les Requêtes DNS vers Movitel
        if packet.haslayer(DNS) and packet[DNS].qr == 0:
            site = packet[DNS].qd.qname.decode('utf-8').lower()
            if self.cible_mot_cle in site:
                donnee = {
                    "categorie": "1_DNS_MOVITEL",
                    "temps": horodatage,
                    "appareil_source": src,
                    "serveur_demande": site.strip('.')
                }
                self.enregistrer(donnee)

        # 2. ÉLÉMENT : Les En-têtes HTTP/HTTPS vers le port 80 ou 443
        elif packet.haslayer(TCP):
            sport = packet[TCP].sport
            dport = packet[TCP].dport
            
            # On cherche si l'une des IP ou le trafic est lié à une activité web utile
            if dport in [80, 443] or sport in [80, 443]:
                # On extrait juste la structure de la connexion (l'en-tête du flux)
                donnee = {
                    "categorie": "2_HTTP_HEADER",
                    "temps": horodatage,
                    "flux": f"{src}:{sport} -> {dst}:{dport}"
                }
                # Optionnel : Si le paquet contient des données texte brutes (HTTP), on pourrait chercher "movitel" dedans
                self.enregistrer(donnee)

    def enregistrer(self, donnee):
        """Enregistre la pépite en direct et l'affiche à l'écran"""
        # Affichage propre dans la console
        if donnee["categorie"] == "1_DNS_MOVITEL":
            print(f"[🔍 DNS] {donnee['temps']} -> {donnee['serveur_demande']}")
        else:
            print(f"[📦 FLUX] {donnee['temps']} -> {donnee['flux']}")
            
        # Écriture dans le fichier JSON unique
        with open(self.fichier_essentiel, 'a') as f:
            f.write(json.dumps(donnee) + "\n")

    def lancer(self):
        # On filtre au niveau du noyau pour ne prendre que IP, TCP et UDP pour être ultra léger
        sniff(filter="ip", prn=self.extraire_donnees_utiles, store=0)

if __name__ == "__main__":
    try:
        octopus = Octopus2Core()
        octopus.lancer()
    except KeyboardInterrupt:
        print("\n[🐙] Octopus2 mis en veille. Fichier 'octopus_essentiel.json' sauvegardé.")
      
