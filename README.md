# Les Portes du Destin

Une page plein écran pour animer les lives TikTok de voyance, pensée pour une tablette en mode paysage.
Douze portes enchantées sont disposées en arc dans un jardin, autour d’un dé à 12 faces.
On lance le dé : il roule, le chiffre sort, la porte correspondante s’avance, s’ouvre dans un flot de lumière, et le résultat s’affiche.

- **L’application** : `https://thefnii.github.io/portes/`

Tout fonctionne dans le navigateur, sans serveur. Les sons sont synthétisés en direct, donc libres de droits.

---

## Mise en route (une seule fois)

### 1. Activer GitHub Pages
1. Sur GitHub, ouvrez le dépôt **portes** → **Settings** → **Pages**.
2. **Source** : *Deploy from a branch*.
3. **Branch** : `main`, dossier `/ (root)` → **Save**.
4. Une à deux minutes plus tard, le lien de l’application apparaît en haut de cette page.

### 2. L’installer sur la tablette
- **Android (Chrome)** : ouvrez le lien → menu **⋮** → **Ajouter à l’écran d’accueil**. L’application s’ouvre ensuite en plein écran.
- **iPad (Safari)** : ouvrez le lien → bouton **Partager** → **Sur l’écran d’accueil** → **Ajouter**.

**Sur iPad, c’est la seule façon d’avoir un vrai plein écran** : Safari ne permet pas à une page de masquer ses barres. Ouvrez toujours l’appli depuis son icône, elle s’affiche alors sans aucune barre.

L’application demande à la tablette de garder l’écran allumé, si le navigateur le permet. Pensez tout de même à brancher la tablette pendant le live.

---

## Les écrans

### L’accueil
- **Jeu des Portes** : la version simple, sans connexion TikTok.
- **Jeu des Portes · TikTok** : le chat participe et les gagnants s’affichent.
- **Messages défilants** : active ou coupe le bandeau de messages.
- **Écran de veille** : seulement les messages, en très grand, sur fond sombre, sans rien d’autre. À laisser pendant le live entre deux jeux. Touchez l’écran pour revenir.
- En haut à droite : **⛶** plein écran et **⚙** réglages.

### La page Réglages
Tout ce qui concerne l’administration est sur une page à part (`admin.html`, bouton ⚙) : connexion TikTok, modification des messages, son, aide au plein écran et simulation. Ces réglages restent enregistrés sur l’appareil utilisé.

### Le jeu
- Touchez **Lancer le dé**, ou directement le dé.
- Le bouton **☰**, en haut à gauche, ouvre le menu du jeu : retour à l’accueil, messages défilants, son, nouvelle partie, écran de veille, plein écran et réglages.
- Sur ordinateur, la barre **Espace** fait la même chose que le grand bouton doré.

Le tirage est vraiment aléatoire : il utilise le générateur cryptographique du navigateur, et chaque face a exactement une chance sur 12.

---

## Modifier les messages défilants

Deux possibilités :

**1. Depuis les réglages (le plus simple)** : ⚙ → **Messages défilants**, un message par ligne, réglez la vitesse, vérifiez l’aperçu puis **Enregistrer les messages**. Ils s’affichent aussitôt, mais seulement sur cet appareil. **Revenir aux messages du fichier** rétablit ceux de GitHub.

**2. Depuis GitHub (pour tous les appareils)** : les messages par défaut sont dans le fichier **`messages.json`**, à la racine du dépôt. Vous seul pouvez le modifier, puisque vous seul avez accès au dépôt : les spectateurs voient les messages mais ne peuvent pas les changer.

1. Sur GitHub, ouvrez le dépôt **portes**, puis cliquez sur **`messages.json`**.
2. Cliquez sur le crayon ✏️ (**Edit this file**).
3. Modifiez les phrases :

```json
{
  "vitesse": 80,
  "messages": [
    "✨ Bienvenue dans mon live ✨",
    "Posez votre question en commentaire",
    "Un nouveau message ici"
  ]
}
```

4. Cliquez sur **Commit changes…** puis de nouveau sur **Commit changes**.
5. Une à deux minutes plus tard, rechargez l’application : les nouveaux messages défilent.

**Les règles à respecter** (sinon le bandeau ne s’affiche plus) :
- chaque message est entre guillemets droits `"…"` ;
- une **virgule** sépare deux messages, mais il n’en faut **pas** après le dernier ;
- à l’intérieur d’un message, utilisez l’apostrophe `’` ou `'` sans problème. En revanche, un guillemet droit `"` doit s’écrire `\"`. Le plus simple est d’utiliser « » ;
- les emojis sont les bienvenus ✨🔮🌙.

`vitesse` règle la vitesse de défilement, en pixels par seconde : 60 est lent, 80 est normal, 120 est rapide.

> Astuce : en cas de doute, collez le contenu du fichier sur <https://jsonlint.com> et cliquez sur *Validate JSON*.

---

## Le jeu avec TikTok (Euler Stream)

TikTok ne propose pas d’accès officiel au chat des lives. L’application passe donc par **Euler Stream**, un service qui relaie le chat en direct.

