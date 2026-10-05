// The server and this decoder share the is1 format. The URL fragment is read locally.
export function decodeSnapshot(fragment) {
  if (!/^#?is1\.[A-Za-z0-9_-]+$/.test(fragment) || fragment.length > 24000) throw new Error('Invalid stats link.');
  const encoded = fragment.replace(/^#?is1\./, '');
  if (encoded.length % 4 === 1) throw new Error('Incomplete stats link.');
  const binary = atob(encoded.replace(/-/g, '+').replace(/_/g, '/'));
  const packed = Uint8Array.from(binary, c => c.charCodeAt(0));
  const output = [];
  for (let pos = 0; pos < packed.length;) {
    const flags = packed[pos++];
    if (pos === packed.length) throw new Error('Incomplete stats snapshot.');
    for (let bit = 0; bit < 8; ++bit) {
      if (pos === packed.length) {
        if ((flags >>> bit) !== 0) throw new Error('Incomplete stats snapshot.');
        break;
      }
      if (flags & (1 << bit)) {
        if (pos + 1 >= packed.length) throw new Error('Incomplete stats snapshot.');
        const token = (packed[pos++] << 8) | packed[pos++];
        const distance = (token >>> 4) + 1;
        const length = (token & 15) + 3;
        if (distance > output.length) throw new Error('Invalid stats snapshot.');
        for (let i = 0; i < length; ++i) output.push(output[output.length - distance]);
      } else output.push(packed[pos++]);
      if (output.length > 32768) throw new Error('Stats snapshot is too large.');
    }
  }
  return validateSnapshot(JSON.parse(new TextDecoder('utf-8', {fatal: true}).decode(Uint8Array.from(output))));
}
export function validateSnapshot(data) {
  const str = (value, max) => typeof value === 'string' && value.length <= max;
  const number = value => value === null || (typeof value === 'number' && Number.isFinite(value) && Math.abs(value) < 1e9);
  const flag = value => value === null || typeof value === 'boolean';
  const list = (value, count, check) => Array.isArray(value) && value.length === count && value.every(check);
  if (!Array.isArray(data) || data.length !== 6 || data[0] !== 1 || !str(data[1], 80) || !['kill', 'death'].includes(data[2])
      || !str(data[3], 32) || !str(data[4], 128) || !Array.isArray(data[5]) || data[5].length !== (data[2] === 'kill' ? 2 : 1)) throw new Error('Unsupported stats report.');
  for (const player of data[5]) {
    if (!Array.isArray(player) || player.length !== 5 || !str(player[0], 80) || !str(player[1], 17) || (player[1] !== '' && !/^[1-9][0-9]{16}$/.test(player[1]))
        || !str(player[2], 64) || !(player[3] === null || (number(player[3]) && player[3] >= 0 && player[3] <= 1))) throw new Error('Invalid player in stats report.');
    const stats = player[4];
    if (stats === null) continue;
    if (!Array.isArray(stats) || stats.length !== 6 || !Number.isInteger(stats[0]) || stats[0] < 0 || stats[0] > 5
        || !list(stats[1], 19, number) || !list(stats[2], 9, flag) || !(stats[3] === null || str(stats[3], 16))
        || !list(stats[4], 5, flag) || !list(stats[5], 4, group => list(group, 4, item => item === null || str(item, 96)))) throw new Error('Invalid values in stats report.');
  }
  return data;
}

export const exampleReport = [1, 'Example server', 'kill', '2026.10.04-18.32.10', '', [
  ['River', '', 'Omniraptor', 1, [0, [82, 68, 91, 88, 12, 43, 100, 100, 100, 100, 0.8, 450, 3, 0.2, 0, null, null, null, null],
    [true, false, false, false, false, false, false, false, false], 'Female', [false, false, false, false, false],
    [['Night Owl', 'Photosynthesis', 'None', 'None'], ['None', 'None', 'None', 'None'], ['None', 'None', 'None', 'None'], ['None', 'None', 'None', 'None']]]],
  ['Fern', '', 'Stegosaurus', 0.755, [0, [0, 52, 74, 62, 38, 15, 100, 100, 100, 100, 1.5, 3200, 2, 0.1, 0, null, null, null, null],
    [true, false, false, false, false, false, false, false, false], 'Male', [false, false, false, false, false],
    [['Photosynthesis', 'None', 'None', 'None'], ['Night Owl', 'None', 'None', 'None'], ['None', 'None', 'None', 'None'], ['None', 'None', 'None', 'None']]]]
]];

export const exampleDeathReport = [1, 'Example server', 'death', '2026.10.04-18.35.20', 'Natural', [
  ['River', '', 'Gallimimus', 0.25, [0, [0, 0, 6, 100, 0, 12, 100, 100, 100, 100, 0, 50, 0, 0, 0, null, null, null, null],
    [false, false, false, false, false, false, false, false, false], 'Female', [false, true, false, false, false],
    [['Night Owl', 'None', 'None', 'None'], ['None', 'None', 'None', 'None'], ['None', 'None', 'None', 'None'], ['None', 'None', 'None', 'None']]]]
]];

function element(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}
const formatted = value => value === null ? 'Unavailable' : String(Math.round(value * 10) / 10);
function rows(section, entries) {
  const dl = element('dl');
  for (const [label, value] of entries) {
    dl.append(element('dt', '', label), element('dd', value === null ? 'unknown' : '', value === null ? 'Unavailable' : String(value)));
  }
  section.append(dl);
}
function section(card, title) {
  const block = element('section', 'section');
  block.append(element('h3', '', title)); card.append(block); return block;
}
function playerCard(player, role) {
  const [name, steam, dinosaur, growth, stats] = player;
  const card = element('article', `player ${role.toLowerCase()}${stats === null ? ' no-sample' : ''}`);
  const header = element('header', 'player-header'); header.append(element('span', 'role', role));
  const heading = element('h2');
  if (steam) {
    const link = element('a', '', name || 'Unknown player'); link.href = `https://steamcommunity.com/profiles/${steam}`;
    link.rel = 'noreferrer'; link.target = '_blank'; heading.append(link);
  } else heading.textContent = name || 'Unknown player';
  header.append(heading, element('p', 'dino', `${dinosaur || 'Unknown dinosaur'} · ${growth === null ? 'Growth unavailable' : formatted(growth * 100) + '% growth'}`));
  const identity = element('div', 'identity');
  identity.append(element('span', 'age', stats === null ? 'No matching snapshot' : `Captured within ${stats[0]}s of log time`));
  if (steam) {
    const copy = element('button', '', 'Copy Steam ID'); copy.type = 'button';
    copy.addEventListener('click', async () => {
      try { await navigator.clipboard.writeText(steam); copy.textContent = 'Copied'; }
      catch { copy.textContent = steam; }
    }); identity.append(copy);
  }
  header.append(identity); card.append(header);
  if (stats === null) {
    const missing = section(card, 'Stats unavailable');
    missing.append(element('p', 'missing', 'The server did not capture a recent matching snapshot for this player.')); return card;
  }
  const [age, numbers, flags, sex, effects, mutations] = stats;
  const vitals = section(card, 'Vitals'); const grid = element('div', 'vitals');
  for (const [index, label] of [[0, 'Health'], [1, 'Hunger'], [2, 'Thirst'], [5, 'Stamina'], [3, 'Blood remaining'], [6, 'Oxygen']]) {
    const value = numbers[index]; const box = element('div', 'vital'); const top = element('div', 'vital-top');
    top.append(element('span', 'vital-label', label), element('span', value === null ? 'vital-value unknown' : 'vital-value', value === null ? 'Unavailable' : formatted(value) + '%'));
    const track = element('div', 'track'); const fill = element('div', 'fill');
    fill.style.width = `${value === null ? 0 : Math.max(0, Math.min(100, value))}%`; track.append(fill); box.append(top, track); grid.append(box);
  }
  vitals.append(grid);
  const bleeding = section(card, 'Bleeding');
  const yesNo = value => value === null ? null : value ? 'Yes' : 'No';
  rows(bleeding, [['Blood lost', numbers[4] === null ? null : formatted(numbers[4]) + '%'], ['Actively bleeding', yesNo(flags[0])], ['Bleed clotted', yesNo(flags[1])],
    ['Bleed rate (raw)', numbers[10]], ['Bleed resistance (raw)', numbers[13]]]);
  bleeding.append(element('p', 'section-note', 'Blood lost is the missing blood percentage, not the current bleeding rate.'));
  const mutationBlock = section(card, 'Mutations');
  for (const [index, label] of ['Equipped', 'Inherited', 'Elder A', 'Elder B'].entries()) {
    const group = element('div', 'mutation-group'); group.append(element('h4', '', label));
    mutations[index].forEach((value, slot) => {
      const empty = value === null || value === '' || value.toLowerCase() === 'none';
      const row = element('div', 'mutation-row');
      row.append(element('span', 'slot', String(slot + 1).padStart(2, '0')), element('span', `mutation-name${empty ? ' empty' : ''}`, value === null ? 'Unavailable' : empty ? 'None' : value)); group.append(row);
    }); mutationBlock.append(group);
  }
  const conditions = section(card, 'Conditions');
  rows(conditions, [['Head fracture', yesNo(flags[2])], ['Body fracture', yesNo(flags[3])], ['Legs fracture', yesNo(flags[4])],
    ['Head fracture health', numbers[7] === null ? null : formatted(numbers[7]) + '%'], ['Body fracture health', numbers[8] === null ? null : formatted(numbers[8]) + '%'],
    ['Legs fracture health', numbers[9] === null ? null : formatted(numbers[9]) + '%'], ['Infection level 1', yesNo(flags[7])], ['Infection level 2', yesNo(flags[8])], ['Venom status (code)', numbers[14]],
    ...['Slovenly', 'Fluid deficient', 'Cataracts', 'Glass bones', 'Sick'].map((label, index) => [label, yesNo(effects[index])])]);
  const other = section(card, 'Other stats');
  rows(other, [['Sex', sex], ['Weight (game units)', numbers[11]], ['Diet tier (code)', numbers[12]], ['Elder', yesNo(flags[5])], ['Prime elder', yesNo(flags[6])],
    ['Attack power (raw)', numbers[15]], ['Defense power (raw)', numbers[16]], ['Movement speed (raw)', numbers[17]], ['Bacteria (raw)', numbers[18]]]);
  return card;
}
export function renderReport(data, example = false) {
  validateSnapshot(data);
  const [, server, kind, time, cause, players] = data;
  document.getElementById('welcome').hidden = true; document.getElementById('error').hidden = true;
  document.getElementById('sample-note').hidden = false;
  document.getElementById('server').textContent = example ? 'Example report · ' + server : server;
  document.getElementById('title').textContent = kind === 'kill' ? `${players[0][0]} killed ${players[1][0]}` : `${players[0][0]} died`;
  document.getElementById('event-meta').textContent = [kind === 'kill' ? 'Kill report' : 'Death report', time ? time.replace(/^(\d{4})\.(\d{2})\.(\d{2})-/, '$1-$2-$3 · ').replace(/\.(\d{2})\.(\d{2})$/, ':$1:$2') + ' (server log time)' : '', cause].filter(Boolean).join(' · ');
  const container = document.getElementById('players'); container.className = `players${players.length === 1 ? ' single' : ''}`;
  container.replaceChildren(...players.map((player, index) => playerCard(player, kind === 'death' ? 'Player' : index === 0 ? 'Killer' : 'Victim')));
  document.title = `${kind === 'kill' ? 'Kill' : 'Death'} report · The Isle`;
}
function load() {
  try {
    if (location.hash === '#demo') renderReport(exampleReport, true);
    else if (location.hash === '#demo-death') renderReport(exampleDeathReport, true);
    else if (location.hash) renderReport(decodeSnapshot(location.hash));
  } catch {
    document.getElementById('welcome').hidden = true; document.getElementById('players').replaceChildren(); document.getElementById('sample-note').hidden = true;
    const error = document.getElementById('error'); error.hidden = false;
    error.textContent = 'This stats link is incomplete or unsupported. Open the original Stats link in Discord again.';
  }
}
if (typeof document !== 'undefined') {
  document.getElementById('example').addEventListener('click', () => { location.hash = 'demo'; });
  window.addEventListener('hashchange', load); load();
}
