import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeConfig, discover, computeFlow, configToForm, formToConfig, editorSchema, makeI18n, langOf, stubConfig, toWatts}
  from '../dist/home-energy-flow-card.js';

const P = (v, u = 'W') => ({state: String(v), attributes: {device_class: 'power', unit_of_measurement: u}});
const S = (v, attrs = {}) => ({state: String(v), attributes: attrs});
const withIds = st => Object.fromEntries(Object.entries(st).map(([k, v]) => [k, {...v, entity_id: k}]));

const CFG = {
  type: 'custom:home-energy-flow-card',
  grid: {power: 'sensor.main_power', online: 'binary_sensor.main_meter', phases: [
    {name: 'A', voltage: 'sensor.main_voltage_a', power: 'sensor.main_power_a'}]},
  battery: {name: 'PowerStation', ac_in: 'sensor.bat_ac_in', ac_out: 'sensor.bat_ac_out', soc: 'sensor.bat_soc',
    ac_in_volts: 'sensor.bat_ac_in_v', status: 'sensor.bat_status', backup_meter: 'sensor.bat_out_plug'},
  circuits: [{entity: 'sensor.line_room', name: 'Room line', children: ['sensor.lamp_power']}],
};
const base = () => withIds({
  'binary_sensor.main_meter': S('on', {device_class: 'connectivity'}),
  'sensor.main_power': P(3.1, 'kW'), 'sensor.main_power_a': P(2.4, 'kW'), 'sensor.main_voltage_a': S('230.4', {unit_of_measurement: 'V', device_class: 'voltage'}),
  'sensor.bat_ac_in': P(0), 'sensor.bat_ac_out': P(0), 'sensor.bat_dc_out': P(1.3), 'sensor.bat_ac_in_v': S('228', {unit_of_measurement: 'V'}),
  'sensor.bat_status': S('online'), 'sensor.bat_soc': S('99', {unit_of_measurement: '%', device_class: 'battery'}),
  'sensor.bat_out_plug': P(0), 'sensor.line_room': P(0.135, 'kW'),
  'sensor.heater_power': P(2485), 'sensor.fridge_power': P(141), 'sensor.lamp_power': P(20),
  'sensor.hidden_power': P(5), 'sensor.diag_power': P(7), 'sensor.temperature': S('21', {unit_of_measurement: '°C'}),
});
const REG = {
  'sensor.bat_ac_out': {device_id: 'bat'}, 'sensor.bat_dc_out': {device_id: 'bat'}, 'sensor.main_power': {device_id: 'relay'},
  'sensor.heater_power': {device_id: 'h', area_id: 'bath'}, 'sensor.hidden_power': {hidden: true}, 'sensor.diag_power': {entity_category: 'diagnostic'},
};
const hassOf = (states, extra = {}) => ({states, entities: REG, devices: {h: {name: 'Heater'}}, areas: {bath: {name: 'Bathroom'}}, language: 'en', ...extra});

test('auto-discovery: every power sensor except sources, hidden and diagnostic ones', () => {
  const cfg = normalizeConfig(CFG), tiles = discover(cfg, hassOf(base()));
  const ids = tiles.map(t => t.id);
  assert.deepEqual(ids.filter(id => tiles.find(t => t.id === id).kind === 'device').sort(), ['sensor.fridge_power', 'sensor.heater_power', 'sensor.lamp_power']);
  assert.ok(ids.includes('sensor.line_room'), 'circuit tile present');
  assert.ok(!ids.includes('sensor.bat_dc_out'), 'battery device sensors excluded via device_id');
  assert.equal(tiles.find(t => t.id === 'sensor.lamp_power').counted, false, 'circuit child is not counted twice');
  assert.equal(tiles.find(t => t.id === 'sensor.heater_power').area, 'Bathroom');
});

test('manual mode: discover:false shows only included devices', () => {
  const cfg = normalizeConfig({...CFG, discover: false, include: ['sensor.fridge_power']});
  assert.deepEqual(discover(cfg, hassOf(base())).filter(t => t.kind === 'device').map(t => t.id), ['sensor.fridge_power']);
});

test('grid mode: home = input meter − battery charging', () => {
  const st = base(); st['sensor.bat_ac_in'] = {...P(2900), entity_id: 'sensor.bat_ac_in'}; st['sensor.main_power'] = {...P(5.1, 'kW'), entity_id: 'sensor.main_power'};
  const cfg = normalizeConfig(CFG), f = computeFlow(cfg, st, discover(cfg, hassOf(st)));
  assert.equal(f.mode, 'grid'); assert.equal(f.charge, 2900); assert.equal(f.house, 2200);
});

test('outage, first seconds: battery output wins over a stale input meter', () => {
  const st = base(); st['sensor.bat_ac_out'] = {...P(542), entity_id: 'sensor.bat_ac_out'};
  const cfg = normalizeConfig(CFG), f = computeFlow(cfg, st, []);
  assert.equal(f.mode, 'backup'); assert.equal(f.house, 542); assert.equal(f.relayW, null);
});

