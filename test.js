#!/usr/bin/env node
// Salus – prove della logica pura di core.js. Uso: node test.js
"use strict";
const assert = require("assert");
const SL = require("./core.js");

let n = 0;
function prova(nome, f) { f(); n++; console.log("ok", nome); }

const farmacia = (codice, lat, lng, giorno, orari, turno, extra) => ({
  codice_regionale: codice, lat, lng, ragione_sociale: "FARMACIA " + codice, insegna: null, comune: "Milano",
  indirizzo: "Via Roma 1", telefono: "02123456", email: "info@example.it", sito_web: "-", di_turno: turno ? 1 : 0,
  orari_oggi: orari.map(([a, b]) => ({ inizio: `${giorno} ${a}:00`, fine: b === "24:00" ? `${giorno.slice(0, 8)}${String(+giorno.slice(8) + 1).padStart(2, "0")} 00:00:00` : `${giorno} ${b}:00` })),
  servizi: { 5: 1, 7: 0, 18: 1 }, ...extra
});
const GIORNI = ["2026-10-12", "2026-10-13", "2026-10-14", "2026-10-15", "2026-10-16", "2026-10-17", "2026-10-18"];

prova("fasceDelGiorno: mezzanotte del giorno dopo = 1440", () => {
  assert.deepStrictEqual(SL.fasceDelGiorno([
    { inizio: "2026-10-12 15:30:00", fine: "2026-10-12 19:30:00" },
    { inizio: "2026-10-12 08:00:00", fine: "2026-10-13 00:00:00" }
  ], "2026-10-12"), [[480, 1440], [930, 1170]]);
});

const giornate = GIORNI.map((g, i) => ({
  giorno: g,
  farmacie: {
    MI1: farmacia("MI1", 45.4537, 9.1641, g, i === 6 ? [] : [["08:30", "12:30"], ["15:00", "19:30"]], false),
    // di turno il martedì (giorno 1): aperta fino a mezzanotte e poi tutta la notte fino alle 12:30 di mercoledì
    MI2: farmacia("MI2", 45.5, 9.2, g, i === 1 ? [["08:30", "24:00"]] : i === 2 ? [["00:00", "12:30"], ["15:00", "19:30"]] : [["08:30", "19:30"]], i === 1, { sito_web: "www.mi2.it" })
  }
}));
const { giorni, farmacie } = SL.compattaFarmacieFF(giornate);

prova("compattaFarmacieFF: record compatti", () => {
  assert.deepStrictEqual(giorni, GIORNI);
  const mi1 = farmacie.find((r) => r.f === "MI1");
  assert.strictEqual(mi1.n, "FARMACIA MI1");
  assert.strictEqual(mi1.w, undefined);          // "-" = vuoto
  assert.deepStrictEqual(mi1.s, [5, 18]);
  assert.deepStrictEqual(mi1.o[0], [[510, 750], [900, 1170]]);
  assert.deepStrictEqual(mi1.o[6], []);
  assert.strictEqual(mi1.u, undefined);
  const mi2 = farmacie.find((r) => r.f === "MI2");
  assert.deepStrictEqual(mi2.u, [1]);
  assert.strictEqual(mi2.w, "www.mi2.it");
});

const osm = [
  { i: "n1", k: "F", la: 45.45372, lo: 9.16415, n: "Farmacia Bergognone", h: "Mo-Su 00:00-24:00" },  // ~1 m da MI1
  { i: "n2", k: "F", la: 45.4540, lo: 9.1641 },                                                     // ~30 m da MI1
  { i: "n3", k: "S", la: 45.5, lo: 9.2 }                                                            // pronto soccorso: non si abbina
];
const uniti = SL.unisciFarmacie(osm, farmacie, giorni);

