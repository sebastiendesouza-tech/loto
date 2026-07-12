## v4.1.4
- Correction de l’affichage du bon de validation : libellés et quantités visibles.
- Présentation des quatre types de supports en grille 2 x 2, y compris sur téléphone.
- Remplacement du terme « panier » par « joueur » dans le scanner de vente.
- Affichage explicite « Scannés / attendus » pour chaque support.

# v4.1.3
- Stabilisation suivi des ventes et bon de validation.
- Diagnostic et mode scanner visibles.
- Correction de la conservation du loto actif lors de l'enregistrement.

# v4.1.1

- Reconnaissance explicite du bon de validation caisse au format `C:1;P4:0;P6:2;P8:0`.
- Tolérance des espaces et minuscules.
- Rejet des segments inconnus ou mal formés.
- Affichage du détail du bon et du total de cartons après le scan.

# v4.1.0
- Bon de validation caisse facultatif par loto.
- Contrôle de panier C/P4/P6/P8 avant enregistrement des ventes.
- Enregistrement automatique de support_type lors de la création.
- Mode vente directe conservé lorsque l’option est désactivée.

# v3.9.3 - Origine des cartons

- Suppression de toute dépendance au champ `generated_by_app`.
- Le scanner Vente accepte uniquement les cartons dont `origine = Loto by SdS`.
- Les statistiques Vente comptent uniquement cette même origine.
- La création, la réimpression et l’archivage utilisent également le champ `origine`.
- Compatible avec la base Supabase actuelle, sans nouvelle colonne.

# v3.9.1
- Correction du scanner de vente pour les cartons generes par les versions precedentes.
- Recherche d'un carton par son code QR reel plutot que par un numero interne calcule.
- Distinction entre carton introuvable et carton importe.
- Compatibilite preparee avec les codes sur 5 chiffres.

# v3.9.0
- Création par nombre de pages.
- Formats A4 individuel x4, planche A4 x4, planche A3 x6 + 2 individuels et planche A3 x8.
- QR unique et vente groupée des planches.
- Réimpression de cartons existants.
- Archivage et restauration sans réutilisation des numéros.

## v3.8.1 - Mode commissaire et suivi des ventes
- Affichage permanent du statut du suivi des ventes sur la page Commissaire.
- Lorsque le suivi est activé, un carton gagnant doit aussi être enregistré comme vendu pour le loto actif.
- Lorsque le suivi est désactivé, le contrôle porte uniquement sur le gain et ne bloque jamais pour absence de vente.
- Rappel de la saisie manuelle du numéro pour les cartons existants sans QR code.
- Le scan QR et la saisie manuelle restent tous les deux disponibles.

# v3.8.0 - Scanner vente sur téléphone

- L'onglet Vente devient un tableau de suivi PC/tablette sans caméra.
- QR code d'accès au scanner de vente mobile.
- Scanner mobile avec modes Vente et Retour.
- Bordure verte après réussite, rouge en cas d'anomalie.
- Statistiques, liste des cartons vendus et historique permanent.
- Bouton de fin de loto pour libérer tous les cartons sans supprimer l'historique.

# v3.6.1

- Remise de la section Ajout d’un carton existant dans Administration > Cartons.
- Organisation finale : création, ajout unitaire, ajout planche de 6.
- Version affichée passée en v3.6.1.

# Changelog

## v3.6.0 - Saisie planche de 6 cartons

- Ajout d'une saisie par planche de 6 cartons dans Administration > Cartons.
- Un identifiant est saisi pour chaque carton.
- Chaque carton est saisi sur une ligne avec ses 15 numéros.
- Contrôle renforcé : une planche doit contenir les 90 numéros une seule fois.
- Aperçu des 6 cartons en 3 x 9, 2 cartons par ligne.
- Enregistrement groupé des 6 cartons dans Supabase.

# Changelog

## v3.5.5 - Règles cartons corrigées

- Correction des règles de validation : une colonne peut être vide.
- Conservation du contrôle de croissance uniquement sur les lignes.
- Suppression de toute contrainte de croissance verticale dans les colonnes.
- Correction du générateur : il ne force plus un numéro dans chaque colonne.
- Les colonnes peuvent contenir 0, 1, 2 ou 3 numéros.

## v3.5.5 - Correction règles cartons

- Suppression du contrôle de croissance verticale dans les colonnes.
- Conservation du contrôle de croissance uniquement sur les lignes.
- Générateur corrigé : les numéros d'une colonne ne sont plus triés de haut en bas.
- Les contraintes conservées sont : 15 numéros, 5 par ligne, pas de doublon, bonne colonne de dizaine, au moins 1 et maximum 3 numéros par colonne.


