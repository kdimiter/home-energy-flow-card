/*!
 * Home Energy Flow Card v2.1.0 — https://github.com/kdimiter/home-energy-flow-card
 * Source-aware power flow for Home Assistant: an input meter (voltage/energy relay before every load)
 * plus a battery/inverter that takes over the whole home through an ATS during a grid outage.
 * Reads only the hass object Home Assistant passes to the card. No network requests, no storage, no telemetry.
 * MIT License.
 */
const VERSION = '2.1.0';
const ID_RE = /^[a-z_]+\.[a-z0-9_]+$/;
const isId = v => typeof v === 'string' && ID_RE.test(v);

/* ---------- i18n ---------- */
const STRINGS = {
  en: {
    grid: 'Grid', battery: 'Battery', W: 'W', kW: 'kW', V: 'V', h: 'h', min: 'min',
    chip_grid: 'ATS · grid', chip_backup: 'ATS · {b}', chip_unknown: 'ATS · ?',
    src_backup: '{b} · backup', src_unknown: 'Source unknown',
    sub_relay_down: 'Input meter offline — grid present at the {b} input, input not measured',
    sub_charge: 'Input meter: home {h} + {b} charging {c}',
    sub_grid: 'Input meter · measured before every load',
    sub_backup: 'Grid is down — {b} powers the whole home',
    sub_assumed: 'Input meter is silent and {b} has no data — probably an outage',
    sub_left: ' · ≈ {t}', sub_plug: ' · via output meter',
    sub_unknown: 'No data from the input meter or {b}',
    phase: 'Phase {p}', out: '{b} output', soc: 'Charge', time_na: 'time —', grid_in: 'Grid input', relay_off: 'input meter de-energised',
    home: 'Home consumption', base_grid: 'input − {b} charging', base_backup: '{b} output via ATS', base_unknown: 'source unknown',
    no_meter_data: '{base} · meters have no data', measured: '{base} · measured {m}{pct} · {k} of {n}',
    circuits: 'Panel circuits', devices: 'Device meters · {n}', other: 'Other · unmetered', other_meta: 'lights, outlets, router…',
    other_over: 'meters exceed input by {w}', in_line: 'on «{p}»', whole_line: 'whole circuit', no_data: 'no data', open: 'Open details',
    note_backup: 'During an outage the ATS moves the whole home to {b}: consumption = {b} output. Input meter readings are ignored.',
    note_grid: 'Consumption = input meter minus {b} charging. «Other» is load without its own meter.',
    note_none: 'Not enough data for a balance.',
    note_over: ' Meters exceed the input — different update times or a nested meter (add it to a circuit’s children).',
    eco_offline: '{b} is offline', eco_source: 'Powering the home · {w}', eco_left: ' · ≈ {t} left',
    eco_charging: 'Charging from the grid · {w}', eco_full: ' · full in {t}',
    eco_standby: 'Standing by in parallel — the ATS moves the whole home to it if the grid fails',
    ac_in: 'AC in', ac_out: 'AC out', solar: 'Solar', panels: 'panels', source: 'Source',
    // editor
    e_general: 'General', e_title: 'Title (optional)', e_sort: 'Device order', e_sort_area: 'By area', e_sort_power: 'By power', e_sort_name: 'By name',
    e_backup_threshold: 'Backup detection: battery output above, W', e_active_threshold: 'Animate flow above, W',
    e_grid: 'Grid input meter', e_grid_name: 'Grid label', e_grid_power: 'Total power at the input (relay/meter before all loads)',
    e_grid_online: 'Input meter online / grid present (binary sensor)', e_phases: 'Phases (optional, up to 3)',
    e_phase_v: 'Phase {p} voltage', e_phase_w: 'Phase {p} power',
    e_battery: 'Battery / inverter (behind the ATS)', e_bat_name: 'Battery label', e_ac_in: 'AC input power (charging from grid)',
    e_ac_out: 'AC output power (feeds the home during an outage)', e_soc: 'State of charge, %', e_ac_in_volts: 'AC input voltage',
    e_ac_out_volts: 'AC output voltage', e_solar_in: 'Solar input power', e_status: 'Online status sensor (state “online”)',
    e_discharge_time: 'Discharge remaining time, min', e_charge_time: 'Charge remaining time, min',
    e_backup_meter: 'Fallback output meter (plug on the battery output)',
    e_devices: 'Device meters', e_discover: 'Auto-discover every power sensor (W/kW)', e_include: 'Add devices manually',
    e_exclude: 'Hide devices', e_circuits: 'Panel circuits (meters of a whole line)',
    e_circuit: 'Circuit: {n}', e_circuit_name: 'Label', e_children: 'Meters on this circuit (shown, not added twice)',
    e_device: '{n}', e_dev_name: 'Label', e_dev_icon: 'Icon', e_dev_color: 'Color', e_overrides: 'Device labels, icons and colors',
    e_none: 'No device meters yet — enable auto-discovery or add devices manually.',
  },
  uk: {
    grid: 'Мережа', battery: 'Резерв', W: 'Вт', kW: 'кВт', V: 'В', h: 'год', min: 'хв',
    chip_grid: 'АВР · мережа', chip_backup: 'АВР · {b}', chip_unknown: 'АВР · ?',
    src_backup: '{b} · резерв', src_unknown: 'Джерело невідоме',
    sub_relay_down: 'Реле напруги не на звʼязку — мережа є за входом {b}, ввід не виміряно',
    sub_charge: 'Реле на вводі: квартира {h} + заряд {b} {c}',
    sub_grid: 'Реле напруги на вводі · вимір до всіх споживачів',
    sub_backup: 'Мережі немає — {b} живить усю квартиру',
    sub_assumed: 'Реле напруги мовчить, даних {b} немає — ймовірно, відключення',
    sub_left: ' · ≈ {t}', sub_plug: ' · за розеткою виходу',
    sub_unknown: 'Немає даних ні від реле напруги, ні від {b}',
    phase: 'Фаза {p}', out: 'Вихід {b}', soc: 'Заряд', time_na: 'час —', grid_in: 'Вхід мережі', relay_off: 'реле знеструмлене',
    home: 'Споживання квартири', base_grid: 'ввід − заряд {b}', base_backup: 'вихід {b} через АВР', base_unknown: 'джерело невідоме',
    no_meter_data: '{base} · лічильники без даних', measured: '{base} · виміряно {m}{pct} · {k} із {n}',
    circuits: 'Лінії щита', devices: 'Лічильники приладів · {n}', other: 'Інше · без лічильника', other_meta: 'світло, розетки, роутер…',
    other_over: 'лічильники > вводу на {w}', in_line: 'у лінії «{p}»', whole_line: 'вимір усієї лінії', no_data: 'немає даних', open: 'Відкрити деталі',
    note_backup: 'Під час відключення АВР перекидає всю квартиру на {b}: споживання = вихід {b}. Покази реле на вводі ігноруються.',
    note_grid: 'Споживання = реле напруги на вводі мінус заряд {b}. «Інше» — навантаження без власного лічильника.',
    note_none: 'Немає даних для балансу.',
    note_over: ' Сума лічильників перевищує ввід — різний час оновлення або вкладений лічильник (додайте його до лінії як вкладений).',
    eco_offline: '{b} не на звʼязку', eco_source: 'Джерело живлення квартири · {w}', eco_left: ' · залишилось ≈ {t}',
    eco_charging: 'Заряджається від мережі · {w}', eco_full: ' · до повного {t}',
    eco_standby: 'Стоїть у паралелі й чергує — при зникненні мережі АВР перекине на нього всю квартиру',
    ac_in: 'AC вхід', ac_out: 'AC вихід', solar: 'Сонце', panels: 'панелі', source: 'Джерело',
    e_general: 'Загальне', e_title: 'Заголовок (необовʼязково)', e_sort: 'Порядок приладів', e_sort_area: 'За зонами', e_sort_power: 'За потужністю', e_sort_name: 'За назвою',
    e_backup_threshold: 'Резерв активний, якщо вихід батареї більше, Вт', e_active_threshold: 'Анімувати потік від, Вт',
    e_grid: 'Лічильник на вводі', e_grid_name: 'Назва мережі', e_grid_power: 'Загальна потужність на вводі (реле/лічильник до всіх споживачів)',
    e_grid_online: 'Реле на звʼязку / мережа є (binary sensor)', e_phases: 'Фази (необовʼязково, до 3)',
    e_phase_v: 'Напруга фази {p}', e_phase_w: 'Потужність фази {p}',
    e_battery: 'Батарея / інвертор (за АВР)', e_bat_name: 'Назва резерву', e_ac_in: 'Потужність AC-входу (заряд від мережі)',
    e_ac_out: 'Потужність AC-виходу (живить дім при відключенні)', e_soc: 'Рівень заряду, %', e_ac_in_volts: 'Напруга AC-входу',
    e_ac_out_volts: 'Напруга AC-виходу', e_solar_in: 'Потужність сонячного входу', e_status: 'Сенсор звʼязку (стан «online»)',
    e_discharge_time: 'Залишок часу розряду, хв', e_charge_time: 'Час до повного заряду, хв',
    e_backup_meter: 'Запасний лічильник виходу (розетка на виході батареї)',
    e_devices: 'Лічильники приладів', e_discover: 'Автоматично знаходити всі сенсори потужності (Вт/кВт)', e_include: 'Додати прилади вручну',
    e_exclude: 'Сховати прилади', e_circuits: 'Лінії щита (лічильник цілої лінії)',
    e_circuit: 'Лінія: {n}', e_circuit_name: 'Назва', e_children: 'Лічильники на цій лінії (показуються, але не додаються вдруге)',
    e_device: '{n}', e_dev_name: 'Назва', e_dev_icon: 'Іконка', e_dev_color: 'Колір', e_overrides: 'Назви, іконки й кольори приладів',
    e_none: 'Лічильників приладів поки немає — увімкніть автопошук або додайте прилади вручну.',
  },
};
export function langOf(hass) {
  const l = String(hass?.locale?.language || hass?.language || 'en').toLowerCase();
  return l.startsWith('uk') ? 'uk' : 'en';
}
export function makeI18n(lang, batteryName) {
  const S = STRINGS[lang] || STRINGS.en;
  const locale = lang === 'uk' ? 'uk-UA' : 'en-US';
  const nf0 = new Intl.NumberFormat(locale, {maximumFractionDigits: 0});
  const nf2 = new Intl.NumberFormat(locale, {minimumFractionDigits: 2, maximumFractionDigits: 2});
  const b = batteryName || S.battery;
  const t = (k, vars = {}) => String(S[k] ?? STRINGS.en[k] ?? k).replace(/\{(\w+)\}/g, (_, n) => (n === 'b' && vars.b === undefined) ? b : (vars[n] ?? ''));
  const w = v => v === null || v === undefined ? '—' : Math.abs(v) >= 1000 ? `${nf2.format(v / 1000)} ${S.kW}` : `${nf0.format(v)} ${S.W}`;
  const mins = m => { m = Math.round(m); return m >= 60 ? `${Math.floor(m / 60)} ${S.h} ${m % 60} ${S.min}` : `${m} ${S.min}`; };
  const volts = (v, d = 1) => v === null ? '—' : `${v.toFixed(d)} ${S.V}`;
  return {t, w, mins, volts, n0: v => nf0.format(v), locale, lang};
}

