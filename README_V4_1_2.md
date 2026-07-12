# Loto by SdS v4.1.2

Version de stabilisation des paramètres Vente.

- Unification des paramètres `sales_tracking_enabled` et `validation_voucher_enabled`.
- Compatibilité avec les anciens alias éventuellement présents dans l'état JSON.
- Enregistrement immédiat des options sur le loto actif.
- Le bouton Enregistrer ne vide plus le loto actif.
- Diagnostic visible dans Suivi des ventes.
- Mode visible sur le scanner vendeur.
- Version affichée sur le scanner.

Aucune migration SQL n'est nécessaire : ces paramètres sont stockés dans l'état JSON de `loto_app_sessions`.
