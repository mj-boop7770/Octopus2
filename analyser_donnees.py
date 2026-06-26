# Exemple de script pour lire tes résultats en fin de session
with open("octopus_essentiel.json", "r") as f:
    lignes = f.readlines()

print(f"Nombre de requêtes pertinentes capturées : {len(lignes)}")
# Ici tu peux faire des boucles pour trier, compter ou analyser les fréquences.
