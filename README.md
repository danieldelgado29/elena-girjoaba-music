# Elena Girjoaba Music — Música a la Carta

Página web interactiva para shows en vivo de **Elena Girjoaba Music**.

## Experiencia

1. El público escanea el QR.
2. Conoce los formatos disponibles: dúo, trío y banda completa.
3. Puede visitar Instagram.
4. Entra a **Música a la Carta**.
5. Busca una canción por número, título o artista.
6. Grita el número o el nombre durante el show.

## Archivos

```text
elena-girjoaba-music/
├── index.html
├── style.css
├── script.js
├── canciones.json
├── README.md
└── assets/
    ├── foto-banda.jpg
    ├── hero.jpg
    └── favicon.png
```

## Probar en la computadora

No abras únicamente `index.html` con doble clic, porque algunos navegadores bloquean la lectura de `canciones.json`.

### Opción sencilla con Python

1. Abre Terminal.
2. Entra a la carpeta del proyecto.
3. Ejecuta:

```bash
python3 -m http.server 8000
```

4. Abre en el navegador:

```text
http://localhost:8000
```

## Publicar en GitHub Pages desde el navegador

1. Inicia sesión en GitHub.
2. Crea un repositorio nuevo llamado `elena-girjoaba-music`.
3. Déjalo como **Public**.
4. Entra al repositorio.
5. Pulsa **Add file** → **Upload files**.
6. Descomprime el ZIP en tu Mac.
7. Arrastra todos los archivos y la carpeta `assets` al área de carga.
8. Espera a que terminen de subir.
9. Escribe un mensaje como `Primera versión de la web`.
10. Pulsa **Commit changes**.
11. Ve a **Settings**.
12. En el menú lateral, entra a **Pages**.
13. En **Build and deployment**, selecciona **Deploy from a branch**.
14. Escoge la rama `main`.
15. Escoge la carpeta `/ (root)`.
16. Pulsa **Save**.

La dirección tendrá una forma similar a:

```text
https://TU-USUARIO.github.io/elena-girjoaba-music/
```

Esa dirección se puede usar para crear el QR.

## Contacto

- Instagram: `@elenagirjoabamusic`
- WhatsApp para contrataciones: `+593 98 738 8915`
