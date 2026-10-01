# Les Portes du Destin

Le tableau de bord de mes lives TikTok de voyance, en plein écran sur tablette (mode paysage).
Il réunit la liste des personnes à traiter (gagnants du jeu et priorités cadeaux), les messages épinglés, les messages de l’univers, le top des likeurs, un ruban de messages, une radio… et le **Jeu des Portes** : douze portes enchantées en arc autour d’un dé à 12 faces.

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

## Le tableau de bord (accueil)

- **En haut** : 📌 le **message épinglé** du live, en grand (la taille du texte s’adapte à sa longueur), et à côté la case **✉️ Message de l’univers** (les Donuts : touchez ✓ une fois le message lu).
- **À gauche** : ❤ **Top Likes** et 🎁 **Top Gifters** (pièces offertes).
- **Au centre** : une grande case où vos **messages et règles** défilent doucement.
- **À droite (environ 1/3)** : la **liste à traiter**, titrée « X tirages avant le prochain jeu », avec la personne **en cours** en grand. Dessous : **Retour en arrière** et **Personne suivante**. Le ✕ retire une personne.
- **En bas** : le ruban des messages, puis 🌙 veille, ⚙ réglages, ⛶ plein écran et l’état de la connexion TikTok à gauche ; le bouton **Jeu des Portes** (serrure) au milieu ; la **radio** à droite.

Tout est sauvegardé sur l’appareil : un rechargement de page en plein live ne fait rien perdre. Au début d’un nouveau live : **⚙ Réglages → Nouveau live**.

### L’ordre de la liste
1. **Priorités** : 🐱 Chat porte-bonheur (1 question) et 🌌 Galaxie (3 questions), dans l’ordre exact d’envoi des cadeaux. Chaque cadeau compte : 3 chats = 3 questions.
2. **Gagnants du Jeu des Portes**, ajoutés quand le jeu se ferme.
3. **🏅 Paliers de likes** (100k, 150k, 200k…), tout en bas.

### Les animations
- **Chat porte-bonheur** : le chat apparaît en grand avec un miaulement, « 1 question en priorité pour : [pseudo] ».
- **Galaxie** : une galaxie scintille au milieu de l’écran, son de harpe, « 3 questions en priorité pour : [pseudo] ».
- **Donut** : une enveloppe virevolte parmi les étoiles et les comètes, s’arrête, se retourne côté destinataire avec le pseudo, puis file dans la case « Message de l’univers ».
- **Palier de likes** : le pseudo s’affiche en grand avec une fanfare et des confettis.

Les animations passent l’une après l’autre. Chacune peut être désactivée dans les Réglages.

### Les paliers de likes
À partir de **99 800 likes**, un bandeau annonce que le palier approche. Dès que le compteur atteint **réellement 100 000** (puis 150 000, 200 000…), la **première personne qui l’écrit dans le chat** (« 100k », « 100 000 », « 100000 » ou « palier ») remporte le palier. Les messages envoyés avant d’atteindre le palier ne comptent pas. Les nombres et les mots acceptés sont réglables.

### La radio
Elle lit la playlist de la radio du Grimoire. Quand elle joue, le titre du morceau s’affiche. **Touchez le lecteur** : un petit menu s’ouvre avec le **volume** et la **playlist** (touchez un titre pour le jouer) ; touchez en dehors ou la flèche ← pour le fermer. Pendant le Jeu des Portes, le volume baisse.

### Écran de veille
🌙 : seulement les messages du ruban, en très grand, sur fond sombre. Touchez l’écran pour revenir.

---

## Le Jeu des Portes

1. **🚪 Jeu des Portes** ouvre l’écran de départ : **Commencer avec le chat**, ou **Sans le chat** (tirage simple).
2. Compte à rebours **3… 2… 1… Le jeu commence !** : les spectateurs écrivent leur chiffre de 1 à 12.
3. **Lancer le dé** : les participations se ferment, la porte s’ouvre et affiche ses gagnants.
4. Pas assez de monde derrière cette porte ? **Relancer le dé** : il ne peut tomber que sur une porte **pas encore ouverte** (les portes ouvertes sont estompées). Relancez autant de fois que vous voulez.
5. Tous les gagnants s’accumulent (la barre en haut indique les portes ouvertes et le nombre de gagnants).
6. **Fermer le jeu** : les gagnants rejoignent la liste du tableau de bord.