prova("unisciFarmacie: abbina la più vicina e aggiunge le mancanti", () => {
  assert.strictEqual(uniti.length, 4);
  const n1 = uniti.find((d) => d.i === "n1");
  assert.strictEqual(n1.f, "MI1");
  assert.strictEqual(n1.n, "Farmacia Bergognone");    // il nome OSM resta
  assert.strictEqual(n1.t, "02123456");               // il telefono arriva da Federfarma
  assert.strictEqual(n1.od, "2026-10-12");
  assert.strictEqual(uniti.find((d) => d.i === "n2").f, undefined);
  assert.strictEqual(uniti.find((d) => d.i === "n3").f, undefined);
  const nuova = uniti.find((d) => d.i === "fMI2");
  assert.strictEqual(nuova.k, "F");
  assert.strictEqual(nuova.f, "MI2");
});

prova("unisciFarmacie: senza dati Federfarma la lista resta uguale", () => {
  assert.strictEqual(SL.unisciFarmacie(osm, [], giorni), osm);
});

// Date locali (il test gira con l'ora del sistema: costruite con new Date(a, m, g, h, min))
const quando = (giorno, h, min) => new Date(2026, 9, giorno, h, min || 0);
const n1 = uniti.find((d) => d.i === "n1");
const mi2 = uniti.find((d) => d.i === "fMI2");

prova("statoAperturaFF: aperta, chiusa a pranzo, domenica chiusa", () => {
  assert.deepStrictEqual(SL.statoAperturaFF(n1, quando(12, 10)), { aperto: true, chiude: 750 });
  assert.deepStrictEqual(SL.statoAperturaFF(n1, quando(12, 13)), { aperto: false, apre: { giorni: 0, giorno: 0, min: 900 } });
  assert.deepStrictEqual(SL.statoAperturaFF(n1, quando(17, 20)), { aperto: false, apre: null }); // domenica chiusa, poi niente dati
  assert.strictEqual(SL.testoApertura(SL.statoAperturaFF(n1, quando(16, 20))), "Chiuso · apre domani alle 8:30");
});

prova("statoAperturaFF: il turno di notte continua dopo mezzanotte", () => {
  const st = SL.statoAperturaFF(mi2, quando(13, 23));
  assert.deepStrictEqual(st, { aperto: true, chiude: 750, chiudeGiorni: 1, chiudeGiorno: 2 });
  assert.strictEqual(SL.testoApertura(st), "Aperto ora · chiude domani alle 12:30");
  assert.strictEqual(SL.testoApertura(SL.statoAperturaFF(mi2, quando(14, 3))), "Aperto ora · chiude alle 12:30");
  assert.strictEqual(SL.testoApertura(SL.statoAperturaFF(n1, quando(12, 18))), "Aperto ora · chiude alle 19:30");
});

prova("statoAperturaFF: fuori dai giorni scaricati usa OSM", () => {
  assert.strictEqual(SL.statoAperturaFF(n1, quando(20, 10)), null);
  const [p] = SL.preparaPunti([n1], 45.4537, 9.1641, 1000, "F", quando(20, 10));
  assert.deepStrictEqual(p.apertura, { aperto: true, sempre: true });   // "Mo-Su 00:00-24:00" di OSM
  const [q] = SL.preparaPunti([n1], 45.4537, 9.1641, 1000, "F", quando(12, 13));
  assert.strictEqual(q.apertura.aperto, false);                          // vince Federfarma
});

prova("diTurnoOggi e orariFFLeggibili", () => {
  assert.strictEqual(SL.diTurnoOggi(mi2, quando(13, 10)), true);
  assert.strictEqual(SL.diTurnoOggi(mi2, quando(14, 10)), false);
  assert.strictEqual(SL.diTurnoOggi(n1, quando(13, 10)), false);
  const righe = SL.orariFFLeggibili(mi2, quando(13, 10));
  assert.strictEqual(righe[0], "Oggi: 8:30–24:00 (di turno)");
  assert.strictEqual(righe[1], "Domani: 0:00–12:30, 15:00–19:30");
  assert.strictEqual(righe.length, 6);
  assert.strictEqual(SL.orariFFLeggibili(n1, quando(18, 10))[0], "Oggi: chiusa");
});

console.log(`${n} prove superate`);
