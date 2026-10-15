# Changelog

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