Le bouton **☰** ouvre le menu du jeu (fermer le jeu, messages, son, écran de veille, plein écran, réglages). Sur ordinateur, **Espace** lance le dé ; sur le tableau de bord, **→** passe à la personne suivante.

Le tirage est vraiment aléatoire : il utilise le générateur cryptographique du navigateur.

---

## La page Réglages
Tout ce qui concerne l’administration est sur une page à part (`admin.html`, bouton ⚙). Ces réglages restent enregistrés sur l’appareil utilisé.

- **Connexion TikTok** : pseudo, clé API, test de connexion.
- **Cadeaux** : quels cadeaux déclenchent le Chat porte-bonheur, la Galaxie et le Donut (remplaçables).
- **Ruban défilant** et **Case centrale** : vos messages, un par ligne, et leur vitesse.
- **Personnalisation** : presque tout est modifiable.
  - *Disposition* : côté de la liste (droite ou gauche), largeurs des colonnes, hauteur du message épinglé, taille des textes, nombre de personnes dans les tops.
  - *Textes du tableau de bord* : titre de la liste, boutons, titres des cases.
  - *Animations des cadeaux* : chacune activable, ses textes, le nombre de questions par Chat et par Galaxie, la durée.
  - *Paliers de likes* : premier palier, intervalle, alerte, mots acceptés, textes.
  - *Textes du Jeu des Portes* : titres, écran de départ, compte à rebours (activable), résultats.
  - Dans les textes, **{n}**, **{q}** et **{palier}** sont remplacés automatiquement. **Tout remettre par défaut** annule tout.
- **Affichage et son** : chaque case du tableau de bord peut être masquée (message épinglé, enveloppes, Top Likes, Top Gifters, case centrale, liste, jeu, radio) ; le ruban et le son.
- **Nouveau live** et **simulations**.

### Cadeaux (remplaçables)
Chaque rôle est déclenché par une liste de noms de cadeaux, modifiable. TikTok envoie souvent les noms **en anglais** (par exemple *Galaxy*, *Doughnut*). Le plus sûr : pendant un live, les cadeaux reçus apparaissent dans **Cadeaux reçus récemment** ; choisissez le rôle de chacun puis **Enregistrer les cadeaux**.

---

## Modifier les messages défilants (ruban et case centrale)

Le ruban du bas lit **`messages.json`**, la case centrale lit **`regles.json`**. Les deux se modifient de la même façon. Deux possibilités :

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

### Ce que l’application lit dans le live
- **Le chat** : les chiffres du Jeu des Portes.
- **Les cadeaux** : nom, identifiant, valeur en pièces, expéditeur et nombre envoyé (combos compris) : liste, animations et Top Gifters.
- **Les likes** : par personne pour le Top Likes, et le total du live pour les paliers.
- **Le message épinglé** : affiché dans la case 📌 (et retiré quand vous le désépinglez).

### Pendant le jeu
Les spectateurs écrivent un chiffre de 1 à 12 dans le chat, seul (« 7 ») ou dans une phrase (« je prends la 7 ✨ ») ; les chiffres en emoji comme 7️⃣ ou 🔟 comptent aussi. Près de chaque porte, un petit personnage apparaît pour chaque personne qui l’a choisie (au-delà de 8, un « +N »). Chaque groupe porte le numéro de sa porte et se place là où il ne cache rien.

### Les règles appliquées automatiquement
- **Une seule participation par personne.** Répéter le même chiffre ne change rien.
- **Changer de chiffre élimine.** Une personne qui écrit un autre chiffre, ou deux chiffres différents dans le même message (« 3 ou 5 »), passe dans la zone **Éliminés** et n’est plus comptée.
- Les messages sans chiffre de 1 à 12 sont ignorés, tout comme « 25 », « 2025 », « 1ère » ou « 3h ».
- Vos propres messages sont ignorés : vous pouvez écrire « tapez un chiffre entre 1 et 12 » sans être éliminé.

### Répéter sans être en live
**⚙ Réglages → Répéter sans être en live** :
- **Simuler cadeaux, likes et palier** : les animations, la liste, les enveloppes, les tops et un palier de 100k ;
- **Simuler le Jeu des Portes** : de faux spectateurs remplissent les portes, certains changent d’avis et sont éliminés.

---

## Sons personnalisés

Par défaut, l’application synthétise ses propres sons. Pour utiliser les vôtres, déposez un fichier MP3 dans le dossier **`sounds/`** avec l’un de ces noms :

