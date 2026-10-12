#!/usr/bin/env node
/*
 * Salus – scarica da Farmacia Aperta (Federfarma Lombardia) telefono, email, sito, servizi, orari e turni
 * delle farmacie lombarde per oggi e i 6 giorni seguenti, e li salva in dati/ff/ divisi nelle stesse
 * tessere da 0,25 gradi dei dati OpenStreetMap. L'app li unisce alle farmacie OSM (vedi unisciFarmacie in core.js).
 *
 * Il server di Farmacia Aperta non permette all'app sul telefono di interrogarlo direttamente (niente CORS):
 * per questo lo scarica GitHub a ogni pubblicazione, dopo aggiorna_salute.js (che ricrea la cartella dati/).
 * Se Farmacia Aperta non risponde, ricopia le tessere già pubblicate; se non ci sono, l'app fa a meno di questi dati.
 *
 * Uso: node aggiorna_farmacie.js   (variabile d'ambiente: SITO)
 */
"use strict";
const fs = require("fs");
const path = require("path");
const SL = require("./core.js");

const CARTELLA = path.join(__dirname, "dati", "ff");
const PASSO = 0.25;
const GIORNI = 7;
const PAUSA_MS = 2000;
const USER_AGENT = "Salus/1.0 (app web personale; https://github.com/paolo1957-it/Salus)";
const URL_FF = "https://www.farmacia-aperta.eu/ajax/farmacie";
const FONTE = "Federfarma Lombardia – Farmacia Aperta (farmacia-aperta.eu)";
const SERVIZI = {
  5: "Vaccinazione anti Covid-19", 6: "Screening colon retto", 7: "Tamponi rapidi",
  8: "Vaccinazione antinfluenzale extra-SSR", 9: "Tamponi molecolari", 10: "Deblistering",
  11: "Vaccinazione antinfluenzale SSR", 12: "Test Streptococco", 13: "Elettrocardiogramma privato",
  14: "Holter pressorio privato", 15: "Holter cardiaco privato", 16: "Spirometria privata",
  18: "Elettrocardiogramma", 19: "Holter pressorio", 20: "Holter cardiaco", 21: "Helicobacter pylori",
  22: "Vaccinazione antipneumococcica SSR", 24: "Vaccinazione antipneumococcica extra-SSR",
  33: "Vaccinazione HPV", 34: "Vaccinazione HPV extra-SSR", 35: "Vaccinazione DTP"
};

const attendi = (ms) => new Promise((r) => setTimeout(r, ms));

async function scarica(url, ms) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  try {
    const r = await fetch(url, { headers: { "User-Agent": USER_AGENT, Accept: "application/json" }, signal: ctrl.signal });
    if (!r.ok) throw new Error("HTTP " + r.status);
    return r;
  } finally {
    clearTimeout(t);
  }
}

// Oggi e i giorni seguenti, date di Roma "AAAA-MM-GG"
function prossimiGiorni(n) {
  const oggi = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Rome" }).format(new Date());
  return Array.from({ length: n }, (_, i) => new Date(Date.parse(oggi + "T12:00:00Z") + i * 86400000).toISOString().slice(0, 10));
}

async function daFarmaciaAperta() {
  const giornate = [];
  for (const giorno of prossimiGiorni(GIORNI)) {
    if (giornate.length) await attendi(PAUSA_MS);
    const url = `${URL_FF}?time=${giorno}_12:00&orari=orari&all=1`;
    let dati, ultimo;
    for (let i = 0; i < 3 && !dati; i++) {
      try {
        if (i) await attendi(10000);
        dati = await (await scarica(url, 60000)).json();
      } catch (e) {
        ultimo = e;
        console.log(`  ${giorno}: ${e.message}`);
      }
    }
    if (!dati) throw new Error(`${giorno} non scaricato: ${ultimo && ultimo.message}`);
    const n = Object.keys(dati.farmacie || {}).length;
    console.log(`  ${giorno}: ${n} farmacie`);
    if (n < 1000) throw new Error(`${giorno}: troppo poche farmacie (${n}), risposta incompleta?`);
    giornate.push({ giorno: dati.dateOnly || giorno, farmacie: dati.farmacie });
  }
  return giornate;
}

function salva(giornate) {
  const { giorni, farmacie } = SL.compattaFarmacieFF(giornate);
  const tessere = new Map();
  for (const r of farmacie) {
    const t = SL.nomeTessera(r.la, r.lo, PASSO);
    if (!tessere.has(t)) tessere.set(t, []);
    tessere.get(t).push(r);
  }
  fs.rmSync(CARTELLA, { recursive: true, force: true });
  fs.mkdirSync(CARTELLA, { recursive: true });
  for (const [t, lista] of tessere) fs.writeFileSync(path.join(CARTELLA, t), JSON.stringify({ d: lista }));
  const indice = {
    passo: PASSO,
    aggiornato: new Date().toISOString().replace(/\.\d+Z$/, "Z"),
    giorni,
    farmacie: farmacie.length,
    tessere: [...tessere.keys()].sort(),
    servizi: SERVIZI,
    fonte: FONTE
  };
  fs.writeFileSync(path.join(CARTELLA, "indice.json"), JSON.stringify(indice, null, 1));
  console.log(`  salvate ${tessere.size} tessere, ${farmacie.length} farmacie, giorni ${giorni[0]} … ${giorni[giorni.length - 1]}`);
}

async function recuperaDalSito(sito) {
  if (!sito) throw new Error("indirizzo del sito non indicato");
  const base = sito.replace(/\/?$/, "/") + "dati/ff/";
  const indice = await (await scarica(base + "indice.json", 20000)).json();
  console.log(`Ricopio le tessere Farmacia Aperta già pubblicate (aggiornate ${indice.aggiornato}) …`);
  fs.rmSync(CARTELLA, { recursive: true, force: true });
  fs.mkdirSync(CARTELLA, { recursive: true });
  for (const t of indice.tessere) {
    const r = await scarica(base + t, 60000);
    fs.writeFileSync(path.join(CARTELLA, t), Buffer.from(await r.arrayBuffer()));
  }
  fs.writeFileSync(path.join(CARTELLA, "indice.json"), JSON.stringify(indice, null, 1));
  console.log(`  ricopiate ${indice.tessere.length} tessere`);
}

async function main() {
  try {
    console.log("Scarico le farmacie da Farmacia Aperta …");
    salva(await daFarmaciaAperta());
  } catch (e) {
    console.log(`Farmacia Aperta non disponibile: ${e.message}`);
    try {
      await recuperaDalSito(process.env.SITO);
    } catch (e2) {
      fs.rmSync(CARTELLA, { recursive: true, force: true });
      console.log(`Nessun dato Farmacia Aperta: ${e2.message}. L'app userà solo OpenStreetMap.`);
      process.exitCode = 1;
    }
  }
}

if (require.main === module) main();
else module.exports = { salva, prossimiGiorni, SERVIZI };
