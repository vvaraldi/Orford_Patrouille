# Orford Patrouille - Portail Central

Portail d'accès centralisé pour les applications de patrouille du Mont Orford.

## Description

Ce portail sert de point d'entrée unique pour toutes les applications utilisées par les patrouilleurs du Mont Orford :

- **Inspection piste de rando** (Ski-Track) - Gestion des inspections de sentiers et abris
- **Infractions** - Gestion des rapports d'infraction
- **Signalisation** - *(À venir)* Gestion de la signalisation
- **Gestion des utilisateurs** - Administration centralisée des comptes

## Fonctionnalités

### Authentification centralisée
- Connexion unique pour toutes les applications
- Gestion du mot de passe (changement et récupération)
- Session partagée entre les applications (même projet Firebase)

### Gestion des utilisateurs (Admin)
- Création de nouveaux utilisateurs
- Modification des informations (cliquer sur le nom)
- Gestion des rôles (Admin/Inspecteur)
- Gestion des accès par application
- Activation/Désactivation des comptes

### Accès aux applications
- Affichage dynamique basé sur les permissions
- Navigation directe vers les applications autorisées
- Indication visuelle des applications non accessibles

## Structure du projet

```
Orford_Patrouille/
├── index.html              # Page d'accueil du portail
├── pages/
│   ├── login.html          # Page de connexion
│   ├── forgot-password.html # Récupération de mot de passe
│   ├── change-password.html # Changement de mot de passe
│   └── admin.html          # Gestion des utilisateurs
├── css/
│   ├── main.css            # Point d'entrée CSS
│   ├── config/
│   │   └── variables.css   # Variables et thèmes
│   ├── base/
│   │   ├── reset.css
│   │   └── typography.css
│   ├── layout/
│   │   ├── header.css
│   │   ├── main.css
│   │   └── footer.css
│   ├── components/
│   │   ├── buttons.css
│   │   ├── cards.css
│   │   ├── forms.css
│   │   ├── tables.css
│   │   ├── modals.css
│   │   ├── alerts.css
│   │   └── tabs.css
│   ├── pages/
│   │   ├── portal.css
│   │   ├── auth.css
│   │   └── admin.css
│   ├── utilities/
│   │   └── helpers.css
│   └── responsive/
│       └── breakpoints.css
├── js/
│   ├── auth.js             # Authentification Firebase
│   ├── mobile-menu.js      # Menu mobile
│   ├── portal.js           # Logique du portail
│   ├── login.js            # Page de connexion
│   ├── forgot-password.js  # Récupération mot de passe
│   ├── change-password.js  # Changement mot de passe
│   └── admin.js            # Gestion des utilisateurs
└── assets/                 # Images et ressources
```

## Configuration Firebase

Le portail utilise le même projet Firebase que les autres applications :
- Projet: `trail-inspection`
- Collection utilisateurs: `inspectors`

### Champs utilisateur (inspectors collection)
```javascript
{
  name: string,           // Nom complet
  email: string,          // Email
  phone: string | null,   // Téléphone (optionnel)
  role: 'admin' | 'inspector',
  status: 'active' | 'inactive',
  allowInspection: boolean,  // Accès à Ski-Track
  allowInfraction: boolean,  // Accès aux Infractions
  createdAt: timestamp,
  createdBy: string        // UID du créateur
}
```

## Thèmes

Le système de thèmes permet de changer rapidement l'apparence :

```html
<!-- Thème par défaut (Bleu Alpin) -->
<body>

<!-- Thème Infraction (Rouge) -->
<body data-theme="infraction">

<!-- Thème Forêt (Vert) -->
<body data-theme="forest">

<!-- Thème Sombre -->
<body data-theme="dark">
```

Pour créer un nouveau thème, ajoutez les variables dans `css/config/variables.css`.

## Déploiement

### GitHub Pages
1. Créer un nouveau repository `Orford_Patrouille`
2. Pousser le code
3. Activer GitHub Pages (Settings > Pages > Source: main branch)
4. L'URL sera: `https://vvaraldi.github.io/Orford_Patrouille/`

### Mise à jour des liens
Après déploiement, vous pourrez mettre à jour les autres applications pour pointer vers ce portail.

## Prochaines étapes

1. **Mettre à jour** les applications existantes pour utiliser ce portail
2. **Optionnel**: Ajouter un lien de retour au portail dans les autres apps
3. **Retirer** les pages de gestion utilisateurs de Inspection_Orford
4. **Ajouter** Signalisation quand elle sera prête

## Notes techniques

- Les sessions Firebase sont partagées entre les applications du même domaine
- Navigation dans la même fenêtre (pas de nouvel onglet)
- Design responsive (mobile-first)
- CSS modulaire avec variables