## v3.5.4 - Contrôle cartons existants
- Correction du bouton Contrôler dans Administration > Cartons.
- Ajout d’un contrôle anti-doublon sur l’identifiant du carton à l’enregistrement.
- Ajout d’un contrôle anti-doublon sur la signature des 15 numéros à l’enregistrement.
- L’aperçu 3 x 9 reste généré avant le bouton Enregistrer.

# V3.2.9

- Correction QR code Administration > Cartons : QR visible directement avec image locale de secours.
- QR commissaire supprimé.
- Bouton Commissaire “Scanner un carton” rétabli.
- URL du bouton commissaire recalculée automatiquement.

# v3.2.9 - QR codes intégrés automatiquement

- Génération automatique du QR de scan saisie cartons dans Administration > Cartons.
- Génération automatique du QR de scan commissaire sur la page Commissaire.
- URL calculée selon l'adresse courante : GitHub Pages ou serveur local.
- Fallback image si la librairie QR locale/CDN ne se charge pas.

# v3.2.9 - Scan saisie cartons en deux étapes

- QR d’accès affiché dans Administration > Cartons.
- Aucune caméra ouverte sur le PC.
- Étape 1 : OCR de la grille complète avec 15 numéros.
- Étape 2 : lecture de l’identifiant du carton par QR code, code-barres ou OCR du numéro imprimé.
- Identifiant externe obligatoire avant validation d’un carton importé.
- Contrôle doublon sur l’identifiant externe et sur les 15 numéros.
- Le commissaire peut retrouver un carton importé avec son identifiant externe.

# v3.2.9 - Scan saisie cartons

- Ajout du mode scan saisie cartons en page autonome.
- Grande zone caméra en mode paysage.
- Scan continu sans case à cocher.
- Lecture OCR des 15 numéros avec Tesseract.js.
- Création automatique d'un brouillon en À enregistrer.
- QR code dans Administration > Cartons pour ouvrir le scan sur téléphone.
- Pseudo carton affiché côté administration après scan pour correction / validation.

# v3.2.9 - Validation des cartons scannés

- Scanner saisie cartons : enregistrement en brouillon au statut À enregistrer.
- Administration > Cartons : affichage des cartons À enregistrer.
- Édition de la grille en 3 × 9 avant validation.
- Boutons Modifier et Valider sur les cartons scannés.
- Ajout du champ optionnel ocr_quality dans le SQL.

# v3.2.1 - Scanner commissaire / saisie cartons

- Ajout d'un choix de mode dans le scanner existant.
- Mode Scanner commissaire : lecture et contrôle simple du code carton.
- Mode Scanner saisie cartons : scan du code, saisie des 3 lignes de grille, validation puis enregistrement Supabase.
- Le carton validé est enregistré avec le statut disponible.
- Fonctionnement optionnel, non bloquant.

# v3.2.0 - Gestion des cartons et suivi optionnel des ventes

- Ajout d'une option par loto : suivi des cartons vendus.
- Option désactivée par défaut pour ne pas bloquer les petits lotos.
- Ajout d'une gestion simple des cartons enregistrés dans l'administration.
- Ajout de l'enregistrement manuel / correction d'un carton importé.
- Ajout du marquage vendu / disponible pour le loto actif.
- Contrôle commissaire : vérification vente uniquement si l'option est cochée.

# v3.2.0 - Réglage micro / enceinte

- Pause automatique de la reconnaissance vocale pendant 1 seconde après validation d’un numéro.
- Anti-doublon vocal renforcé : même numéro ignoré pendant 5 secondes après acceptation.
- Redémarrage automatique du micro après la pause.
- Objectif : éviter que le micro-cravate reprenne le son de l’enceinte.

# v3.2.0 - Ajustement modèle classique A6

- Grille descendue de 3 mm pour protéger le QR Code à l’impression.
- Code carton déplacé sous “Loto by SdS” dans l’en-tête.
- Code carton agrandi pour le commissaire.
- Numéros de grille agrandis.
- Fond blanc conservé, sans bandeau noir.

# v3.2.0 - Design classique sobre A6

- Modèle Classique A6 revu dans le code de l’application.
- Fond blanc pour économiser l’encre.
- Suppression du bandeau noir.
- Pas de bordure extérieure de carton, uniquement la grille.
- QR Code en 12 x 12 mm dans l’en-tête.
- Mention Loto by SdS une seule fois, en petit.
- Identifiant SDS imprimé une seule fois.
- Cases du modèle classique : 15 x 25 mm.

# v3.2.0 - Modèle classique A6

- Ajout du choix de modèle : Classique A6 ou Premium SdS.
- Modèle Classique : 4 cartons par A4 paysage.
- Modèle Classique : planche A3 portrait avec 8 emplacements, les 6 premiers pour la planche et les 2 du bas en individuels.
- QR Code placé dans le bandeau haut du carton.
- PDF généré selon le modèle choisi.

