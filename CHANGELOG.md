## Modes sans texte et signalement du micro - 8 novembre 2026
- Animateur : suppression du texte sous Tirage / Contrôle / Libre. Seul le bouton actif indique le mode.
- Libre est sélectionné quand le PC confirme une écoute inactive, même si le microphone n’est pas encore disponible.
- Les erreurs de microphone restent dans la zone orange Animateur. Le message d’entrée audio inaccessible invite à sélectionner le récepteur USB dans Chrome puis à réactiver Micro PC sur le PC.
- Vérification ciblée : disparition du texte, état Libre et affichage/effacement du message orange.

## Commandes d’écoute Tirage / Contrôle / Libre - 8 novembre 2026
- Animateur : le quatrième bouton carré en haut ouvre une fenêtre de contrôle manuel avec le préfixe de série, les trois chiffres à saisir et le résultat du contrôle.
- La saisie permanente est remplacée par trois gros boutons Tirage, Contrôle et Libre. Ils restent visibles en bas de la colonne de droite. Le mode confirmé par le PC est coloré ; une commande en cours empêche les doubles clics.
- Tirage reconnaît les annonces avec le mot-clé sélectionné et ne lance pas de contrôle carton. Contrôle accepte les trois derniers chiffres seuls, y compris « 42 » pour 042, et n’ajoute jamais les numéros entendus au tirage. Libre ne traite aucune annonce.
- Les annonces déjà en cours lors du changement de mode sont écartées ; un contrôle vocal encore en attente ne peut plus s’afficher après passage en Libre ou changement de mode.
- La première autorisation du microphone reste un clic sur Micro PC depuis l’affichage public. Les commandes de la tablette changent ensuite explicitement le mode du PC et attendent sa confirmation.
- Les pages Animateur et Public chargent les nouvelles versions du code ; le bouton Micro PC indique Tirage, Contrôle ou Libre.
- Vérification : 164 tests réussis (dont séparation du tirage et des cartons, Libre, commandes PC/tablette, changements rapides et fenêtre manuelle). Disposition et modes vérifiés avec un micro simulé dans l’aperçu local. Essai au micro réel à effectuer.

## Pagination de la gestion des cartons
- Sélecteur 10 / 20 / 50 cartons par page, avec 20 par défaut. Le changement recharge immédiatement la liste depuis sa première page.
- Affichage Page X / Y, calculé depuis le nombre exact de cartons correspondant aux filtres. Le compteur indique aussi les cartons affichés, par exemple 21 à 40 sur 132.
- Une liste vide indique Page 0 / 0 ; après retrait de cartons, une page devenue inexistante revient à la dernière page disponible.
- Vérification ciblée : changement de taille, nombre total filtré, dernière page, liste vide et suppression concurrente. Navigation 10 / 20 / 50 vérifiée dans un aperçu navigateur isolé.

## Liste et gestion des cartons enregistrés - 7 novembre 2026
- Administration > Cartons : liste paginée de tous les cartons enregistrés, générés ou ajoutés manuellement. L’identifiant et les 15 numéros sont visibles directement sur trois lignes.
- Recherche par numéro interne, identifiant imprimé, identifiant externe ou identifiant de planche ; filtres par série, type (dont planches de 6), actifs et archives.
- Voir / contrôler affiche les 27 cases enregistrées et le résultat sur les numéros du tirage en cours. Ce contrôle ne modifie pas le tirage et ne publie pas le carton sur l’affichage public. Les ventes et le dernier joueur debout restent vérifiés dans la salle.
- Supprimer demande confirmation puis archive le carton ; Restaurer le rend de nouveau actif. Le numéro et la grille restent enregistrés.
- Voir la planche affiche ensemble les cartons ayant un identifiant de planche commun, y compris ceux archivés. Les anciennes planches saisies sans cet identifiant restent consultables carton par carton.
- Les nouvelles planches de 6 saisies manuellement enregistrent désormais un identifiant commun, leurs six positions et leur type P6.
- Vérification : 151 tests réussis sur les sources actuelles. Aperçu navigateur vérifié avec des cartons de démonstration, sans écriture dans Supabase réel.