/* ---------- pure helpers ---------- */
export function num(s) {
  if (!s || typeof s.state !== 'string' || !s.state.trim()) return null;
  const v = Number(s.state);
  return Number.isFinite(v) ? v : null;
}
export function toWatts(s, nonneg = true) {
  const v = num(s), u = s?.attributes?.unit_of_measurement;
  if (v === null || !['W', 'kW'].includes(u)) return null;
  const w = v * (u === 'kW' ? 1000 : 1);
  return !nonneg || w >= 0 ? w : null;
}
const ICON_RULES = [
  [/бойлер|boiler|water heater/i, 'mdi:water-boiler'], [/прал|wash/i, 'mdi:washing-machine'], [/суш|dryer/i, 'mdi:tumble-dryer'],
  [/посуд|dish/i, 'mdi:dishwasher'], [/холод|fridge|refrig/i, 'mdi:fridge-outline'], [/мороз|freez/i, 'mdi:snowflake'],
  [/чайн|kettle/i, 'mdi:kettle'], [/ламп|lamp|світл|light/i, 'mdi:lamp'], [/телев|\btv\b|television/i, 'mdi:television'],
  [/комп|\bпк\b|\bpc\b|desktop|computer/i, 'mdi:desktop-tower'], [/роутер|router|wi-?fi/i, 'mdi:router-wireless'],
  [/кондиц|air ?con|\bac unit/i, 'mdi:air-conditioner'], [/обігр|радіат|heater|radiator/i, 'mdi:radiator'], [/мікрохв|microwave/i, 'mdi:microwave'],
  [/духов|плит|oven|stove|cooktop/i, 'mdi:stove'], [/автомат|rcbo|лінія|circuit|breaker/i, 'mdi:electric-switch'], [/насос|pump/i, 'mdi:pump'],
];
const OLD_ICONS = {boiler: 'mdi:water-boiler', washer: 'mdi:washing-machine', dryer: 'mdi:tumble-dryer', dishwasher: 'mdi:dishwasher',
  fridge: 'mdi:fridge-outline', freezer: 'mdi:snowflake', kettle: 'mdi:kettle', lamp: 'mdi:lamp', home: 'mdi:power-plug'};
const PALETTE = ['#ff8a65', '#8ec7ff', '#ffb87e', '#7ee8c0', '#9dc4ff', '#c5b3ff', '#f5b041', '#ffdea5', '#f48fb1', '#80cbc4', '#b39ddb', '#a5d6a7'];
const VCOL = {ok: '#26c281', warn: '#f5b041', bad: '#e74c3c', na: '#8fa0b8'};
const voltClass = v => v === null ? 'na' : (v < 205 || v > 245) ? 'bad' : (v < 215 || v > 240) ? 'warn' : 'ok';
const hash = s => { let h = 0; for (const ch of s) h = (h * 31 + ch.charCodeAt(0)) | 0; return Math.abs(h); };
const strip = n => String(n || '').replace(/\s+(живлення|потужність|споживання|power|consumption)$/i, '').trim();
const HEX_RE = /^#[0-9a-f]{6}$/i;
function optId(v, key) {
  if (v === undefined || v === null || v === '') return null;
  if (!isId(v)) throw new Error(`home-energy-flow-card: ${key} must be an entity_id`);
  return v;
}
function reqId(v, key) { const id = optId(v, key); if (!id) throw new Error(`home-energy-flow-card: ${key} is required`); return id; }

export function normalizeConfig(config) {
  if (!config || typeof config !== 'object') throw new Error('home-energy-flow-card: empty configuration');
  const g = config.grid || {};
  const legacyEco = !config.battery && !!config.ecoflow;
  const e = config.battery || config.ecoflow || {};
  const grid = {
    name: g.name ? String(g.name) : null,
    power: reqId(g.power ?? g.entity, 'grid.power'),
    online: reqId(g.online ?? g.outage_entity, 'grid.online'),
    phases: (Array.isArray(g.phases) ? g.phases : []).slice(0, 3).map((p, i) => ({
      name: String(p?.name || 'ABC'[i] || i + 1), voltage: optId(p?.voltage, `grid.phases[${i}].voltage`), power: optId(p?.power, `grid.phases[${i}].power`),
    })),
  };
  const battery = {
    name: e.name ? String(e.name) : (legacyEco ? 'EcoFlow' : null),
    ac_in: reqId(e.ac_in, 'battery.ac_in'), ac_out: reqId(e.ac_out, 'battery.ac_out'), soc: reqId(e.soc, 'battery.soc'),
    ac_in_volts: optId(e.ac_in_volts, 'battery.ac_in_volts'), ac_out_volts: optId(e.ac_out_volts, 'battery.ac_out_volts'),
    solar_in: optId(e.solar_in, 'battery.solar_in'), status: optId(e.status, 'battery.status'),
    discharge_time: optId(e.discharge_time, 'battery.discharge_time'), charge_time: optId(e.charge_time, 'battery.charge_time'),
    backup_meter: optId(e.backup_meter, 'battery.backup_meter'),
  };
  const devices = {};
  for (const [id, o] of Object.entries(config.devices || {})) {
    if (!isId(id) || !o || typeof o !== 'object') continue;
    devices[id] = {name: o.name ? String(o.name) : undefined, icon: o.icon ? String(o.icon) : undefined, color: HEX_RE.test(o.color || '') ? o.color : undefined};
  }
  for (const a of Array.isArray(config.appliances) ? config.appliances : []) {   // v1 config compatibility
    if (a && isId(a.entity)) devices[a.entity] = {name: a.name, icon: OLD_ICONS[a.icon] || a.icon, color: HEX_RE.test(a.color || '') ? a.color : undefined, ...(devices[a.entity] || {})};
  }
  const circuits = (Array.isArray(config.circuits) ? config.circuits : []).map((c, i) => ({
    entity: reqId(c?.entity, `circuits[${i}].entity`), name: c?.name ? String(c.name) : null, icon: c?.icon || 'mdi:electric-switch',
    color: HEX_RE.test(c?.color || '') ? c.color : null, children: (Array.isArray(c?.children) ? c.children : []).filter(isId),
  }));
  const ids = l => (Array.isArray(l) ? l : []).filter(isId);
  const n = (v, d) => Number.isFinite(Number(v)) && v !== '' && v !== null ? Number(v) : d;
  return {
    title: config.title ? String(config.title) : null, grid, battery, circuits, devices,
    threshold: n(config.backup_threshold, 30), active: n(config.active_threshold, 5),
    discover: config.discover !== false, include: ids(config.include), exclude: ids(config.exclude),
    sort: ['area', 'power', 'name'].includes(config.sort) ? config.sort : 'area',
  };
}