## v3.2.0 - temps de décodage scanner
- Le temps affiché ne compte plus le temps de placement du QR Code.
- Il correspond au temps de décodage/analyse de l’image qui contient le QR Code.

## v3.2.0 - scan bip et contour vert
- Scanner : ajout d'un contour vert bref à chaque lecture réussie.
- Scanner : bip conservé et déclenché immédiatement à la reconnaissance.
- Scanner : interface de test simplifiée, temps de lecture conservé.
- Scanner : zone analysée légèrement réduite pour améliorer la vitesse.
- Version affichée mise à jour.

## v3.1.0 - scanner rapide et cartons hauts

- Scanner compact : fenêtre vidéo réduite.
- Lecture QR optimisée : analyse prioritaire au centre de l’image.
- Objectif : réduire le délai de lecture en scan continu.
- Cartons : cases passées à 22 x 23 mm, carton 3 toujours en bas de l’A4.
- PDF A4 : 3 cartons optimisés pour limiter la découpe au massicot.

# Changelog

## v3.0.9 - Calibration impression + scanner jsQR

- Ajout du PDF de calibration : règle horizontale 100 mm, règle verticale 100 mm et carrés 20/21/22/23 mm.
- Test du carton avec cases 22 x 22 mm.
- Cartons individuels A4 conservés à 3 par feuille, avec le troisième tout en bas pour limiter les découpes.
- Planche A3 conservée à 6 cartons.
- Scanner : nouveau mode jsQR prioritaire pour améliorer la lecture sur iPhone/Safari.
- Version affichée mise à jour en v3.0.9.

## v3.0.8 - Cartons A4 optimises

- Cartons individuels : 3 par A4 fixes.
- Premier carton colle en haut, troisieme colle en bas pour limiter les decoupes.
- Hauteur des cases portee a 21 mm pour eviter que les jetons de 17 mm se touchent.
- PDF ajuste sur le meme format de reference.

## v3.0.7 - Téléchargement PDF cartons

- Téléchargement direct des cartons en vrai fichier PDF.
- Suppression de l'option 2 ou 3 cartons par page : les cartons individuels sont fixés à 3 par A4.
- Planche conservée à 6 cartons sur A3.
- Version affichée mise à jour en v3.0.7.

## v3.0.6 - PDF cartons propre + scanner iPhone

- Version affichée mise à jour en v3.0.6.
- Impression des cartons via une fenêtre dédiée pour éviter toute phrase Administration dans le PDF.
- Cartons individuels : 3 par page A4 sélectionné par défaut.
- Pages PDF avec 0 marge haut/bas et espacement réparti entre cartons.
- Scanner iPhone renforcé : sélection caméra arrière via liste des caméras et messages de diagnostic.


## v3.0.5 - Correctif impression cartons + scanner iPhone
- Impression des cartons : seul l'aperçu des cartons est imprimé, sans titres ni textes d'administration.
- Scanner : séparation du conteneur iPhone/html5-qrcode et de la vidéo native pour éviter l'écran noir sous Safari iOS.
- Numéro de version mis à jour dans l'application.


## v3.0.4 - Scanner iPhone
- Ajout d’un mode compatible iPhone/Safari pour le scanner QR.
- Ajout de diagnostics visibles : HTTPS, caméra, BarcodeDetector, navigateur.
- Affichage des erreurs caméra au lieu d’un bouton silencieux.
- Conservation du mode scan continu avec anti double lecture.


## v3.0.2 - Carton de référence
- Format du carton fixé autour de cases 20 x 20 mm pour jetons de 17 mm.
- Mise en page A4 individuel 2 ou 3 cartons par page.
- Mise en page A3 paysage pour planches de 6 cartons.
- Identifiants métiers au format SDS-XX-XXXX et SDSP-XX-XXXX.
- QR Code court : il contient uniquement le code du carton.


## v2.2.12 - Loto by SdS / corrections / préparation cartons

- Renommage de l'application : **Loto by SdS**.
- Ajout des corrections de tirage côté animateur et commissaire :
  - annuler le dernier numéro ;
  - annuler un numéro déjà sorti ;
  - remplacer un mauvais numéro par le bon.
- Ajout des commandes vocales de correction :
  - "annule le dernier numéro" ;
  - "annule le numéro ..." ;
  - "remplace ... par ...".
- Préparation V3 : création de cartons depuis l'administration.
- Impression de planches A4 de 6 cartons.
- QR Code par carton, prévu pour le futur scan continu.
- Enregistrement des cartons générés dans Supabase.

## v2.2.13 - Correction remplacement numéro
- Lorsqu'un numéro est remplacé, le nouveau numéro conserve la position du numéro corrigé dans l'historique du tirage.
- Le remplacement n'est plus affiché comme dernier numéro tiré.
- Un message de correction est diffusé sur les écrans synchronisés.


