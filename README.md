# Qui-Salus

Web app per il telefono che mostra i servizi sanitari vicino a te presi da OpenStreetMap: farmacie,
parafarmacie, pronto soccorso, ospedali, ambulatori e cliniche, medici, dentisti, laboratori analisi e centri prelievi,
defibrillatori (DAE) e altri servizi (fisioterapisti, consultori…).
Stesso aspetto e funzionamento di [Distributori](https://github.com/paolo1957-it/Distributori).

## Come funziona

- I segnaposto hanno un colore e un simbolo per tipo; un pallino verde o rosso dice se è aperto adesso,
  calcolato dagli orari (`opening_hours`) scritti su OpenStreetMap.
- I laboratori analisi vengono riconosciuti anche quando su OpenStreetMap non hanno `healthcare=laboratory`:
  dalla specialità (`healthcare:speciality=biology`, `blood_check`…) o dal nome ("Laboratorio analisi",
  "Centro prelievi", "Analisi cliniche"…), scartando i laboratori di analisi di acque, alimenti e simili.
  Scegliendo **Laboratori** si vedono anche gli ambulatori che fanno prelievi.
- Il pulsante rosso **PS** porta al pronto soccorso più vicino, quello verde alla farmacia più vicina aperta.
- A ogni pubblicazione GitHub esegue `aggiorna_salute.js` (workflow `.github/workflows/pubblica.yml`):
  scarica da Overpass tutti i punti sanitari d'Italia e li salva nella cartella `dati/` del sito pubblicato,
  divisi in tessere da 0,25° (circa 28 × 20 km). Per non pesare su Overpass li riscarica al massimo una volta
  ogni 20 ore; nel frattempo ricopia quelli già pubblicati.
- La cartella `dati/` **non** sta nel repository. Se il sito non ha i dati, l'app li chiede direttamente a Overpass.
- I turni delle farmacie non sono su OpenStreetMap; la guida dell'app lo spiega.

## Pubblicazione

Impostazioni del repository → Pages → Source: **GitHub Actions**.
Per riscaricare subito i dati: Actions → *Pubblica sito e aggiorna dati* → *Run workflow*.

## File

- `index.html`, `style.css`: interfaccia
- `core.js`: logica (tipi di punto, orari di apertura, distanze, tessere)
- `app.js`: mappa, GPS, elenco, impostazioni
- `config.js`: impostazioni iniziali e numero di versione
- `aggiorna_salute.js`, `.github/workflows/pubblica.yml`: scaricamento dei dati e pubblicazione
- `sw.js`, `manifest.webmanifest`: installazione come app
- `icon-192.png`, `icon-512.png`, `favicon-64.png`, `apple-touch-icon.png`, `icon-maskable-512.png`: logo Qui-Salus in PNG

## Notifica sull'iPhone

Alla fine di ogni giro il workflow può mandare una notifica con l'app gratuita **ntfy** (App Store):
✅ dati riscaricati, ❌ aggiornamento fallito (anche solo lo scaricamento), ⚠️ OpenStreetMap non ha risposto e
sono rimasti i dati vecchi. Per attivarla: Settings → Secrets and variables → Actions → *New repository secret*
`NTFY_TOPIC` con il nome del canale, e nell'app ntfy iscriversi allo stesso canale. Senza il secret la notifica viene saltata.

## Statistiche d'uso

Statistiche anonime, senza cookie, con GoatCounter: https://salus.goatcounter.com

## Fonte dei dati

© OpenStreetMap e chi contribuisce (licenza ODbL). Le informazioni sono inserite da volontari e possono
essere incomplete o non aggiornate.