## Contrôle général et corrections de cas limites - 7 novembre 2026
- 143 tests réussis : commandes Animateur, lots et parties, Bingo mystère, cartons, reconnaissance vocale simulée, sauvegarde, reconnexion et compteur de joueurs.
- Jeu du perdant en ligne : la confirmation du dernier carton exige maintenant de retrouver tous les cartons vendus. Une liste incomplète ne confirme plus un gagnant.
- Mode entièrement local sans serveur configuré : un rechargement restaure la dernière sauvegarde locale, même après plusieurs ouvertures successives.
- Vérification des références locales et identifiants HTML : aucun fichier manquant ni identifiant dupliqué. Syntaxe des 19 fichiers JavaScript vérifiée.
- Aperçu local isolé : ouverture des pages Animateur, Commissaire, Public, Joueur, Mes cartons et Administration ; choix mystère, confirmation de partie suivante et conservation du tirage au rechargement vérifiés.
- Les tests de synchronisation utilisent un serveur simulé. Le micro réel et le fonctionnement simultané PC/tablettes/téléphones restent à essayer sur place.

## Compteur de joueurs dans l’en-tête équipe - 7 novembre 2026
- Animateur et Commissaire : petite icône téléphone et nombre dans l’en-tête, à côté du voyant, sans occuper la zone de jeu.
- Présence partagée par session Supabase, alimentée par les pages Joueur et Mes cartons. Les appareils équipe ne sont pas comptés.
- Les onglets d’un même navigateur partagent un identifiant aléatoire local et sont dédupliqués. Le compteur mesure les navigateurs joueurs connectés, sans identité personnelle.
- La valeur suit les arrivées, départs et reconnexions. Une fermeture ou une coupure peut prendre un court délai à être détectée par le service de présence.
- « — » apparaît pendant la connexion du compteur ou quand ses données ne sont pas disponibles, au lieu d’afficher un zéro trompeur.
- Vérification : 141 tests passent, dont déduplication, séparation des sessions, reconnexion, retour sur une page et perte de connexion. Disposition vérifiée avec une valeur d’exemple dans l’aperçu local.

## Séparateur avant le mode de jeu - 7 novembre 2026
- Animateur et Commissaire : affichage « Partie n°10 / 10 - Carton plein » pour les modes Bingo mystère.

## Règle près du numéro de partie et catégorie Super quine - 7 novembre 2026
- Animateur et Commissaire : pour les modes Bingo mystère uniquement, Carton plein ou Jeu du perdant apparaît à côté du numéro de partie.
- Nouvelle catégorie Administration : Bingo mystère : super quine. Elle affiche directement le voyage Séjour au Cap et se contrôle au carton plein, sans choix parmi les neuf cartons.
- La super quine est distincte des neuf parties à choix et ne modifie pas les lots ni les cartons déjà attribués. Le voyage automatique de l’ancienne dixième partie reste compatible.
- Vérification : 133 tests passent, dont intitulés sur les deux pages, sélection du mode en administration et contrôle exigeant les trois lignes complètes pour la super quine. Aperçus locaux vérifiés.

## Mode Bingo mystère : jeu du perdant - 7 novembre 2026
- Nouveau choix dans Administration : Bingo mystère : jeu du perdant, distinct du Bingo mystère : carton plein et du jeu du perdant classique.
- La grille des neuf cartons et les choix précédents restent visibles dans ce mode sur Public, Animateur, Commissaire et Joueur. La variante compte parmi les neuf parties mystères avant le voyage.
- Le contrôle utilise la règle du perdant : aucun numéro tiré sur le carton, sans dernier numéro obligatoire. La page Mes cartons reprend également cette règle.
- Un seul lot reste attribuable par partie, avec choix parmi les cartons verts et confirmation pour passer à la suivante.
- Le changement de mode dans l’administration conserve l’identifiant du loto existant.
- Vérification : suite de tests du loto et tests ciblés de l’administration réussis. Neuvième partie vérifiée avec huit cartons rouges, un carton vert, règle du perdant active et passage ensuite à Séjour au Cap.

## Contrôle vocal des cartons sans prononcer les zéros initiaux - 7 novembre 2026
- « Contrôle carton 42 » ou « Contrôle carton quarante-deux » utilise le suffixe 042 ; « Contrôle carton 7 » utilise 007, avec le préfixe 101 ou 102 choisi dans l’administration.
- Les suffixes déjà annoncés sur trois chiffres restent compatibles. Les nombres courts attendent une courte fin d’annonce pour ne pas tronquer une dictée chiffre par chiffre.
- Les commandes de contrôle restent séparées du tirage ; la pause du micro annule un numéro court encore en attente.
- Vérification : les 42 tests vocaux passent, dont les deux séries, les nombres en lettres, les zéros initiaux et les annonces suivantes.