## v3.0.0 - Production cartons + scanner QR

- Séparation entre cartons individuels A4 et planches A3.
- Cartons individuels imprimables en 1, 2 ou 3 par page A4.
- Planches A3 de 6 cartons.
- Nouveau dessin de carton : cases adaptées aux jetons de 17 mm, gros numéro, petit numéro de contrôle, cases vides avec rectangle gris.
- QR Code court par carton, basé sur l'identifiant `C000001`.
- Page de test scanner QR en mode scan continu avec bip et mesure de lecture.
- Base Supabase préparée pour les métadonnées V3 : `carton_code`, `grille`, `sheet_code`, `sheet_position`, `qr_payload`, `status`, `origine`.


## v3.0.1
- Ajout d'un espace Scan séparé dans le menu principal.
- Simplification de la rubrique Cartons : nombre de cartons + type individuel/planche.
- Cartons individuels A4 : choix 2 ou 3 par feuille.
- Planches A3 : génération par lots de 6 cartons.
- Bouton Générer PDF / imprimer pour tester les sorties avant de figer le format.


## v3.2.0
- Nouveau design Classique A6 sobre : fond blanc, sans bandeau noir.
- QR Code conservé dans l'en-tête, code carton affiché une seule fois.
- Suppression du logo/texte répété pour économiser l'encre.
- Suppression du cadre extérieur du carton, seules les lignes de grille restent visibles.

## V3.2.0 final ajustée
- Identifiant carton simplifié au format `SDS-XX-XXXX` : 2 chiffres pour l’association, 4 chiffres pour le carton.
- QR Code simplifié : il contient uniquement ce nouvel identifiant court.
- Numéros principaux du modèle Classique encore agrandis.
- Petits numéros sous les numéros principaux agrandis.
- Le modèle Classique est considéré comme validé après ce réglage.

## V3.2.0 final PDF corrigée
- Correction du générateur PDF du modèle Classique : les grands numéros sont maintenant agrandis directement dans le PDF.
- Correction du générateur PDF du modèle Classique : les petits numéros sous les grands sont également agrandis.
- Conservation du format d'identifiant court `SDS-XX-XXXX` dans le QR Code et sur le carton.

## v3.2.9
- Création des cartons simplifiée : ID association + nombre de cartons uniquement.
- Numéro d'ordre automatique à partir du dernier carton de l'association.
- Suppression de l'aperçu HTML : le PDF devient l'aperçu officiel.
- Bouton "Créer PDF" et bouton "Enregistrer les cartons".
- Contrôle doublon identifiant et doublon des 15 numéros.
- Ajout de la page autonome scan.html.
- Scanner retiré du menu principal, accessible par QR/lien direct et bouton commissaire.

## v3.5.1 - Saisie rapide cartons dans Administration

- Ajout de la saisie rapide des 15 numéros dans Administration > Cartons.
- Le scan reste réservé au commissaire.
- Reconstruction automatique de la grille 3 x 9 avec 0 dans les cases vides avant enregistrement Supabase.
- Contrôles : 15 numéros, 5 par ligne, ordre croissant, doublons, colonnes de dizaines, au moins un numéro par colonne.


## v3.5.2 - Onglet Cartons simplifié
- Onglet Administration > Cartons nettoyé.
- Conservation uniquement de la création de cartons et de l'ajout de cartons existants.
- Ajout de l'identifiant obligatoire du carton pour la saisie existante.
- Reconstruction 3 x 9 avec zéros dans les cases vides avant enregistrement.
- Suppression visuelle des blocs scan, import, gestion, vente et test dans cet onglet.

## v3.5.3 - Saisie cartons existants simplifiee
- Onglet Cartons conserve uniquement la creation de cartons et l ajout de cartons existants.
- Suppression des champs code interne, serie et statut pour l utilisateur.
- Ajout existant : identifiant + numeros + bouton Controler + aperçu 3x9 + bouton Enregistrer.
- Apres enregistrement, les champs sont vides et le focus revient sur l identifiant.

## v3.7.0 - Module vente des cartons
- Nouvelle page `vente.html` accessible depuis l’accueil et l’administration.
- Vente par scan du QR code ou saisie manuelle.
- Vente réservée aux cartons créés par l’application (`origine = Loto by SdS`).
- Vente enregistrée pour le loto actif dans `loto_carton_sales`.
- Refus d’un carton inconnu, importé ou déjà vendu pour le même loto.
- Compteur, historique récent et annulation d’une vente.
- Le contrôle commissaire existant bloque désormais naturellement les gains des cartons non vendus quand le suivi est activé.

## v4.0.1
- Les boutons d'accès équipe sont replacés en haut de la page d'accueil.
- Le tableau de bord est affiché sous les boutons.
- Le contrôle d'intégrité reste en bas de page.