### Obtenir la clé API
1. Créez un compte sur <https://www.eulerstream.com>.
2. Dans votre tableau de bord, créez une **clé API** et copiez-la. Vérifiez sur leur site les limites et le prix de la formule choisie.

### La saisir dans l’application
1. Accueil → **⚙ Réglages** (ou ☰ → Réglages dans le jeu).
2. Renseignez votre **@pseudo TikTok** et collez la **clé API**.
3. Touchez **Enregistrer**, puis **Tester la connexion** si vous êtes en live.

Le pseudo et la clé restent uniquement dans le navigateur de la tablette ; ils ne sont jamais envoyés sur GitHub. Si vous changez d’appareil, il faudra les saisir à nouveau.

> La clé est un mot de passe : ne montrez jamais l’écran **Réglages** pendant le live. **Oublier la clé** l’efface de la tablette.

L’indicateur en haut à droite du jeu montre l’état de la connexion : vert quand vous êtes connecté, orange pendant la connexion ou quand vous n’êtes pas encore en live. Dans ce dernier cas, l’application réessaie toute seule.

### Déroulement d’une partie
1. **Lancer le jeu** : les participations s’ouvrent.
2. Les spectateurs écrivent un chiffre de 1 à 12 dans le chat, seul (« 7 ») ou dans une phrase (« je prends la 7 ✨ »). Les chiffres en emoji comme 7️⃣ ou 🔟 comptent aussi.
3. Près de chaque porte, un petit personnage apparaît pour chaque personne qui l’a choisie (au-delà de 8, un « +N » s’affiche). Chaque groupe porte le numéro de sa porte et se place automatiquement là où il ne cache rien. Le panneau **Participants** montre les derniers inscrits.
4. **Lancer le dé** ferme les participations et lance le dé.
5. La porte s’ouvre et affiche la liste des gagnants, avec leur photo de profil quand TikTok la fournit.
6. **Nouvelle partie** efface les participants et rouvre aussitôt les participations.

### Les règles appliquées automatiquement
- **Une seule participation par personne.** Répéter le même chiffre ne change rien.
- **Changer de chiffre élimine.** Une personne qui écrit un autre chiffre, ou deux chiffres différents dans le même message (« 3 ou 5 »), passe dans la zone **Éliminés** et n’est plus comptée.
- Les messages sans chiffre de 1 à 12 sont ignorés, tout comme « 25 », « 2025 », « 1ère » ou « 3h ».
- Vos propres messages sont ignorés : vous pouvez écrire « tapez un chiffre entre 1 et 12 » sans être éliminé.

### Répéter sans être en live
**⚙ Réglages → Lancer une simulation** : de faux spectateurs remplissent les portes, et certains changent d’avis et sont éliminés. C’est l’idéal pour s’entraîner ou vérifier l’affichage avant le live.

---

## Sons personnalisés

Par défaut, l’application synthétise ses propres sons. Pour utiliser les vôtres, déposez un fichier MP3 dans le dossier **`sounds/`** avec l’un de ces noms :

| Fichier        | Moment                                            |
| -------------- | ------------------------------------------------- |
| `de.mp3`       | le dé est lancé (le fichier couvre tout le roulé) |
| `porte.mp3`    | la porte s’ouvre                                  |
| `resultat.mp3` | le message ou la liste des gagnants apparaît      |
| `jeu.mp3`      | « Lancer le jeu » : les participations s’ouvrent  |

Sur GitHub : dossier `sounds` → **Add file** → **Upload files**. Supprimez le fichier pour revenir au son d’origine.

---

## Organisation des fichiers

```
index.html            la page unique
admin.html            la page des réglages
messages.json         les messages défilants par défaut (modifiables sur GitHub)
manifest.webmanifest  installation sur la tablette
sw.js                 fonctionnement hors ligne
css/                  styles (base, scène, portes, interface)
js/
  main.js             enchaînement des écrans et du jeu
  admin.js            page des réglages
  messages.js         lecture des messages (réglages ou messages.json)
  config.js           titres, noms des fichiers de sons, réglages
  doors-data.js       les 12 portes : forme, couleurs, fleurs
  doors-art.js        dessin des portes en SVG
  doors.js            arc, zoom et ouverture des portes
  scene.js            jardin, place pavée, disposition en arc
  dice.js             dé à 12 faces en 3D
  fx.js               particules et lumières
  sound.js            sons synthétisés (ou fichiers de sounds/)
  ticker.js           bandeau des messages
  game.js             règles du jeu (participations, éliminations)
  tiktok.js           connexion au chat via Euler Stream
fonts/                polices Cinzel et Cormorant Garamond (licence OFL)
icons/                icônes de l’application
sounds/               sons personnalisés (facultatif)
tests/                tests des règles du jeu
```

Pour changer l’apparence d’une porte (couleur, fleurs, forme de l’arche, médaillon), modifiez sa fiche dans `js/doors-data.js`. Les options possibles sont listées en haut du fichier.

### Tests
Les règles du jeu sont couvertes par des tests automatiques (Node.js 20 ou plus) :

```
npm test
```

Pour essayer l’application sur un ordinateur, servez le dossier avec n’importe quel petit serveur, par exemple `python3 -m http.server`, puis ouvrez <http://localhost:8000>.