## Choix mystère sans texte et confirmation de la partie suivante - 7 novembre 2026
- Suppression du rappel « Carton X : nom du lot » sous la grille, sur tous les affichages.
- Un clic sur un carton vert l’attribue à la partie en cours et le passe au rouge, puis ouvre une seule confirmation pour passer à la partie suivante et remettre le tirage à zéro.
- Si la confirmation est annulée, le carton reste choisi et le bouton Partie suivante de l’animateur reste disponible pour continuer plus tard.
- Si un autre écran a déjà changé de partie pendant l’attente, la confirmation ne peut pas provoquer un second passage.
- Vérification : les 19 tests ciblés du plateau mystère et des commandes Animateur passent.

## Zone des cartons mystères allégée - 7 novembre 2026
- Retrait du titre Bingo mystère, des petits textes dans les neuf cartons et du compteur de cartons choisis sur Animateur, Commissaire, Public et Joueur.
- Conservation des numéros, couleurs, états accessibles et du rappel du lot choisi. Le dixième lot Séjour au Cap reste affiché comme auparavant.

## Bingo mystère : un gagnant par partie, choix libre et voyage final - 7 novembre 2026
- Uniquement pour les parties Bingo mystère : grille commune de neuf piles de cartons verts, numérotés de 1 à 9 de gauche à droite sur trois lignes.
- L’animateur ou le commissaire attribue un carton encore vert, avec confirmation. Le choix est libre : le gagnant de la partie 1 peut choisir le carton 7. Un seul carton peut être attribué pour chaque partie.
- Le carton choisi devient rouge et reste indisponible dans les parties suivantes. Le lot réellement choisi est rappelé sous la grille. Partie suivante devient disponible après ce choix et remet le tirage à zéro comme auparavant.
- L’administration conserve un seul lot par partie. Les neuf premiers lots Bingo mystère alimentent les neuf cartons au choix ; la dixième partie affiche Séjour au Cap.
- Choix communs sur Animateur, Commissaire, Affichage public et la fenêtre Lots du joueur. Sur l’affichage public, le choix reste aussi possible en secours lors d’une coupure confirmée.
- Les choix sont conservés hors connexion ; deux appareils ne peuvent pas attribuer deux lots différents pour une même partie après synchronisation. Un nouveau loto remet les cartons à zéro.
- Animateur : le micro devient le quatrième bouton carré en haut à droite, après Menu. Le grand bouton du bas est retiré pour libérer de la place.
- Vérification : 119 tests passent. Choix du carton 7 à la première partie, conservation du rouge à la deuxième partie, disposition des quatre boutons et grille Commissaire vérifiés dans l’aperçu local.

## Boutons de progression publics réservés aux coupures - 7 novembre 2026
- Uniquement sur Affichage public : Lot suivant / Partie suivante / Fin du loto suit la même visibilité que Contrôler, masqué avec le voyant gris ou vert et visible avec le voyant rouge.
- Le bouton de progression Animateur reste visible comme auparavant.
- Vérification : les 11 tests de l’affichage public passent, dont la visibilité des deux boutons au démarrage, en ligne, pendant une coupure et au retour de la connexion.

## Connexion initiale et commandes de secours - 7 novembre 2026
- Au lancement, le voyant reste gris pendant la vérification de connexion, avec l’info-bulle Connexion en cours. Il passe au vert quand le serveur répond ou au rouge après une coupure ou un échec confirmé.
- Le bouton Contrôler de secours reste masqué pendant cette vérification initiale. Il apparaît seulement lorsque l’absence de connexion est connue et disparaît au retour du vert.
- Un démarrage sans Internet donne accès au bouton de secours. Le bouton Lot suivant / Partie suivante conserve son fonctionnement habituel.
- Vérification : 110 tests passent, dont démarrage, connexion confirmée, échec, coupure et retour de connexion.

## Contrôle de secours depuis l’affichage public - 7 novembre 2026
- Bouton Contrôler près du voyant et de Lot suivant : visible uniquement lorsque le voyant est rouge, masqué dès le retour au vert.
- Fenêtre de saisie avec le préfixe 101 ou 102 choisi dans l’administration et les trois derniers chiffres du carton. Le contrôle affiche ensuite le carton complet.
- Mise en cache sur le PC des cartons actifs réels de Supabase et des ventes du loto lorsque ce suivi est activé. Le cache est préparé automatiquement en ligne, puis rafraîchi au maximum une fois par minute lors des notifications de session.
- Le contrôle de secours travaille directement sur ce cache et le tirage local ; il sauvegarde le contrôle et l’affichage dans la file de synchronisation existante.
- Un carton absent du cache ou un suivi des ventes non préparé produit une indication explicite. Le jeu du perdant ne confirme le dernier carton que si tous les cartons vendus sont disponibles dans le cache.
- Vérification : 108 tests passent. Saisie et affichage depuis un cache local vérifiés avec Supabase indisponible dans l’aperçu.

