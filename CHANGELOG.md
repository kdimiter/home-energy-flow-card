# Changelog

## 2.2.0
- Duplicate hardware is recognised by device registry identifiers/connections. A second integration of the same device (Tuya cloud + `tuya_local`, ZHA + Zigbee2MQTT, …) no longer adds the battery output plug, the input meter or a panel circuit to the loads, and a device added twice is shown once.
- The device group shows how many duplicates were hidden; the measured sum and “Other · unmetered” are no longer inflated by them.
- Verified on Home Assistant 2026.11.

## 2.1.1
- README images use absolute URLs so they render inside HACS.
- Releases are published only after HACS validation and unit tests pass.

## 2.1.0 — first public release
- Visual editor (Home Assistant `ha-form`): grid, phases, battery, auto/manual device selection, panel circuits with nested meters, label · icon · colour per device.
- Generic `battery:` section for any power station, UPS or inverter; `ecoflow:` kept as an alias.
- English and Ukrainian UI, chosen from the Home Assistant language; units and number formats follow it.
- Card picker support with a pre-filled stub config.
- Responsive layout for narrow (phone) widths.

## 2.0.0
- Source detection grid ↔ battery through the ATS, using the battery output so the switch is instant and stale input-meter values are ignored.
- Auto-discovery of every power sensor, panel circuits, “Other · unmetered” balance.