test('outage with battery offline falls back to the output plug', () => {
  const st = base();
  Object.assign(st, withIds({'binary_sensor.main_meter': S('off'), 'sensor.bat_status': S('offline'), 'sensor.bat_out_plug': P(410)}));
  const f = computeFlow(normalizeConfig(CFG), st, []);
  assert.equal(f.mode, 'backup'); assert.equal(f.house, 410);
});

test('input meter unreachable but grid present at battery input → grid, input not measured', () => {
  const st = base(); Object.assign(st, withIds({'binary_sensor.main_meter': S('off')}));
  const f = computeFlow(normalizeConfig(CFG), st, []);
  assert.equal(f.mode, 'grid'); assert.equal(f.relayDown, true); assert.equal(f.house, null);
});

test('legacy v1 and ecoflow: configs still load', () => {
  const v1 = normalizeConfig({grid: {entity: 'sensor.a', outage_entity: 'binary_sensor.b'},
    ecoflow: {ac_in: 'sensor.c', ac_out: 'sensor.d', soc: 'sensor.e', solar_in: 'sensor.f'},
    appliances: [{entity: 'sensor.g', name: 'Boiler', icon: 'boiler', color: '#ff8a65'}]});
  assert.equal(v1.grid.power, 'sensor.a'); assert.equal(v1.battery.name, 'EcoFlow');
  assert.deepEqual(v1.devices['sensor.g'], {name: 'Boiler', icon: 'mdi:water-boiler', color: '#ff8a65'});
});

test('invalid entity ids are rejected with a readable error', () => {
  assert.throws(() => normalizeConfig({grid: {power: 'not an id', online: 'binary_sensor.x'}, battery: {ac_in: 'sensor.a', ac_out: 'sensor.b', soc: 'sensor.c'}}), /grid.power/);
});

test('editor round-trip keeps the whole config (incl. legacy ecoflow → battery)', () => {
  const real = {
    type: 'custom:home-energy-flow-card', grid_options: {columns: 'full', rows: 'auto'}, active_threshold: 5, backup_threshold: 30, discover: true, sort: 'area',
    grid: {power: 'sensor.p', online: 'binary_sensor.o', phases: [{name: 'A', voltage: 'sensor.va', power: 'sensor.pa'}, {name: 'B', voltage: 'sensor.vb', power: 'sensor.pb'}]},
    ecoflow: {ac_in: 'sensor.i', ac_out: 'sensor.o2', soc: 'sensor.s', status: 'sensor.st', backup_meter: 'sensor.bm'},
    circuits: [{entity: 'sensor.c1', name: 'Line', icon: 'mdi:electric-switch', color: '#82d7ed', children: ['sensor.k']}],
    devices: {'sensor.k': {name: 'Kettle', icon: 'mdi:kettle', color: '#f5b041'}},
  };
  const out = formToConfig(configToForm(real), real);
  assert.deepEqual(out.grid_options, real.grid_options);
  assert.equal(out.ecoflow, undefined); assert.equal(out.battery.name, 'EcoFlow'); assert.equal(out.battery.backup_meter, 'sensor.bm');
  assert.deepEqual(out.grid.phases, real.grid.phases);
  assert.deepEqual(out.circuits, real.circuits);
  assert.deepEqual(out.devices, real.devices);
  assert.deepEqual(normalizeConfig(out).battery, normalizeConfig(real).battery);
});

test('editor schema lists one override panel per device and every circuit', () => {
  const form = configToForm(CFG);
  const s = JSON.stringify(editorSchema(form, hassOf(base()), makeI18n('en')));
  for (const id of ['sensor.heater_power', 'sensor.fridge_power', 'sensor.lamp_power']) assert.ok(s.includes(`dev|${id}|name`), id);
  assert.ok(s.includes('cir|sensor.line_room|children'));
  assert.ok(s.includes('"device_class":"power"'));
});

test('i18n: Ukrainian for uk, English otherwise; units follow language', () => {
  assert.equal(langOf({locale: {language: 'uk'}}), 'uk'); assert.equal(langOf({language: 'de'}), 'en');
  assert.equal(makeI18n('uk').w(2430), '2,43 кВт'); assert.equal(makeI18n('en').w(2430), '2.43 kW');
  assert.equal(makeI18n('en', 'PowerStation').t('chip_backup'), 'ATS · PowerStation');
  assert.equal(makeI18n('uk').mins(95), '1 год 35 хв');
});

test('stub config picks plausible entities and always loads', () => {
  const stub = stubConfig(hassOf(base()));
  assert.doesNotThrow(() => normalizeConfig(stub));
  assert.doesNotThrow(() => normalizeConfig(stubConfig({states: {}})));
});

test('units: W and kW only; negative power ignored for loads', () => {
  assert.equal(toWatts(P(1.5, 'kW')), 1500); assert.equal(toWatts(S('5', {unit_of_measurement: 'A'})), null); assert.equal(toWatts(P(-3)), null);
});