export function sourceIds(cfg) {
  const g = cfg.grid, b = cfg.battery;
  return [g.power, g.online, ...g.phases.flatMap(p => [p.voltage, p.power]),
    b.ac_in, b.ac_out, b.soc, b.ac_in_volts, b.ac_out_volts, b.solar_in, b.status, b.discharge_time, b.charge_time, b.backup_meter].filter(Boolean);
}

export function isPowerSensor(s) {
  return !!s && s.entity_id?.startsWith('sensor.') && s.attributes?.device_class === 'power' && ['W', 'kW'].includes(s.attributes?.unit_of_measurement);
}

/* Tiles = circuits + discovered/included device meters. `counted` tiles make up the measured sum. */
export function discover(cfg, hass) {
  const st = hass?.states || {}, reg = hass?.entities || {}, devs = hass?.devices || {}, areas = hass?.areas || {};
  const src = sourceIds(cfg);
  const srcDevices = new Set(src.map(id => reg[id]?.device_id).filter(Boolean));
  const circuitIds = new Set(cfg.circuits.map(c => c.entity));
  const parentOf = new Map(); cfg.circuits.forEach(c => c.children.forEach(ch => parentOf.set(ch, c)));
  const skip = new Set([...src, ...cfg.exclude]);
  const meta = (id, o = {}) => {
    const s = st[id], r = reg[id], dev = devs[r?.device_id];
    const name = o.name || strip(s?.attributes?.friendly_name) || dev?.name_by_user || dev?.name || id;
    const area = areas[r?.area_id || dev?.area_id]?.name || '';
    const icon = o.icon || r?.icon || s?.attributes?.icon || (ICON_RULES.find(([re]) => re.test(name)) || [null, 'mdi:power-plug'])[1];
    const color = HEX_RE.test(o.color || '') ? o.color : PALETTE[hash(id) % PALETTE.length];
    return {id, name, area, icon, color};
  };
  const tiles = cfg.circuits.filter(c => st[c.entity]).map(c => ({...meta(c.entity, {...cfg.devices[c.entity], name: c.name || cfg.devices[c.entity]?.name, icon: c.icon, color: c.color || cfg.devices[c.entity]?.color}), kind: 'circuit', counted: true, parent: null}));
  const ids = [];
  if (cfg.discover) {
    for (const id of Object.keys(st)) {
      if (skip.has(id) || circuitIds.has(id) || !isPowerSensor(st[id])) continue;
      const r = reg[id];
      if (r?.hidden || r?.entity_category) continue;
      if (r?.device_id && srcDevices.has(r.device_id)) continue;
      ids.push(id);
    }
  }
  for (const id of cfg.include) if (st[id] && !ids.includes(id) && !circuitIds.has(id) && !skip.has(id)) ids.push(id);
  for (const id of ids) {
    const p = parentOf.get(id) || null;
    tiles.push({...meta(id, cfg.devices[id]), kind: 'device', counted: !p, parent: p ? (p.name || strip(st[p.entity]?.attributes?.friendly_name)) : null});
  }
  return tiles;
}

export function computeFlow(cfg, states, tiles) {
  const g = cfg.grid, e = cfg.battery;
  const online = states[g.online]?.state;
  const ecoOnline = e.status ? states[e.status]?.state === 'online' : toWatts(states[e.ac_out]) !== null;
  const acOut = ecoOnline ? toWatts(states[e.ac_out]) : null;
  const acIn = ecoOnline ? toWatts(states[e.ac_in]) : null;
  const vin = ecoOnline && e.ac_in_volts ? num(states[e.ac_in_volts]) : null;
  const plug = e.backup_meter ? toWatts(states[e.backup_meter]) : null;
  const backupW = acOut ?? plug;
  let mode = 'unknown', assumed = false;
  if (backupW !== null && backupW > cfg.threshold) mode = 'backup';           // battery already feeds the home (seconds before the input meter drops)
  else if (online === 'on') mode = 'grid';
  else if (vin !== null && vin >= 100) mode = 'grid';                          // meter unreachable, but the grid is on the battery input
  else if (vin !== null && vin < 100) mode = 'backup';
  else if (online === 'off') { mode = 'backup'; assumed = true; }
  const relayDown = mode === 'grid' && online !== 'on';
  const relayW = mode === 'grid' && !relayDown ? toWatts(states[g.power], false) : null;   // stale meter value is ignored outside grid mode
  const charge = mode === 'grid' ? Math.max(0, acIn ?? 0) : 0;
  const house = mode === 'grid' ? (relayW === null ? null : Math.max(0, relayW - charge)) : mode === 'backup' ? backupW : null;
  const values = new Map(); let sum = 0, known = 0, count = 0;
  for (const t of tiles) {
    const w = toWatts(states[t.id]); values.set(t.id, w);
    if (t.counted) { count++; if (w !== null) { sum += w; known++; } }
  }
  const measured = known ? sum : null;
  const other = house === null || measured === null ? house : house - measured;
  return {mode, assumed, relayDown, relayW, charge, house, backupW, plug, acIn, acOut, vin, ecoOnline, values, measured, known, count, other};
}

/* ---------- stub config for the card picker ---------- */
export function stubConfig(hass) {
  const st = hass?.states || {};
  const all = Object.values(st);
  const pick = (pred, re) => (all.find(s => pred(s) && re.test(s.entity_id)) || all.find(pred))?.entity_id;
  const power = s => isPowerSensor(s);
  const conn = s => s.entity_id.startsWith('binary_sensor.') && ['connectivity', 'power', 'plug'].includes(s.attributes?.device_class);
  const soc = s => s.entity_id.startsWith('sensor.') && s.attributes?.device_class === 'battery';
  return {
    type: 'custom:home-energy-flow-card',
    grid: {power: pick(power, /grid|mains|meter|input|relay|merez|rele/) || 'sensor.grid_power', online: pick(conn, /grid|relay|meter|rele/) || 'binary_sensor.grid_online'},
    battery: {
      ac_in: pick(power, /ac_in|charg|input/) || 'sensor.battery_ac_in_power',
      ac_out: pick(power, /ac_out|output|discharg|inverter/) || 'sensor.battery_ac_out_power',
      soc: pick(soc, /battery|soc/) || 'sensor.battery_level',
    },
    discover: true,
  };
}

/* ---------- editor <-> config mapping (pure, unit-tested) ---------- */
const BAT_KEYS = ['ac_in', 'ac_out', 'soc', 'ac_in_volts', 'ac_out_volts', 'solar_in', 'status', 'discharge_time', 'charge_time', 'backup_meter'];
const rgbToHex = c => Array.isArray(c) && c.length === 3 ? '#' + c.map(x => Math.max(0, Math.min(255, Math.round(Number(x) || 0))).toString(16).padStart(2, '0')).join('') : undefined;
const hexToRgb = h => HEX_RE.test(h || '') ? [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16)) : undefined;

