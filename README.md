# Salus

Web app per il telefono che mostra i servizi sanitari vicino a te presi da OpenStreetMap: farmacie,
parafarmacie, pronto soccorso, ospedali, ambulatori e cliniche, medici, dentisti, defibrillatori (DAE)
e altri servizi (laboratori analisi, centri prelievi, fisioterapisti, consultori…).
Stesso aspetto e funzionamento di [Distributori](https://github.com/paolo1957-it/Distributori).

## Come funziona

- I segnaposto hanno un colore e un simbolo per tipo; un pallino verde o rosso dice se è aperto adesso,
  calcolato dagli orari (`opening_hours`) scritti su OpenStreetMap.
- Il pulsante rosso **PS** porta al pronto soccorso più vicino, quello verde alla farmacia più vicina aperta.
- A ogni pubblicazione GitHub esegue `aggiorna_salute.js` (workflow `.github/workflows/pubblica.yml`):
  scarica da Overpass tutti i punti sanitari d'Italia e li salva nella cartella `dati/` del sito pubblicato,
  divisi in tessere da 0,25° (circa 28 × 20 km). Per non pesare su Overpass li riscarica al massimo una volta
  ogni 20 ore; nel frattempo ricopia quelli già pubblicati.
- La cartella `dati/` **non** sta nel repository. Se il sito non ha i dati, l'app li chiede direttamente a Overpass.
- Farmacie della Lombardia: dopo i dati OSM, `aggiorna_farmacie.js` scarica da Farmacia Aperta (Federfarma Lombardia)
  gli orari di oggi e dei 6 giorni seguenti di tutte le farmacie lombarde (7 richieste, una per giorno), con turni, servizi,
  telefono, email e sito, e li salva in `dati/ff/` con le stesse tessere. L'app abbina ogni farmacia Federfarma alla farmacia
  OSM più vicina entro 60 m (`unisciFarmacie` in `core.js`) e la arricchisce; quelle senza abbinamento diventano nuovi punti.
  Lo stato aperto/chiuso usa gli orari Federfarma quando ci sono. Se Farmacia Aperta non risponde, vengono ricopiati i dati
  già pubblicati. Fuori dalla Lombardia i turni non ci sono.

## Pubblicazione

Impostazioni del repository → Pages → Source: **GitHub Actions**.
Per riscaricare subito i dati: Actions → *Pubblica sito e aggiorna dati* → *Run workflow*.

## File

- `index.html`, `style.css`: interfaccia
- `core.js`: logica (tipi di punto, orari di apertura, distanze, tessere)
- `app.js`: mappa, GPS, elenco, impostazioni
- `config.js`: impostazioni iniziali e numero di versione
- `aggiorna_salute.js`, `aggiorna_farmacie.js`, `.github/workflows/pubblica.yml`: scaricamento dei dati e pubblicazione
- `test.js`: prove della logica (`node test.js`)
- `sw.js`, `manifest.webmanifest`, `icon.svg`: installazione come app

## Fonte dei dati

© OpenStreetMap e chi contribuisce (licenza ODbL). Le informazioni sono inserite da volontari e possono
essere incomplete o non aggiornate.
Farmacie lombarde: orari, turni, servizi e contatti da Federfarma Lombardia – Farmacia Aperta (farmacia-aperta.eu).