## Fermeture du carton depuis l’affichage public - 7 novembre 2026
- Petit bouton Fermer en haut à droite du carton contrôlé, accessible aussi lorsque le carton défile.
- Fermeture immédiate sur le PC, même hors connexion, pour retrouver le tirage. Les numéros tirés sont conservés.
- La fermeture utilise la sauvegarde locale et la synchronisation existantes : elle est conservée après rechargement hors ligne et transmise au retour d’Internet.
- Vérification : tests de fermeture immédiate, conservation du tirage, rechargement hors ligne et reconnexion réussis ; bouton et retour au tirage vérifiés dans l’aperçu local.

## Motifs courts adaptés au jeu et mode du carton - 7 novembre 2026
- Sous le numéro du carton contrôlé : Carton plein, 1 ligne, 2 lignes ou Jeu du perdant, sur Public, Animateur et Commissaire.
- Motif court à côté du statut : Carton incomplet, Pas de ligne complète, Pas 2 lignes complètes, Manque le dernier numéro ou Numéro tiré, selon le jeu et le contrôle.
- Suppression des détails et des listes de numéros manquants ; le motif conserve une couleur sombre. L’indication de carton non vendu reste disponible si le suivi des ventes est activé.
- Vérification : 99 tests passent, couvrant les différents modes et motifs. Aperçu local vérifié.

## Carton contrôlé en 27 cases et motifs près du statut - 7 novembre 2026
- Affichage public, Animateur et Commissaire : carton complet de trois lignes et neuf colonnes, avec les douze cases vides.
- Conservation des positions d’une grille enregistrée lorsqu’elle correspond aux lignes. Sinon, reconstruction à partir des numéros, en préservant les quinze numéros et leurs lignes, y compris pour les anciens cartons atypiques.
- Les cases vides restent neutres ; les numéros tirés restent verts et le dernier numéro jaune.
- Sur le carton contrôlé, la mention Bingo mystère est remplacée par Carton plein.
- Les motifs sont affichés à côté du statut en texte sombre, avec plusieurs motifs si le contrôle en fournit. Ils ne sont plus placés sous la grille.
- Vérification : 98 tests passent, dont la conservation des numéros sur les 1999 cartons standards. Aperçu local du carton public et du commissaire vérifié.

## Contrôle vocal des cartons - 7 novembre 2026
- Sur le micro du PC, « Contrôle carton 245 » contrôle et affiche le carton 101245 ou 102245 selon la série sélectionnée dans l’administration.
- Reconnaissance du suffixe à trois chiffres en chiffres, en mots (« deux cent quarante-cinq ») ou chiffre par chiffre ; zéros initiaux conservés.
- La commande attend le résultat vocal final et est isolée du tirage, y compris quand elle arrive en plusieurs segments. Le micro en pause ne lance pas de contrôle.
- Les commandes répétées sont filtrées pendant cinq secondes ; si plusieurs contrôles sont demandés, la dernière demande est prioritaire. Les échecs et cartons absents sont signalés via le statut du micro.
- Vérification automatisée des commandes, des deux séries, du retour au tirage, de la pause, des erreurs et des réponses reçues dans le désordre. Un essai au micro reste à faire sur place.

## Série de cartons pour le contrôle - 7 novembre 2026
- Administration → Loto / lots : choix de la série 101000–101999 ou 102000–102999, enregistré immédiatement avec la session.
- Animateur et Commissaire : préfixe 101 ou 102 affiché automatiquement ; saisie des trois derniers chiffres uniquement, en conservant les zéros initiaux.
- Le collage d’un numéro complet de la série choisie et le retour du scanner restent compatibles. Un code d’une autre série est refusé au collage.
- Le choix est conservé hors connexion et synchronisé au retour d’Internet. Les autres réglages et le tirage sont préservés.
- Vérification : 82 tests passent, dont changement de série, saisie, collage, scanner et récupération après coupure. Aperçu local vérifié.