export function configToForm(config) {
  const c = config || {}, g = c.grid || {}, b = c.battery || c.ecoflow || {};
  const f = {
    title: c.title, sort: c.sort || 'area', backup_threshold: c.backup_threshold ?? 30, active_threshold: c.active_threshold ?? 5,
    grid_name: g.name, grid_power: g.power ?? g.entity, grid_online: g.online ?? g.outage_entity,
    bat_name: b.name ?? (!c.battery && c.ecoflow ? 'EcoFlow' : undefined),
    discover: c.discover !== false, include: [...(c.include || [])], exclude: [...(c.exclude || [])],
    circuits: (c.circuits || []).map(x => x?.entity).filter(isId),
  };
  (g.phases || []).slice(0, 3).forEach((p, i) => { f[`phase${i}_voltage`] = p?.voltage; f[`phase${i}_power`] = p?.power; });
  for (const k of BAT_KEYS) f[`bat_${k}`] = b[k];
  for (const x of c.circuits || []) { if (!isId(x?.entity)) continue; f[`cir|${x.entity}|name`] = x.name; f[`cir|${x.entity}|children`] = [...(x.children || [])]; }
  const devs = {...(c.devices || {})};
  for (const a of c.appliances || []) if (a && isId(a.entity)) devs[a.entity] = {name: a.name, icon: OLD_ICONS[a.icon] || a.icon, color: a.color, ...(devs[a.entity] || {})};
  for (const [id, o] of Object.entries(devs)) {
    if (!o) continue;
    if (o.name) f[`dev|${id}|name`] = o.name;
    if (o.icon) f[`dev|${id}|icon`] = o.icon;
    if (hexToRgb(o.color)) f[`dev|${id}|color`] = hexToRgb(o.color);
  }
  for (const k of Object.keys(f)) if (f[k] === undefined || f[k] === null || f[k] === '') delete f[k];
  return f;
}

export function formToConfig(form, prev = {}) {
  const f = form || {};
  const s = v => (typeof v === 'string' && v.trim() !== '') ? v.trim() : undefined;
  const out = {};
  for (const [k, v] of Object.entries(prev || {})) {   // keep keys the editor does not manage (type, grid_options, view_layout, …)
    if (!['title', 'sort', 'backup_threshold', 'active_threshold', 'grid', 'battery', 'ecoflow', 'appliances', 'discover', 'include', 'exclude', 'circuits', 'devices'].includes(k)) out[k] = v;
  }
  out.type = prev?.type || 'custom:home-energy-flow-card';
  if (s(f.title)) out.title = s(f.title);
  const grid = {power: s(f.grid_power), online: s(f.grid_online)};
  if (s(f.grid_name)) grid.name = s(f.grid_name);
  const phases = [0, 1, 2].map(i => ({name: 'ABC'[i], voltage: s(f[`phase${i}_voltage`]), power: s(f[`phase${i}_power`])})).filter(p => p.voltage || p.power);
  if (phases.length) grid.phases = phases.map(p => Object.fromEntries(Object.entries(p).filter(([, v]) => v !== undefined)));
  out.grid = Object.fromEntries(Object.entries(grid).filter(([, v]) => v !== undefined));
  const battery = {};
  if (s(f.bat_name)) battery.name = s(f.bat_name);
  for (const k of BAT_KEYS) if (s(f[`bat_${k}`])) battery[k] = s(f[`bat_${k}`]);
  out.battery = battery;
  out.discover = f.discover !== false;
  const list = v => (Array.isArray(v) ? v : (isId(v) ? [v] : [])).filter(isId);
  if (list(f.include).length) out.include = [...new Set(list(f.include))];
  if (list(f.exclude).length) out.exclude = [...new Set(list(f.exclude))];
  const cir = [...new Set(list(f.circuits))];
  if (cir.length) {
    const prevC = Object.fromEntries((prev?.circuits || []).filter(x => isId(x?.entity)).map(x => [x.entity, x]));
    out.circuits = cir.map(id => {
      const c = {entity: id};
      const name = s(f[`cir|${id}|name`]); if (name) c.name = name;
      if (prevC[id]?.icon) c.icon = prevC[id].icon;
      if (prevC[id]?.color) c.color = prevC[id].color;
      const ch = list(f[`cir|${id}|children`]).filter(x => x !== id); if (ch.length) c.children = ch;
      return c;
    });
  }
  const devices = {};
  for (const [k, v] of Object.entries(f)) {
    const m = /^dev\|([a-z_]+\.[a-z0-9_]+)\|(name|icon|color)$/.exec(k); if (!m) continue;
    const val = m[2] === 'color' ? rgbToHex(v) : s(v); if (!val) continue;
    (devices[m[1]] ||= {})[m[2]] = val;
  }
  if (Object.keys(devices).length) out.devices = devices;
  out.sort = ['area', 'power', 'name'].includes(f.sort) ? f.sort : 'area';
  const nn = (v, d) => Number.isFinite(Number(v)) && v !== '' && v !== null && v !== undefined ? Number(v) : d;
  out.backup_threshold = nn(f.backup_threshold, 30); out.active_threshold = nn(f.active_threshold, 5);
  return out;
}

export function editorSchema(form, hass, i) {
  const t = i.t, power = {entity: {filter: {domain: 'sensor', device_class: 'power'}}};
  const anySensor = {entity: {filter: {domain: 'sensor'}}};
  const powerMulti = {entity: {multiple: true, filter: {domain: 'sensor', device_class: 'power'}}};
  const voltage = {entity: {filter: {domain: 'sensor', device_class: 'voltage'}}};
  const field = (name, selector, label, required = false) => ({name, selector, required, label});
  const exp = (name, title, schema, expanded = false, icon) => ({type: 'expandable', name, flatten: true, title, expanded, icon, schema});
  const phases = [0, 1, 2].map(n => ({type: 'grid', name: `phase${n}`, flatten: true, schema: [
    field(`phase${n}_voltage`, voltage, t('e_phase_v', {p: 'ABC'[n]})), field(`phase${n}_power`, power, t('e_phase_w', {p: 'ABC'[n]}))]}));
  const schema = [
    exp('general', t('e_general'), [
      field('title', {text: {}}, t('e_title')),
      field('sort', {select: {mode: 'dropdown', options: [{value: 'area', label: t('e_sort_area')}, {value: 'power', label: t('e_sort_power')}, {value: 'name', label: t('e_sort_name')}]}}, t('e_sort')),
      {type: 'grid', name: 'thr', flatten: true, schema: [
        field('backup_threshold', {number: {min: 0, max: 5000, step: 1, mode: 'box', unit_of_measurement: 'W'}}, t('e_backup_threshold')),
        field('active_threshold', {number: {min: 0, max: 1000, step: 1, mode: 'box', unit_of_measurement: 'W'}}, t('e_active_threshold'))]},
    ], false, 'mdi:cog-outline'),
    exp('grid', t('e_grid'), [
      field('grid_power', power, t('e_grid_power'), true),
      field('grid_online', {entity: {filter: {domain: 'binary_sensor'}}}, t('e_grid_online'), true),
      field('grid_name', {text: {}}, t('e_grid_name')),
      exp('phases', t('e_phases'), phases),
    ], !form.grid_power || !form.grid_online, 'mdi:transmission-tower'),
    exp('battery', t('e_battery'), [
      field('bat_ac_out', power, t('e_ac_out'), true),
      field('bat_ac_in', power, t('e_ac_in'), true),
      field('bat_soc', {entity: {filter: {domain: 'sensor', device_class: 'battery'}}}, t('e_soc'), true),
      field('bat_name', {text: {}}, t('e_bat_name')),
      {type: 'grid', name: 'bv', flatten: true, schema: [field('bat_ac_in_volts', voltage, t('e_ac_in_volts')), field('bat_ac_out_volts', voltage, t('e_ac_out_volts'))]},
      field('bat_solar_in', power, t('e_solar_in')),
      field('bat_status', anySensor, t('e_status')),
      {type: 'grid', name: 'bt', flatten: true, schema: [field('bat_discharge_time', anySensor, t('e_discharge_time')), field('bat_charge_time', anySensor, t('e_charge_time'))]},
      field('bat_backup_meter', power, t('e_backup_meter')),
    ], !form.bat_ac_out || !form.bat_ac_in || !form.bat_soc, 'mdi:home-battery-outline'),
  ];
  const devSchema = [
    field('discover', {boolean: {}}, t('e_discover')),
    field('include', powerMulti, t('e_include')),
    field('exclude', powerMulti, t('e_exclude')),
    field('circuits', powerMulti, t('e_circuits')),
  ];
  const st = hass?.states || {};
  const label = id => strip(st[id]?.attributes?.friendly_name) || id;
  for (const id of form.circuits || []) {
    devSchema.push(exp(`cir_${id}`, t('e_circuit', {n: form[`cir|${id}|name`] || label(id)}), [
      field(`cir|${id}|name`, {text: {}}, t('e_circuit_name')),
      field(`cir|${id}|children`, powerMulti, t('e_children')),
    ], false, 'mdi:electric-switch'));
  }
  let tiles = [];
  try { tiles = discover(normalizeConfig(formToConfig(form)), hass).filter(x => x.kind === 'device'); } catch (_) { tiles = []; }
  const overrides = tiles.map(x => exp(`dev_${x.id}`, t('e_device', {n: form[`dev|${x.id}|name`] || x.name}), [
    field(`dev|${x.id}|name`, {text: {}}, t('e_dev_name')),
    {type: 'grid', name: `devg_${x.id}`, flatten: true, schema: [field(`dev|${x.id}|icon`, {icon: {placeholder: x.icon}}, t('e_dev_icon')), field(`dev|${x.id}|color`, {color_rgb: {}}, t('e_dev_color'))]},
  ], false, x.icon));
  devSchema.push(overrides.length ? exp('overrides', `${t('e_overrides')} · ${overrides.length}`, overrides) : {type: 'constant', name: 'none', label: t('e_none')});
  schema.push(exp('devices', t('e_devices'), devSchema, true, 'mdi:power-plug-outline'));
  return schema;
}

