// ============================================================================
// Mikromaxxing – Calisthenics-Skills: Handstand, Back Lever, Muscle-Up
// Stufenleitern mit klarem Test, wann die nächste Stufe dran ist.
// Alles oberkörperlastig und knieschonend; Sehnen brauchen Zeit → lieber eine
// Stufe länger bleiben als sich verletzen.
// ============================================================================
import * as store from './store.js';

export const SKILLS = {
  handstand: {
    name: 'Handstand', icon: 'zap',
    why: 'Schulterkraft, Körperspannung und Balance – die Basis für fast alle Calisthenics-Skills.',
    safety: 'Handgelenke vorher 2 Min aufwärmen (kreisen, auf Handflächen wippen). Beim Kick-up das Knie nicht durchschlagen – lieber vom Kasten hochgehen.',
    stages: [
      { name: 'Pike-Halt am Kasten', test: '3 × 30 s sauber halten', how: 'Füße auf Kasten/Bank, Hüfte über den Schultern, Arme gestreckt, Ohren zwischen die Arme.' },
      { name: 'Wand-Handstand (Bauch zur Wand)', test: '3 × 30 s', how: 'Mit den Füßen die Wand hochlaufen, Hände ca. 20 cm vor der Wand, Körper gerade.' },
      { name: 'Wand-Handstand lang', test: '3 × 60 s', how: 'Wie vorher, Hände näher an die Wand, Spannung im Po und Bauch.' },
      { name: 'Schulter-Taps an der Wand', test: '3 × 10 Taps', how: 'Im Wand-Handstand abwechselnd eine Hand kurz zur Schulter – trainiert die Balance.' },
      { name: 'Freistehend: erste Sekunden', test: '5 × 5 s frei', how: 'Mit dem Bauch zur Wand starten, Füße kurz lösen. Balance über die Finger steuern.' },
      { name: 'Freistehender Handstand', test: '3 × 20 s frei', how: 'Kick-up oder vom Kasten, frei halten. Ziel erreicht – danach Handstand-Liegestütze.' },
    ],
  },
  backlever: {
    name: 'Back Lever', icon: 'activity',
    why: 'Starke Schultern, Bizeps-Sehnen und Rücken in Dehnung – braucht Geduld, belohnt mit massiver Rumpfkraft.',
    safety: 'Belastet Bizepssehne und Schulterkapsel stark: nur ausgeruht, nie bis zum Versagen, Stufen nicht überspringen. Ziehen in der Bizepssehne = Pause.',
    stages: [
      { name: 'German Hang', test: '3 × 15 s entspannt', how: 'An Ringen/Stange durchdrehen (Skin the Cat) und unten hängen lassen. Schulterbeweglichkeit aufbauen.' },
      { name: 'Tuck Back Lever', test: '3 × 10 s', how: 'Knie zur Brust, Rücken rund, Körper waagerecht unter der Stange. Arme gestreckt.' },
      { name: 'Advanced Tuck', test: '3 × 10 s', how: 'Wie Tuck, aber Rücken flach und Hüfte gestreckt, Knie bleiben angewinkelt.' },
      { name: 'Ein Bein gestreckt', test: '3 × 8 s je Seite', how: 'Ein Bein lang, eins angewinkelt – Seite abwechseln.' },
      { name: 'Straddle Back Lever', test: '3 × 6 s', how: 'Beine gestreckt und weit gegrätscht, Körper waagerecht.' },
      { name: 'Full Back Lever', test: '3 × 5 s', how: 'Beine geschlossen, Körper wie ein Brett. Ziel erreicht.' },
    ],
  },
  muscleup: {
    name: 'Muscle-Up', icon: 'dumbbell',
    why: 'Zug- und Druckkraft in einer Bewegung – das Aushängeschild für Calisthenics.',
    safety: 'Erst die Basis (Klimmzüge & Dips) solide, dann Technik. Keine Kipping-Würfe mit kalten Schultern, Ellbogen nicht überstrecken.',
    stages: [
      { name: '10 saubere Klimmzüge', test: '10 Wdh am Stück', how: 'Volle Streckung unten, Kinn über die Stange. Dein Workout-Modus trackt das mit.' },
      { name: 'Explosive Klimmzüge', test: '3 × 5 bis zur Brust', how: 'Explosiv hoch, bis die Brust (nicht nur das Kinn) die Stange berührt.' },
      { name: 'Straight-Bar-Dips', test: '3 × 8', how: 'Auf der Stange stützen und tief dippen – der zweite Teil vom Muscle-Up.' },
      { name: 'Negative Muscle-Ups', test: '3 × 3 langsam (5 s)', how: 'Von oben (Stütz) langsam durch den Übergang nach unten lassen.' },
      { name: 'Band-unterstützt', test: '3 × 3 mit leichtem Band', how: 'Fester Griff (falscher Griff), explosiv hoch, Brust über die Stange kippen.' },
      { name: 'Erster Muscle-Up', test: '1 sauberer Muscle-Up', how: 'Ohne Band. Danach: 3 × 3 sauber.' },
    ],
  },
};

function st() { const s = store.getState(); if (!s.skills) s.skills = {}; return s.skills; }
export function skillState(id) {
  const all = st();
  if (!all[id]) all[id] = { stage: 0, log: [], ups: [] };
  return all[id];
}
export function practiceSkill(key, id) {
  const s = skillState(id);
  if (!s.log.includes(key)) s.log.push(key);
  store.setDayMeta(key, 'skill', true);
  store.save();
}
export function advanceSkill(id, key = store.todayKey()) {
  const s = skillState(id);
  const max = SKILLS[id].stages.length - 1;
  if (s.stage < max) { s.stage++; s.ups.push({ key, stage: s.stage }); }
  else if (!s.done) { s.done = key; }
  store.save();
  return s;
}
export function setSkillStage(id, stage) { skillState(id).stage = Math.max(0, Math.min(SKILLS[id].stages.length - 1, stage)); store.save(); }
export function skillSessionsThisWeek(key = store.todayKey()) {
  const from = store.shiftDate(key, -6);
  return Object.keys(SKILLS).reduce((a, id) => a + skillState(id).log.filter(k => k >= from && k <= key).length, 0);
}
export function skillUps() { return Object.keys(SKILLS).reduce((a, id) => a + skillState(id).ups.length + (skillState(id).done ? 1 : 0), 0); }