## Animateur simplifié et trois lots visibles - 7 novembre 2026
- Trois commandes carrées alignées en haut : Lancer loto, Partie simple et Menu.
- Le quatrième bouton de progression, également carré, est placé à côté du dernier numéro. Il conserve la palette bleu foncé/jaune et les libellés Lot suivant, Partie suivante ou Fin du loto avec confirmation.
- Suppression des titres visibles Tirage et Mot-clé au-dessus des menus, avec maintien de leurs libellés accessibles.
- Affichage des trois lots en lignes distinctes : lots précédents atténués, lot actif encadré en jaune, lots suivants visibles. L’encadré n’impose plus une hauteur qui masque le troisième lot.
- Contrôle des cartons sur une seule ligne : saisie de six chiffres, Contrôler et Fermer, sans titre supplémentaire. Les caractères non numériques sont retirés et un code incomplet ne lance pas de contrôle.
- Le grand bouton d’écoute reste fixé en bas de la colonne.
- Vérification : 76 tests simulés passent. Disposition avec trois lots, commandes carrées et contrôle sur une ligne vérifiés en 1024 × 768 et 768 × 1024, ainsi que le filtrage de la saisie.

## Scanner Commissaire configurable et commandes Animateur regroupées - 6 novembre 2026
- Scanner un carton est masqué par défaut chez le commissaire. La case Administration → Loto / lots → Page commissaire permet de l’afficher ou de le masquer immédiatement.
- L’option est sauvegardée avec la session et conservée après une coupure, sans modifier les autres réglages ni les numéros tirés.
- L’en-tête Animateur affiche le nom du loto suivi du rôle (par exemple TELETHON · Animateur), comme chez le commissaire.
- Les menus Tirage et Mot-clé sont regroupés avec les quatre commandes du haut. Le grand bouton d’écoute reste en bas de la colonne droite.
- Vérification : 74 tests simulés passent. Activation puis désactivation du scanner vérifiées dans l’aperçu local, ainsi que le regroupement des menus et l’en-tête sur tablette 1024 × 768.

## Titre de partie commun et voyants près de la marque - 6 novembre 2026
- Animateur et Commissaire partagent le même format « Partie n°5 / 10 », avec le total des parties sur Commissaire.
- Retrait des numérotations déjà présentes dans les noms enregistrés, y compris les variantes « Partie n°5 / 10 » et les préfixes répétés. Les noms utiles sont conservés sans numéro redondant.
- Voyant de connexion déplacé à côté de Loto by SdS sur Animateur, Commissaire et Joueur. Suppression de son ancien emplacement, avec maintien de l’info-bulle au survol et par appui.
- Vérification : 70 tests simulés passent. En-têtes et titre contrôlés dans l’aperçu local ; les 90 numéros, le voyant, les liens et l’info-bulle restent accessibles sur Joueur en 320 × 568.

## Bouton de progression selon le lot et la partie - 6 novembre 2026
- Animateur et Affichage public affichent Lot suivant lorsqu’un autre lot actif reste dans la partie, Partie suivante au dernier lot d’une partie intermédiaire, et Fin du loto au dernier lot de la dernière partie.
- Calcul partagé dans le moteur du loto ; les lots désactivés sont exclus.
- Une confirmation est demandée avant toute progression : conservation des numéros entre lots, remise à zéro à la partie suivante ou à la fin.
- Le bouton reste bloqué pendant l’enregistrement et après la fin du loto pour éviter les doubles passages. Le parcours du Mini-bingo configuré est conservé ; son lancement demande aussi confirmation.
- Vérification : 68 tests simulés passent, dont les libellés sur les deux pages, les annulations de confirmation, les lots désactivés, le déroulé réel jusqu’à la fin du loto et les doubles clics.

## Commandes Animateur à droite et grand bouton d’écoute - 6 novembre 2026
- Déplacement de Lancer loto, Partie simple, Partie suivante et Menu dans la colonne de droite, avec le voyant de connexion.
- Suppression du nom générique répété après le numéro de partie (Partie n°5 / 10 · Partie 5 devient Partie n°5 / 10). Les noms personnalisés restent affichés.
- Rétablissement de la commande pause/reprise du micro PC : grand bouton de 80 px, en bas de la colonne droite et toujours accessible sur tablette. Les autres encadrés défilent si nécessaire au-dessus.
- Partie simple est désormais désactivé pendant le chargement et tout loto en cours, ainsi que l’entrée équivalente de la fenêtre de lancement.
- La commande d’écoute reste visible mais indisponible lorsque le PC est déconnecté, que son micro n’a pas encore été autorisé, qu’une commande est en attente ou que le tirage est réglé sur Manuel.
- Vérification : 64 tests simulés passent, dont les commandes d’écoute et le blocage de Partie simple. Disposition et pause/reprise vérifiées dans un aperçu local en 1280 × 800, 1024 × 768 et 768 × 1024.