/* ---------- card ---------- */
const STYLE = `
:host{display:block;container-type:inline-size;--grid:#82d7ed;--eco:#f5b041;--muted:var(--secondary-text-color,#a8b3c4);color:var(--primary-text-color,#eef2f8)}
*{box-sizing:border-box}
ha-card{display:block;padding:16px;border-radius:var(--ha-card-border-radius,20px);background:var(--ha-card-background,var(--card-background-color,rgba(26,34,48,.82)));border:1px solid var(--divider-color,rgba(127,127,127,.18));box-shadow:none;overflow:hidden;--src:var(--grid)}
ha-card.backup{--src:var(--eco)}ha-card.unknown{--src:var(--muted)}
button{font:inherit;color:inherit;background:none;border:0;padding:0;margin:0;text-align:left;cursor:pointer;-webkit-tap-highlight-color:transparent}
button:focus-visible{outline:2px solid var(--src);outline-offset:3px;border-radius:12px}
ha-icon{flex:none;--mdc-icon-size:24px}
.title{font-size:12px;font-weight:600;letter-spacing:.4px;text-transform:uppercase;color:var(--muted);margin:0 2px 10px}
.src{display:flex;align-items:center;gap:12px;width:100%}
.src-ic{width:46px;height:46px;flex:none;border-radius:14px;display:grid;place-items:center;color:var(--src);background:color-mix(in srgb,var(--src) 14%,transparent);border:1px solid color-mix(in srgb,var(--src) 42%,transparent);transition:color .5s,background .5s,border-color .5s}
.src-ic ha-icon{--mdc-icon-size:27px}
ha-card.backup .src-ic ha-icon{animation:pulse 2s ease-in-out infinite}
.src-copy{flex:1;min-width:0}
.src-title{font-size:14.5px;font-weight:650;display:flex;align-items:center;gap:8px;flex-wrap:wrap}
.chip{font-size:11px;font-weight:650;padding:2px 9px;border-radius:999px;white-space:nowrap;color:var(--src);background:color-mix(in srgb,var(--src) 14%,transparent);border:1px solid color-mix(in srgb,var(--src) 45%,transparent)}
.src-sub{font-size:12px;color:var(--muted);margin-top:3px;line-height:1.4}
.src-val{font-size:24px;font-weight:700;color:var(--src);white-space:nowrap;font-variant-numeric:tabular-nums}
.metrics{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;margin-top:12px}
.metric{padding:8px 10px;border-radius:12px;background:color-mix(in srgb,var(--primary-text-color,#fff) 4%,transparent);border:1px solid color-mix(in srgb,var(--primary-text-color,#fff) 8%,transparent);min-width:0;width:100%}
.m-l{font-size:11px;color:var(--muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.m-v{font-size:15px;font-weight:650;font-variant-numeric:tabular-nums;white-space:nowrap;margin-top:2px}
.m-s{font-size:11px;color:var(--muted);font-variant-numeric:tabular-nums;margin-top:1px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.vbar{height:4px;border-radius:2px;background:color-mix(in srgb,var(--primary-text-color,#fff) 9%,transparent);overflow:hidden;margin-top:6px}.vbar i{display:block;height:100%;border-radius:2px;transition:width .8s ease,background .8s ease}
.trunk{position:relative;height:24px;width:2px;margin:0 auto;background:color-mix(in srgb,var(--src) 38%,transparent);--len:24px}
.dot{position:absolute;left:-1.5px;top:0;width:5px;height:5px;border-radius:50%;background:var(--src);box-shadow:0 0 8px var(--src);animation:fl 1.6s linear infinite;display:none}
ha-card.live .trunk .dot{display:block}
.home{display:flex;align-items:center;gap:12px;margin:0 auto;width:max-content;max-width:100%;padding:10px 16px;border-radius:16px;background:color-mix(in srgb,var(--src) 6%,transparent);border:1px solid color-mix(in srgb,var(--src) 34%,transparent)}
.home ha-icon{--mdc-icon-size:32px;color:var(--src)}
.h-l{font-size:12px;color:var(--muted)}.h-v{font-size:24px;font-weight:700;font-variant-numeric:tabular-nums;line-height:1.15}
.h-s{font-size:11.5px;color:var(--muted);margin-top:2px}
.cov{height:5px;border-radius:3px;background:color-mix(in srgb,var(--primary-text-color,#fff) 9%,transparent);overflow:hidden;margin-top:6px;width:200px;max-width:100%}.cov i{display:block;height:100%;border-radius:3px;background:var(--src);transition:width .6s ease}
.bus{height:2px;margin:12px 6px 0;background:linear-gradient(90deg,transparent,color-mix(in srgb,var(--src) 32%,transparent) 6%,color-mix(in srgb,var(--src) 32%,transparent) 94%,transparent)}
.group{font-size:11px;font-weight:600;letter-spacing:.4px;text-transform:uppercase;color:var(--muted);margin:14px 2px 20px}
.tiles{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:22px 10px}
.tile{position:relative;--c:#82d7ed;min-width:0}
.stem{position:absolute;top:-16px;left:50%;width:1px;height:16px;background:color-mix(in srgb,var(--src) 24%,transparent);--len:16px}
.tile.active .stem .dot{display:block;background:var(--c);box-shadow:0 0 7px var(--c)}
.node{position:relative;display:flex;align-items:center;gap:9px;width:100%;min-height:66px;padding:9px 10px 11px;border-radius:14px;border:1px solid color-mix(in srgb,var(--primary-text-color,#fff) 10%,transparent);background:color-mix(in srgb,var(--primary-text-color,#fff) 3%,transparent);transition:border-color .4s,background .4s}
.node ha-icon{color:var(--muted);--mdc-icon-size:26px;transition:color .4s}
.n-copy{flex:1;min-width:0}
.n-name{font-size:13px;font-weight:600;line-height:1.25;overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow-wrap:break-word;hyphens:auto}
.n-meta{font-size:11px;color:var(--muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-top:1px}
.n-val{font-size:14px;font-weight:650;font-variant-numeric:tabular-nums;white-space:nowrap}
.share{position:absolute;left:10px;right:10px;bottom:4px;height:2px;border-radius:2px;background:color-mix(in srgb,var(--primary-text-color,#fff) 6%,transparent);overflow:hidden}.share i{display:block;height:100%;background:var(--c);transition:width .6s ease}
.tile.active .node{border-color:color-mix(in srgb,var(--c) 45%,transparent);background:radial-gradient(90% 120% at 0 50%,color-mix(in srgb,var(--c) 13%,transparent),transparent)}
.tile.active .node ha-icon{color:var(--c)}
.tile.na{opacity:.55}.tile.na .n-val{font-size:12px;font-weight:500;color:var(--muted)}
.tile.circuit .node{background:color-mix(in srgb,var(--primary-text-color,#fff) 5%,transparent);border-color:color-mix(in srgb,var(--primary-text-color,#fff) 16%,transparent)}
.tile.other .node{border-style:dashed;background:transparent;cursor:default}
.tile.other.warn .n-meta{color:#e0a43a}
.eco{margin-top:16px;padding-top:12px;border-top:1px solid color-mix(in srgb,var(--primary-text-color,#fff) 10%,transparent)}
.eco-head{display:flex;align-items:center;justify-content:space-between;gap:10px;width:100%}
.eco-t{display:flex;align-items:center;gap:8px;font-weight:650;font-size:14px;color:var(--eco)}
.eco-soc{font-size:15px;font-weight:700;font-variant-numeric:tabular-nums}
.eco-role{font-size:12px;color:var(--muted);margin-top:4px;line-height:1.4}
.soc{margin:8px 0 10px;height:10px;border-radius:5px;background:color-mix(in srgb,var(--primary-text-color,#fff) 9%,transparent);overflow:hidden}.soc i{display:block;height:100%;border-radius:5px;transition:width .8s ease,background .8s ease}
.eco .metrics{margin-top:0}
.note{font-size:11px;color:var(--muted);text-align:center;line-height:1.45;margin:12px 0 0}.note.warn{color:#e0a43a}
@keyframes fl{0%{transform:translateY(0);opacity:0}20%,75%{opacity:1}100%{transform:translateY(var(--len,16px));opacity:0}}
@keyframes pulse{0%,100%{opacity:.65}50%{opacity:1}}
:host(.paused) .dot,:host(.paused) .src-ic ha-icon{animation-play-state:paused}
@media(prefers-reduced-motion:reduce){.dot,.src-ic ha-icon{animation:none!important}.dot{opacity:.7}}
@container(min-width:560px){.tiles{grid-template-columns:repeat(3,minmax(0,1fr))}}
@container(min-width:820px){.tiles{grid-template-columns:repeat(4,minmax(0,1fr))}}
@container(max-width:480px){
  ha-card{padding:12px}.metrics{gap:6px}.metric{padding:7px 8px}.h-v{font-size:21px}.home{width:100%}
  .src{flex-wrap:wrap;row-gap:4px}.src-copy{flex-basis:calc(100% - 58px)}.src-val{flex-basis:100%;padding-left:58px;font-size:22px}
  .tiles{gap:20px 8px}
  .node{display:grid;grid-template-columns:24px minmax(0,1fr);grid-template-areas:"i n" "i v";column-gap:8px;row-gap:3px;padding:9px 9px 11px}
  .node ha-icon{grid-area:i;--mdc-icon-size:24px}.n-copy{grid-area:n}.n-val{grid-area:v;font-size:13.5px}
  .n-name{font-size:12.5px}
}
`;