| Fichier        | Moment                                            |
| -------------- | ------------------------------------------------- |
| `de.mp3`       | le dé est lancé (le fichier couvre tout le roulé) |
| `porte.mp3`    | la porte s’ouvre                                  |
| `resultat.mp3` | le message ou la liste des gagnants apparaît      |
| `jeu.mp3`      | « Le jeu commence ! » : les participations s’ouvrent |
| `chat.mp3`     | Chat porte-bonheur (miaulement)                   |
| `galaxie.mp3`  | Galaxie (harpe)                                   |
| `enveloppe.mp3`| Donut : l’enveloppe virevolte (papier froissé)    |
| `palier.mp3`   | palier de likes atteint                           |

Sur GitHub : dossier `sounds` → **Add file** → **Upload files**. Supprimez le fichier pour revenir au son d’origine.

---

## Logos et illustrations des cadeaux

Le plus simple : **Réglages → Images et sons des cadeaux**, puis **Choisir** pour chaque logo, illustration ou son. Les fichiers sont gardés dans l’appareil (déposez-les sur la tablette du live) et passent avant ceux du dépôt GitHub.

Pour qu’ils soient sur tous les appareils, déposez-les plutôt dans le dossier **`images/`** avec ces noms (extension `.png`, `.webp`, `.jpg`, `.gif` ou `.svg`) :

| Fichier                     | Où il apparaît                                            |
| --------------------------- | --------------------------------------------------------- |
| `logos/chat.png`            | liste à traiter : Chat porte-bonheur                      |
| `logos/galaxie.png`         | liste à traiter : Galaxie                                 |
| `logos/enveloppe.png`       | case « Message de l’univers »                             |
| `animations/chat.png`       | grande animation du Chat porte-bonheur                    |
| `animations/galaxie.png`    | grande animation de la Galaxie                            |
| `animations/enveloppe.png`  | enveloppe qui virevolte (le pseudo est écrit par-dessus)  |

Tant qu’une image manque, l’application garde son dessin. La position, la taille, la couleur et l’écriture du pseudo sur l’enveloppe se règlent dans **Réglages → Personnalisation → Animations des cadeaux**. Détails dans `images/LISEZMOI.md`.

Dans les Top Gifters, la pièce dorée indique le nombre de pièces TikTok offertes par chaque personne.

---

## Organisation des fichiers

```
index.html            la page unique
admin.html            la page des réglages
messages.json         les messages du ruban (modifiables sur GitHub)
regles.json           les messages de la case centrale (modifiables sur GitHub)
manifest.webmanifest  installation sur la tablette
sw.js                 fonctionnement hors ligne
css/                  styles (base, scène, portes, interface)
js/
  main.js             tableau de bord, événements du live, Jeu des Portes
  dashboard.js        affichage du tableau de bord
  queue.js            liste à traiter, classements (likes, gifters), paliers de likes
  settings.js         tout ce qui est personnalisable (textes, disposition…)
  celebrate.js        grandes animations (Chat, Galaxie, enveloppe, palier)
  images.js           recherche des logos et illustrations fournis (Réglages ou images/)
  media.js            images et sons déposés dans les Réglages (gardés dans l’appareil)
  gifts.js            rôles des cadeaux et comptage des combos
  features.js         modules activables, réglages des cadeaux
  radio.js            radio (playlist du Grimoire)
  shell.js            petites fenêtres, plein écran, écran allumé
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
  game.js             règles du jeu (participations, éliminations, relances)
  tiktok.js           connexion au chat via Euler Stream
fonts/                polices Cinzel et Cormorant Garamond (licence OFL)
icons/                icônes de l’application
images/               logos et illustrations des cadeaux (facultatif)
sounds/               sons personnalisés (facultatif)
tests/                tests des règles du jeu
```

Pour changer l’apparence d’une porte (couleur, fleurs, forme de l’arche, médaillon), modifiez sa fiche dans `js/doors-data.js`. Les options possibles sont listées en haut du fichier.

### Tests
Les règles du jeu, de la liste et des cadeaux sont couvertes par des tests automatiques (Node.js 20 ou plus) :

```
npm test
```

Pour essayer l’application sur un ordinateur, servez le dossier avec n’importe quel petit serveur, par exemple `python3 -m http.server`, puis ouvrez <http://localhost:8000>.