## Boutons de lancement et navigation Animateur - 6 novembre 2026
- Lancer loto est désactivé pendant le chargement et lorsqu’un loto est déjà en cours, y compris après récupération de l’état mémorisé. Il redevient disponible lorsque le loto est arrêté ou terminé.
- Menu ouvre un nouvel onglet en conservant le code de session.
- Nouvelle version du script Animateur et de la feuille de style pour le chargement des correctifs après remplacement des fichiers sur le site.
- Contrôle du site publié : lors de la vérification, Animateur contenait encore un bouton Actualiser et son ancien script ; Public et Commissaire n’avaient plus ce bouton. Aucun bouton Actualiser ne figure dans les pages locales préparées.
- Vérification : 60 tests simulés passent, dont le blocage du lancement et le lien Menu. Structure et absence des boutons Actualiser vérifiées dans toutes les pages HTML.

## Synchronisation automatique sans bouton Actualiser - 6 novembre 2026
- Suppression de tous les boutons Actualiser restants : Public, Animateur, Commissaire, tableau de bord et suivi des ventes.
- Suppression du message public de retour de connexion qui invitait à actualiser.
- Placement à droite des voyants qui restent seuls dans leur barre sur Animateur et Commissaire. Le bouton Partie suivante est conservé à droite sur l’affichage public.
- Mise à jour automatique des statistiques du tableau de bord et des listes de ventes après les vérifications de connexion, avec protection contre les lectures simultanées.
- Vérification : aucun bouton Actualiser dans les pages HTML ; 57 tests simulés passent, dont la reprise automatique du tirage et des statistiques après reconnexion.

## Voyants Animateur et Commissaire - 6 novembre 2026
- Remplacement du texte d’état de connexion par le voyant vert/rouge sur les pages Animateur et Commissaire.
- Même info-bulle qu’en page Joueur, visible au survol, au clavier ou par appui : « Connecté » / « Non connecté. Vérifiez votre connexion Internet. »
- Les boutons Actualiser de ces pages restent disponibles avec leur fonctionnement existant.
- Vérification de la structure des deux pages, des indicateurs et de la conservation des boutons Actualiser.

## Connexion des spectateurs - 6 novembre 2026
- Voyant vert/rouge dans l’en-tête des pages Joueur et Mes cartons, sans bandeau d’actualisation manuelle.
- Info-bulle au survol, au clavier ou par appui sur le voyant : « Connecté » ou « Non connecté. Vérifiez votre connexion Internet. »
- Au retour de la connexion, récupération automatique du tirage depuis Supabase sans clic, avec conservation des cartons mémorisés. Le retour sur une page après mise en veille déclenche également le rattrapage.
- Le bouton Actualiser de secours sur le PC et son message de reconnexion sont conservés.
- Vérification : 56 tests simulés passent. Contrôle visuel des deux pages au format téléphone ; les 90 numéros et l’info-bulle restent dans l’écran en 320 × 568 et 390 × 844.

## Voyant et actualisation après reconnexion - 6 novembre 2026
- Le voyant public indique la disponibilité confirmée du serveur de session. Une erreur du canal de mise à jour en direct déclenche une vérification du serveur et ne provoque plus à elle seule un faux voyant rouge.
- Suppression du texte visible d’état de connexion sur l’affichage public, avec traitement de secours des anciennes balises et texte masqué par la feuille de style.
- Actualiser est grisé au démarrage normal et pendant une coupure. Il s’active après un retour de connexion confirmé et redevient grisé après une actualisation réussie.
- Message persistant et non bloquant, une seule fois par coupure : « Vous pouvez actualiser, connexion revenue. » Il se ferme manuellement ou après l’actualisation.
- Une actualisation réussie demande immédiatement aux autres écrans connectés de la même session de relire le tirage. La vérification périodique et le rattrapage au retour sur l’onglet restent actifs.
- Vérification : 53 tests simulés passent, dont le retour de connexion, le canal direct interrompu avec serveur accessible, le message unique et la propagation entre écrans sans modifier le tirage. Cycle rouge → vert → Actualiser contrôlé dans l’aperçu local du navigateur.