const doc = () => globalThis.document;
const el = (tag, cls, txt) => { const n = doc().createElement(tag); if (cls) n.className = cls; if (txt !== undefined) n.textContent = txt; return n; };
const setText = (n, v) => { if (n.textContent !== v) n.textContent = v; };
const ico = name => { const i = doc().createElement('ha-icon'); i.icon = name; return i; };
const setIcon = (i, name) => { if (i.icon !== name) i.icon = name; };
const Base = globalThis.HTMLElement || class {};

export class HomeEnergyFlowCard extends Base {
  constructor() {
    super();
    this.attachShadow({mode: 'open'});
    this._frame = null; this._visible = false; this._refs = new Map(); this._tiles = []; this._tileKey = ''; this._nodes = new Map(); this._lang = null;
    this._onVisibility = () => { this._motion(); if (!doc().hidden) this._schedule(); };
    this.shadowRoot.addEventListener('click', ev => {
      const b = ev.target.closest?.('[data-entity]'); if (!b || !b.dataset.entity) return;
      this.dispatchEvent(new CustomEvent('hass-more-info', {bubbles: true, composed: true, detail: {entityId: b.dataset.entity}}));
    });
  }
  static getConfigElement() { return doc().createElement('home-energy-flow-card-editor'); }
  static getStubConfig(hass) { return stubConfig(hass); }
  setConfig(config) {
    this._raw = config;
    this._cfg = normalizeConfig(config);
    this._src = sourceIds(this._cfg);
    this._tiles = []; this._tileKey = ''; this._nodes.clear(); this._refs.clear(); this._stateCount = -1; this._lastReg = null; this._lang = null;
    this._schedule();
  }
  set hass(h) {
    const prev = this._hass; this._hass = h;
    if (!this._cfg || !h) return;
    const lang = langOf(h);
    if (lang !== this._lang) { this._lang = lang; this._i = makeI18n(lang, this._cfg.battery.name); this._built = false; this._tileKey = ''; }
    const n = Object.keys(h.states).length;
    if (h.entities !== this._lastReg || h.devices !== this._lastDevs || h.areas !== this._lastAreas || n !== this._stateCount) {
      this._lastReg = h.entities; this._lastDevs = h.devices; this._lastAreas = h.areas; this._stateCount = n; this._rediscover = true; this._schedule(); return;
    }
    if (!prev || !this._built || this._watch?.some(id => this._refs.get(id) !== h.states[id])) this._schedule();
  }
  get hass() { return this._hass; }
  getCardSize() { return 9; }
  getGridOptions() { return {columns: 12, rows: 'auto', min_columns: 6}; }
  connectedCallback() {
    doc().addEventListener('visibilitychange', this._onVisibility);
    if (typeof IntersectionObserver !== 'undefined') {
      this._observer = new IntersectionObserver(en => { this._visible = en[0]?.isIntersecting ?? false; this._motion(); }, {threshold: 0});
      this._observer.observe(this);
    } else this._visible = true;
    this._motion(); this._schedule();
  }
  disconnectedCallback() {
    doc().removeEventListener('visibilitychange', this._onVisibility);
    this._observer?.disconnect(); this._observer = null;
    if (this._frame !== null) cancelAnimationFrame(this._frame);
    this._frame = null; this._visible = false; this._motion();
  }
  _motion() { this.classList.toggle('paused', !this.isConnected || doc().hidden || !this._visible); }
  _schedule() {
    if (!this.isConnected || !this._cfg || this._frame !== null) return;
    this._frame = requestAnimationFrame(() => { this._frame = null; this._render(); });
  }
  _btn(cls, entity) { const b = el('button', cls); b.type = 'button'; if (entity) b.dataset.entity = entity; return b; }
  _metric() {
    const b = this._btn('metric'); const l = el('div', 'm-l'), v = el('div', 'm-v'), s = el('div', 'm-s');
    b.append(l, v, s); return {b, l, v, s};
  }
  _build() {
    const t = this._i.t, style = el('style'); style.textContent = STYLE;
    const card = this._card = el('ha-card'); card.lang = this._lang;   // lets the browser hyphenate long names correctly
    if (this._cfg.title) card.append(el('div', 'title', this._cfg.title));
    this._srcBtn = this._btn('src');
    const icw = el('div', 'src-ic'); this._srcIcon = ico('mdi:transmission-tower'); icw.append(this._srcIcon);
    const copy = el('div', 'src-copy'), tt = el('div', 'src-title');
    this._srcName = el('span'); this._chip = el('span', 'chip'); tt.append(this._srcName, this._chip);
    this._srcSub = el('div', 'src-sub'); copy.append(tt, this._srcSub);
    this._srcVal = el('div', 'src-val'); this._srcBtn.append(icw, copy, this._srcVal);
    this._srcMetrics = el('div', 'metrics');
    this._srcM = [0, 1, 2].map(() => { const m = this._metric(); const bar = el('div', 'vbar'); const fill = el('i'); bar.append(fill); m.b.append(bar); m.bar = fill; this._srcMetrics.append(m.b); return m; });
    const trunk = el('div', 'trunk'); trunk.append(el('span', 'dot'));
    const home = el('div', 'home'); home.append(ico('mdi:home-lightning-bolt-outline'));
    const hc = el('div'); hc.append(el('div', 'h-l', t('home')));
    this._hVal = el('div', 'h-v'); this._hSub = el('div', 'h-s'); const cov = el('div', 'cov'); this._cov = el('i'); cov.append(this._cov);
    hc.append(this._hVal, this._hSub, cov); home.append(hc);
    this._groups = el('div');
    const eco = el('div', 'eco'); this._ecoHead = this._btn('eco-head', this._cfg.battery.soc);
    const et = el('div', 'eco-t'); et.append(ico('mdi:home-battery-outline'), el('span', '', this._cfg.battery.name || t('battery')));
    this._ecoSoc = el('div', 'eco-soc'); this._ecoHead.append(et, this._ecoSoc);
    this._ecoRole = el('div', 'eco-role'); const soc = el('div', 'soc'); this._socBar = el('i'); soc.append(this._socBar);
    const em = el('div', 'metrics');
    this._ecoM = [['ac_in', 'ac_in'], ['ac_out', 'ac_out'], ['solar_in', 'solar']].map(([key, label]) => { const m = this._metric(); m.key = key; setText(m.l, t(label)); m.b.dataset.entity = this._cfg.battery[key] || ''; em.append(m.b); return m; });
    eco.append(this._ecoHead, this._ecoRole, soc, em);
    this._note = el('p', 'note');
    card.append(this._srcBtn, this._srcMetrics, trunk, home, el('div', 'bus'), this._groups, eco, this._note);
    this.shadowRoot.replaceChildren(style, card);
    this._built = true; this._tileKey = '';
  }
  _buildTiles() {
    const t = this._i.t;
    this._nodes.clear(); this._groups.replaceChildren();
    const mk = t2 => {
      const wrap = el('div', `tile ${t2.kind}`); wrap.style.setProperty('--c', t2.color || '#8fa0b8');
      const stem = el('div', 'stem'); stem.append(el('span', 'dot'));
      const node = this._btn('node', t2.kind === 'other' ? null : t2.id); const icon = ico(t2.icon);
      const c = el('div', 'n-copy'), name = el('div', 'n-name', t2.name), meta = el('div', 'n-meta');
      c.append(name, meta); const val = el('div', 'n-val'); const sh = el('div', 'share'), bar = el('i'); sh.append(bar);
      node.append(icon, c, val, sh); wrap.append(stem, node);
      const ref = {t: t2, wrap, node, meta, val, bar}; this._nodes.set(t2.id, ref); return ref;
    };
    const circuits = this._tiles.filter(x => x.kind === 'circuit'), devices = this._tiles.filter(x => x.kind === 'device');
    if (circuits.length) {
      this._groups.append(el('div', 'group', t('circuits')));
      const g = el('div', 'tiles'); circuits.forEach(x => g.append(mk(x).wrap)); this._groups.append(g);
    }
    this._groups.append(el('div', 'group', t('devices', {n: devices.length})));
    this._devGrid = el('div', 'tiles'); devices.forEach(x => this._devGrid.append(mk(x).wrap));
    this._other = mk({id: '__other', kind: 'other', name: t('other'), icon: 'mdi:dots-horizontal-circle-outline', color: '#8fa0b8'});
    this._devGrid.append(this._other.wrap); this._groups.append(this._devGrid);
  }
  _sortTiles(tiles, values) {
    const by = this._cfg.sort, coll = new Intl.Collator(this._i?.locale || 'en');
    const dev = tiles.filter(x => x.kind === 'device'), cir = tiles.filter(x => x.kind === 'circuit');
    const cmp = by === 'power' ? (a, b) => (values?.get(b.id) ?? -1) - (values?.get(a.id) ?? -1) || coll.compare(a.name, b.name)
      : by === 'name' ? (a, b) => coll.compare(a.name, b.name)
      : (a, b) => coll.compare(a.area || '￿', b.area || '￿') || coll.compare(a.name, b.name);
    return [...cir, ...dev.sort(cmp)];
  }
  _render() {
    if (!this._cfg || !this._hass) return;
    const cfg = this._cfg, h = this._hass, st = h.states;
    if (!this._i || this._lang !== langOf(h)) { this._lang = langOf(h); this._i = makeI18n(this._lang, cfg.battery.name); this._built = false; }
    if (!this._built) this._build();
    if (this._rediscover || !this._tiles.length) {
      this._rediscover = false;
      this._tiles = this._sortTiles(discover(cfg, h));
      this._watch = [...new Set([...this._src, ...this._tiles.map(x => x.id)])];
    }
    const f = computeFlow(cfg, st, this._tiles);
    if (cfg.sort === 'power') this._tiles = this._sortTiles(this._tiles, f.values);
    const key = this._tiles.map(x => x.id + '|' + x.name + '|' + x.icon + '|' + x.color + '|' + x.area + '|' + x.parent).join(',');
    if (key !== this._tileKey) {
      if (cfg.sort === 'power' && this._tileKey && this._tileKey.split(',').sort().join() === key.split(',').sort().join()) {
        this._tiles.filter(x => x.kind === 'device').forEach(x => this._devGrid.insertBefore(this._nodes.get(x.id).wrap, this._other.wrap));
      } else this._buildTiles();
      this._tileKey = key;
    }
    for (const id of this._watch) this._refs.set(id, st[id]);
    const c = this._card; c.classList.toggle('backup', f.mode === 'backup'); c.classList.toggle('unknown', f.mode === 'unknown');
    c.classList.toggle('live', f.house !== null && f.house > cfg.active);
    this._renderSource(f, st); this._renderHome(f); this._renderTiles(f); this._renderEco(f, st);
  }
  _renderSource(f, st) {
    const cfg = this._cfg, e = cfg.battery, {t, w, mins, volts, n0} = this._i;
    let icon, name, chip, sub, val, ent;
    if (f.mode === 'grid') {
      icon = 'mdi:transmission-tower'; name = cfg.grid.name || t('grid'); chip = t('chip_grid'); ent = cfg.grid.power; val = w(f.relayW);
      sub = f.relayDown ? t('sub_relay_down') : f.charge > cfg.active ? t('sub_charge', {h: w(f.house), c: w(f.charge)}) : t('sub_grid');
    } else if (f.mode === 'backup') {
      icon = 'mdi:home-battery'; name = t('src_backup'); chip = t('chip_backup'); ent = f.acOut !== null ? e.ac_out : e.backup_meter; val = w(f.backupW);
      const dis = e.discharge_time ? num(st[e.discharge_time]) : null;
      sub = (f.assumed ? t('sub_assumed') : t('sub_backup')) + (dis ? t('sub_left', {t: mins(dis)}) : '') + (f.acOut === null && f.plug !== null ? t('sub_plug') : '');
    } else {
      icon = 'mdi:help-circle-outline'; name = t('src_unknown'); chip = t('chip_unknown'); ent = cfg.grid.online; val = '—';
      sub = t('sub_unknown');
    }
    setIcon(this._srcIcon, icon); setText(this._srcName, name); setText(this._chip, chip); setText(this._srcSub, sub); setText(this._srcVal, val);
    this._srcBtn.dataset.entity = ent || '';
    this._srcBtn.setAttribute('aria-label', `${t('source')}: ${name}, ${val}. ${sub}`);
    const rows = [];
    const pctV = v => v === null ? 0 : Math.max(2, Math.min(100, (v - 200) / 50 * 100));
    if (f.mode === 'grid' && cfg.grid.phases.length) {
      for (const p of cfg.grid.phases) {
        const v = f.relayDown ? null : num(st[p.voltage]), pw = f.relayDown ? null : toWatts(st[p.power]);
        rows.push({l: t('phase', {p: p.name}), v: volts(v), s: pw === null ? '—' : w(pw), vc: voltClass(v), pct: pctV(v), ent: p.voltage || p.power});
      }
    } else if (f.mode === 'backup') {
      const vo = e.ac_out_volts && f.ecoOnline ? num(st[e.ac_out_volts]) : null;
      const soc = num(st[e.soc]); const dis = e.discharge_time ? num(st[e.discharge_time]) : null;
      rows.push({l: t('out'), v: volts(vo), s: w(f.backupW), vc: voltClass(vo), pct: pctV(vo), ent: e.ac_out_volts || e.ac_out});
      rows.push({l: t('soc'), v: soc === null ? '—' : `${n0(soc)}%`, s: dis ? `≈ ${mins(dis)}` : t('time_na'), vc: soc === null ? 'na' : soc < 20 ? 'bad' : soc < 40 ? 'warn' : 'ok', pct: soc ?? 0, ent: e.soc});
      rows.push({l: t('grid_in'), v: f.vin === null ? '—' : volts(f.vin, 0), s: t('relay_off'), vc: 'bad', pct: 0, ent: e.ac_in_volts || cfg.grid.online});
    }
    this._srcMetrics.style.display = rows.length ? '' : 'none';
    this._srcM.forEach((m, i) => {
      const r = rows[i]; m.b.style.display = r ? '' : 'none'; if (!r) return;
      setText(m.l, r.l); setText(m.v, r.v); setText(m.s, r.s); m.v.style.color = VCOL[r.vc];
      m.bar.style.width = `${r.pct}%`; m.bar.style.background = VCOL[r.vc]; m.b.dataset.entity = r.ent || '';
    });
  }
  _renderHome(f) {
    const {t, w, n0} = this._i;
    setText(this._hVal, w(f.house));
    const pct = f.house && f.measured !== null ? Math.max(0, Math.min(100, f.measured / f.house * 100)) : 0;
    const base = t(f.mode === 'grid' ? 'base_grid' : f.mode === 'backup' ? 'base_backup' : 'base_unknown');
    setText(this._hSub, f.measured === null ? t('no_meter_data', {base}) : t('measured', {base, m: w(f.measured), pct: f.house ? ` (${n0(pct)}%)` : '', k: f.known, n: f.count}));
    this._cov.style.width = `${pct}%`;
  }
  _renderTiles(f) {
    const {t, w} = this._i, act = this._cfg.active;
    for (const ref of this._nodes.values()) {
      const x = ref.t;
      if (x.kind === 'other') continue;
      const v = f.values.get(x.id);
      setText(ref.val, v === null ? t('no_data') : w(v));
      setText(ref.meta, [x.parent ? t('in_line', {p: x.parent}) : null, x.kind === 'circuit' ? t('whole_line') : x.area].filter(Boolean).join(' · ') || ' ');
      ref.wrap.classList.toggle('active', v !== null && v > act); ref.wrap.classList.toggle('na', v === null);
      ref.bar.style.width = `${v !== null && f.house ? Math.min(100, v / f.house * 100) : 0}%`;
      ref.node.setAttribute('aria-label', `${x.name}: ${v === null ? t('no_data') : w(v)}. ${t('open')}`);
    }
    const o = this._other, tol = Math.max(60, (f.house || 0) * 0.1);
    const over = f.other !== null && f.measured !== null && f.other < -tol;
    setText(o.val, f.other === null ? '—' : w(Math.max(0, f.other)));
    setText(o.meta, over ? t('other_over', {w: w(-f.other)}) : t('other_meta'));
    o.wrap.classList.toggle('warn', over); o.wrap.classList.toggle('active', f.other !== null && f.other > act);
    o.bar.style.width = `${f.other !== null && f.house ? Math.max(0, Math.min(100, f.other / f.house * 100)) : 0}%`;
    const note = t(f.mode === 'backup' ? 'note_backup' : f.mode === 'grid' ? 'note_grid' : 'note_none');
    setText(this._note, over ? note + t('note_over') : note);
    this._note.classList.toggle('warn', over);
  }
  _renderEco(f, st) {
    const e = this._cfg.battery, {t, w, mins, n0} = this._i, soc = num(st[e.soc]);
    const sc = soc === null ? VCOL.na : soc >= 80 ? VCOL.ok : soc >= 35 ? VCOL.warn : VCOL.bad;
    setText(this._ecoSoc, soc === null ? '—' : `${n0(soc)}%`); this._ecoSoc.style.color = sc;
    this._socBar.style.width = `${soc === null ? 0 : Math.max(0, Math.min(100, soc))}%`; this._socBar.style.background = `linear-gradient(90deg,${sc}cc,${sc})`;
    const chg = e.charge_time ? num(st[e.charge_time]) : null, dis = e.discharge_time ? num(st[e.discharge_time]) : null;
    let role;
    if (!f.ecoOnline) role = t('eco_offline');
    else if (f.mode === 'backup') role = t('eco_source', {w: w(f.backupW)}) + (dis ? t('eco_left', {t: mins(dis)}) : '');
    else if ((f.acIn ?? 0) > this._cfg.active) role = t('eco_charging', {w: w(f.acIn)}) + (chg ? t('eco_full', {t: mins(chg)}) : '');
    else role = t('eco_standby');
    setText(this._ecoRole, role);
    const vk = {ac_in: e.ac_in_volts, ac_out: e.ac_out_volts};
    for (const m of this._ecoM) {
      const id = e[m.key]; m.b.style.display = id ? '' : 'none'; if (!id) continue;
      const v = f.ecoOnline ? toWatts(st[id]) : null; setText(m.v, w(v));
      const u = vk[m.key] && f.ecoOnline ? num(st[vk[m.key]]) : null;
      setText(m.s, u === null ? (m.key === 'solar_in' ? t('panels') : ' ') : `${n0(u)} ${STRINGS[this._lang]?.V || 'V'}`);
    }
  }
}

