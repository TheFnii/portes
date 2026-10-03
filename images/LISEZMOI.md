# Images des cadeaux

> Plus simple : **Réglages → Images et sons des cadeaux** permet de déposer chaque image
> directement depuis la tablette, sans passer par GitHub.

Déposez vos images dans ces dossiers **avec exactement ces noms** (l'extension peut être
`.png`, `.webp`, `.jpg`, `.jpeg`, `.gif` ou `.svg` ; le PNG transparent est conseillé).
Tant qu'une image manque, l'application garde son dessin ou son emoji.

| Fichier                         | Où il apparaît                                              |
| ------------------------------- | ----------------------------------------------------------- |
| `logos/chat.png`                | liste à traiter : personnes du Chat porte-bonheur           |
| `logos/galaxie.png`             | liste à traiter : personnes de la Galaxie                   |
| `logos/enveloppe.png`           | case « Message de l'univers » (titre et liste des Donuts)   |
| `animations/chat.png`           | grande animation du Chat porte-bonheur                      |
| `animations/galaxie.png`        | grande animation de la Galaxie                              |
| `animations/enveloppe-dos.png`  | enveloppe, côté sceau de cire : elle virevolte puis se retourne |
| `animations/enveloppe.png`      | enveloppe, côté destinataire : le pseudo est écrit dessus   |
| `animations/lettre.png`         | lettre ouverte vierge : le message est écrit dessus         |

Conseils :

- logos : image carrée, environ 256 × 256 px ;
- animations : environ 1000 px de large, fond transparent ;
- enveloppe : les deux côtés doivent avoir la même taille. Le pseudo est écrit par-dessus le côté destinataire. Sa position, sa taille, sa couleur et son
  écriture se règlent dans **Réglages → Personnalisation → Animations des cadeaux**.

Sur GitHub : ouvrez le dossier `images/logos` (ou `images/animations`) → **Add file** →
**Upload files**, glissez les fichiers, puis **Commit changes**.
Pour revenir au dessin d'origine, supprimez le fichier.

Pour changer un nom ou un dossier, modifiez `IMAGES` dans `js/config.js`.