## Annonces complètes et répétitions vocales - 6 novembre 2026
- Un chiffre seul ou une dizaine pouvant se compléter n’est plus accepté sur la seule stabilité du texte provisoire : attente du résultat définitif ou du mot-clé de l’annonce suivante. Cela évite de bloquer 71 sur un 7 provisoire, ou 90 sur un 9 provisoire, même après une longue hésitation du service.
- Maintien des 200 ms de stabilité pour les numéros complets.
- Chaque annonce explicite est suivie séparément, même si le navigateur rassemble plusieurs annonces dans un même segment vocal.
- Reconstitution d’un mot-clé et de son numéro reçus dans deux segments séparés, avec expiration du contexte après 2,5 secondes.
- Suppression de la coupure logique de 350 ms entre deux numéros différents ; la protection de cinq secondes contre la répétition du même numéro reste active.
- Vérification : 47 tests simulés passent, avec les dix numéros signalés (90, 13, 23, 35, 46, 51, 63, 69, 71, 86), les révisions lentes 7 → 71 et 9 → 90, les annonces regroupées et les annonces séparées. La qualité de la transcription du navigateur doit encore être vérifiée au micro réel.

## Détection vocale à délai adapté - 6 novembre 2026
- Délai local réduit de 500 à 200 ms pour une transcription provisoire stable d’un numéro complet, soit 300 ms d’attente en moins sur ce chemin de détection.
- Délai de 500 ms maintenu pour les chiffres seuls, dix et les dizaines de 20 à 80, qui peuvent encore se compléter (9 → 90, soixante → soixante et onze, quatre-vingt → quatre-vingt-dix).
- Une reformulation du même numéro (42 → quarante-deux) ne relance plus le délai ; un changement de numéro le relance.
- Les résultats définitifs sont toujours pris en compte immédiatement, avec protection contre les doublons.
- Vérification : 36 tests simulés passent. Le délai du service de reconnaissance et les corrections tardives de ses transcriptions restent dépendants du navigateur et de la connexion ; essai au micro réel nécessaire.

## Commandes de secours sur le PC - 6 novembre 2026
- Bouton Partie suivante à côté d’Actualiser sur l’affichage public, avec confirmation avant chaque passage au lot suivant, à la partie suivante ou à la fin du loto.
- Le même bouton permet de lancer le Mini-bingo lorsqu’il est prêt. Il est désactivé lorsque le loto est terminé et pendant une action en cours.
- Voyant vert de connexion et rouge en cas de coupure, en remplacement du texte d’état sur l’affichage public. Le détail reste disponible au survol et pour les lecteurs d’écran.
- Conservation locale du programme complet (parties, lots, options et Mini-bingo), de la position actuelle et des changements effectués hors connexion, avant la mise à jour de l’interface.
- Correction de l’ordre de synchronisation des changements créés dans la même milliseconde avant et après une réouverture de page.
- Vérification : 32 tests simulés, dont un déroulé complet hors connexion jusqu’à la fin du Mini-bingo, puis synchronisation. Contrôle visuel du voyant et des deux boutons côte à côte.

## Reprise des numéros après coupure Internet - 4 novembre 2026
- Finalisation de la sauvegarde locale des numéros détectés et de leur transmission au retour de la connexion, avec fusion des changements de la même partie et protection contre les doublons.
- Bouton Actualiser et état de connexion sur les pages Public, Animateur, Commissaire, Joueur et Mes cartons. L’actualisation conserve les cartons saisis et ne recharge pas la page.
- Rattrapage au retour sur l’onglet et à la reprise de connexion, avec vérification périodique toutes les cinq secondes lorsque la page est visible.
- Une requête bloquée est interrompue après douze secondes ; les changements restent enregistrés pour une nouvelle tentative.
- La prévalidation des numéros continue pendant les problèmes de connexion, sans attendre la réponse du serveur.
- Clic de secours sur les numéros de la grille publique en cas de problème de microphone.
- Les changements d’une ancienne partie ne sont pas réinjectés dans la suivante ; un état « À vérifier » signale ce cas.
- Vérification : 12 tests simulés de reprise après coupure et 13 tests vocaux, plus contrôle du bouton Actualiser et de la grille publique dans le navigateur. Les annonces non reconnues pendant une coupure ne sont pas reconstituées.

