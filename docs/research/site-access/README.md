# Poker Site Access and Import-Source Research

Scope: how players can obtain their own hand histories, tournament summaries, and related context from poker rooms without building credential storage or bypassing site protections.

Use this lane to decide:

- which rooms deserve native parser support,
- which rooms should be documented as manual export/import first,
- what context can realistically populate `SpotPacket`,
- when authenticated browser/client inspection genuinely requires the user.

Rule: prefer official client export, local files, or user-selected folders. Do not store credentials, automate gameplay, bypass site protections, or claim support for native room formats without fixtures.