/* ---------- visual editor (built on Home Assistant's own ha-form) ---------- */
export class HomeEnergyFlowCardEditor extends Base {
  constructor() { super(); this.attachShadow({mode: 'open'}); this._form = {}; }
  setConfig(config) {
    this._config = config || {};
    this._form = configToForm(this._config);
    this._render();
  }
  set hass(h) { const first = !this._hass; this._hass = h; if (first) this._render(); else if (this._el) this._el.hass = h; }
  connectedCallback() { this._ensureForm().then(() => this._render()); }
  async _ensureForm() {
    if (globalThis.customElements?.get('ha-form')) return;
    try {   // ha-form is lazy-loaded by HA; loading a built-in card editor registers it
      const helpers = await globalThis.loadCardHelpers?.();
      const c = await helpers?.createCardElement({type: 'entities', entities: []});
      await c?.constructor?.getConfigElement?.();
    } catch (_) { /* editor falls back to YAML */ }
  }
  _render() {
    if (!this._hass || !this._config || !globalThis.customElements?.get('ha-form')) return;
    const i = makeI18n(langOf(this._hass));
    if (!this._el) {
      const style = el('style'); style.textContent = ':host{display:block}ha-form{display:block}';
      this._el = doc().createElement('ha-form');
      this._el.computeLabel = s => s.label || s.name;
      this._el.addEventListener('value-changed', ev => {
        ev.stopPropagation();
        this._form = {...ev.detail.value};
        this._config = formToConfig(this._form, this._config);
        this.dispatchEvent(new CustomEvent('config-changed', {bubbles: true, composed: true, detail: {config: this._config}}));
        this._el.schema = editorSchema(this._form, this._hass, i);
      });
      this.shadowRoot.replaceChildren(style, this._el);
    }
    this._el.hass = this._hass;
    this._el.data = this._form;
    this._el.schema = editorSchema(this._form, this._hass, i);
  }
}

if (globalThis.customElements) {
  if (!customElements.get('home-energy-flow-card')) customElements.define('home-energy-flow-card', HomeEnergyFlowCard);
  if (!customElements.get('home-energy-flow-card-editor')) customElements.define('home-energy-flow-card-editor', HomeEnergyFlowCardEditor);
  globalThis.customCards = globalThis.customCards || [];
  if (!globalThis.customCards.some(c => c.type === 'home-energy-flow-card')) {
    globalThis.customCards.push({type: 'home-energy-flow-card', name: 'Home Energy Flow', preview: true,
      description: 'Input meter + battery behind an ATS: live source, phases, auto-discovered power meters and the unmetered rest.',
      documentationURL: 'https://github.com/kdimiter/home-energy-flow-card'});
  }
  console.info(`%c HOME-ENERGY-FLOW-CARD %c v${VERSION} `, 'background:#82d7ed;color:#000', 'background:#333;color:#fff');
}