## Détection vocale plus réactive - 4 novembre 2026
- Prise en compte d’une transcription provisoire inchangée pendant 500 ms, ou immédiate du résultat définitif.
- Le délai de stabilité repart à chaque révision du texte pour laisser le temps aux nombres composés de se compléter.
- Écoute continue sans arrêt/redémarrage du micro après chaque numéro ; délai anti-rebond réduit de 1 000 à 350 ms.
- Chaque segment vocal est traité une seule fois, avec protection contre les répétitions du même numéro.
- Vérification : 13 tests simulés dans tests/voice.test.cjs, dont les révisions 9 → 90, les nombres composés, la pause et les 90 nombres français. Essai au micro réel encore nécessaire ; une transcription provisoire peut être corrigée par le service après sa prise en compte.

## Affichage vocal dès la première annonce - 4 novembre 2026
- Le numéro est placé en attente dès qu’une seule annonce vocale stable est reconnue.
- Toucher ce numéro en attente dans la grille Animateur propose son annulation ; l’affichage revient alors au numéro précédemment tiré.

## Reconnaissance vocale plus rapide - 4 novembre 2026
- Un résultat provisoire stable peut confirmer le second numéro après 180 ms, sans attendre la transcription définitive du service vocal.
- Chaque segment parlé n’est pris en compte qu’une fois, même lorsque Chrome révise son texte.

## Affichage public pour projection - 4 novembre 2026
- Nom du loto dans le bandeau, avant le numéro de partie.
- Grille 10 colonnes x 9 lignes sur toute la hauteur à gauche, contraste renforcé.
- Colonne de droite : dernier numéro, lots, QR code ; dernier numéro repéré en orange dans la grille.
- Feuille css/public-display.css isolée pour ne pas modifier les autres pages.
- Contrôle des 90 cases et du placement sans débordement en 1024x768, 1280x720, 1366x768 et 1920x1080.

## Reconnaissance : exiger deux annonces réelles - 4 novembre 2026
- Les transcriptions provisoires et les résultats définitifs déjà traités ne comptent plus comme une répétition.
- La validation exige deux occurrences dans une phrase définitive, ou deux annonces définitives du même numéro.
- Correction de la reconnaissance des nombres français écrits en lettres.
- Vérification : 11 tests simulés (tests/voice-repetition.test.cjs et tests/pc-microphone.test.cjs).

## Commande du micro PC depuis Animateur - 4 novembre 2026
- Pause et reprise de la reconnaissance des numéros sur le PC depuis la tablette.
- Mode de reconnaissance du PC réglable depuis Animateur, sans activer le micro de la tablette.
- Confirmation par le PC, signalement des déconnexions et des refus d’accès au micro.
- Canal Supabase Realtime dédié à la session, sans modification des données du tirage ni du schéma SQL.
- La diffusion de la voix vers l’enceinte reste gérée par Windows.
- Vérification : node --test tests/pc-microphone.test.cjs (6 tests simulés).

## v4.2.2
- Rétablissement de la commande de fermeture du carton sur l’affichage public depuis la page Commissaire.

# v4.2.0

- Stabilisation du cycle de partie et du Mini-bingo.
- Pause de l’écoute vocale.
- Arrêt manuel d’un loto actif.
- Réinitialisation fiable du formulaire de création.

## v4.1.10
- Correction du contrôle du dernier numéro : il doit être présent sur la ligne gagnante ou sur le carton plein, sans obligation d’être le numéro qui complète mathématiquement le gain.
- Le dernier numéro reste affiché avec un fond orange.
- Suppression des commandes et textes sous la grille du carton contrôlé.

# v4.1.8

- Stabilisation création des lotos, numérotation et contrôle d’intégrité.
- Voir README_V4_1_8.md.

# v4.1.7

- Correction du controle du dernier numero : le numero en attente/deja synchronise est bien compte comme sorti.
- Le dernier numero a maintenant un fond orange dans la grille.
- Suppression des textes explicatifs sous le titre Controle carton.

## v4.1.6
- Fluidification du scanner vendeur : sons, vibrations, validation automatique et ecran Joueur termine.

# v4.1.6

- Contrôle commissaire simplifié : uniquement VALIDE ou NON VALIDE.
- Grille du carton conservée avec numéros sortis en vert, non sortis en gris et dernier numéro en orange.
- Barre Animateur limitée à Lancer loto, Partie simple, Gagnant et Menu.
- Suppression des commandes Annuler, Corriger et du compteur Sortis sur la page Animateur.

## v4.1.6
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

## v4.1.9
- Affichage public des lots simplifié.
- Mode carton plein : uniquement 1er LOT, 2e LOT et 3e LOT.
- Mode à la ligne : indication 1 LIGNE, 2 LIGNES et CARTON PLEIN sur chaque lot.
- Libellés en blanc et contenu des lots en orange.
