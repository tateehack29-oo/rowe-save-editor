# R.O.W.E. TH Nonplae Save Editor — experimental 0.1

Client-only static editor. Supports trainer name (English encoding) and money; does not edit Pokémon, inventory, or create playable saves. No ROM or user saves are included. It has not been tested with a real save or in an emulator.

## ROM-specific reverse engineering

SHA256 `2d1adf301d051f2cc956855c44c3931b35ddee1e3a0a586f5f324fe5064bbcf5`, 33554432 bytes, GBA header POKEMON EMER / BPEE. Numeric R.O.W.E. release is not confirmed. An embedded string reads Alpha Version - Build Date: Aug 8 2026 13:09:09; this does not authenticate the release.

The GF header at 0x100 is stale for save block sizes and money assumptions; do NOT use vanilla Emerald offsets. Actual table at ROM 0x10026B4 contains 14 u16 offset/size pairs: (0,3264), (0,4084), (4084,4084), (8168,4084), (12252,1556), then storage (0,4084) through (28588,4084), (32672,304). Code at 0x1B39E4 references this table. Checksum code at 0x1B39B8 sums little endian u32 words modulo 2^32 and folds high+low halves to u16.

SaveBlock2 pointer 0x03004B00; SaveBlock1 pointer 0x03004AFC. Money getters/setters at 0x137764/0x137774 XOR with SaveBlock2+0x40. Money callers at 0x1377F8 and 0x137818 use SaveBlock1+0x400, also confirmed by rekey routine 0xB3320. Max money literal 0x1377D0. Name starts at SaveBlock2+0 with 7 characters and terminator, consistent with header and source; Thai encoding remains unmapped. Existing unknown name bytes are preserved if unchanged.

Parser requires exact 128 KiB and every nonempty slot complete, internally consistent and checksum-valid for this profile. Blank unused slot is permitted. Rejects malformed or ambiguous inputs, never silently repairs or falls back. Updates only latest slot's changed fields/checksums; keeps backup and tail bytes identical. Data validation cannot prove which ROM produced a save; use only the supplied matching ROM.

## Reference research

https://github.com/pret/pokeemerald/blob/master/src/rom_header_gf.c
https://github.com/BelialClover/RoweSource/blob/main/src/save.c
https://github.com/Iamdivinefox/Rowe/blob/main/include/global.h
https://github.com/Iamdivinefox/Rowe/blob/main/src/money.c

Sources helped identify routines; ROM bytes take precedence over older public source. No third-party code copied into application.

## Test

`node tests/core.test.mjs`

Synthetic tests verify section rotation, rollover, corruption rejection, XOR edits, allowed byte changes, no-op identity, old-slot/tail preservation and unknown-name preservation. These are not in-game verification. Next gate: a real save created in this ROM, plus edit/load/resave testing before adding Pokémon/inventory editing.

## Version 0.2 — real-save research (2026-09-23)

User confirmed the original name/money changes load correctly in-game. Supplied save parsed successfully with 14 valid sectors in its active slot. Do not commit that save or the ROM.

New functionality: show party; edit non-egg nickname (English, max 10) and current HP only; edit existing non-key, non-TM bag quantities up to 99 or the original quantity if already higher. No adding/deleting/replacing items, no changes to species/level/moves/IV/EV/storage. New editing paths are NOT yet verified in-game.

ROM code evidence: GetMonData at 0x9AF5C reads status +0x38, level +0x3C, HP +0x3E, max HP +0x40. Party starts at SaveBlock1+0x238, count at +0x234, stride 76; six records end at money +0x400. GetBoxMonData at 0x9B120 field 11 reads species lower 12 bits at +0x1C. Nickname getter at 0x9B2F8 and setter at 0x9B906 copy 12 bytes at +8. Egg flag +0x27 bit 7 excludes nickname edits. No Gen3 shuffle/XOR assumptions applied to these records.

SetBagItemsPointers at 0x127310: pocket 1 +0x4D0 /80, 2 +0x888 /40, 3 +0x6D8 /31, 4 +0x928 /100, 5 +0xBD0 /80, 6 +0xD10 /47, 7 +0x770 /70, 8 +0xAB8 /70. Pocket 9 uses RAM TM representation, key pocket 10 +0x610 /50; neither is edited. Bag quantity getter/setter 0x1271F4/0x12720C XOR u16 with low half of key at SaveBlock2+0x40. Item table at 0xF76D78 stride 56 has item ID +18 and pocket +34. Catalog contains only matching self-ID rows; parser validates pocket correspondence before exposing edits. Species labels are decoded from the ROM's 13-byte name entries. Labels with unmapped characters are not used for accepting unknown species.

`node tests/extras.test.mjs /absolute/path/to/supplied-save.sav` checks the supplied known sample, no-op identity, name/HP/quantity edits, out-of-range and key-item refusal, unknown-name preservation, and a byte allowlist. The combined test changes only 16 bytes; other bytes including backup, flags, party stats, packed fields, and tail remain identical. This verifies file transformations, not game behavior.

## Version 0.3 — adding Pokémon to Party and PC

Adds a staged queue with searchable species, level 1–100, and Party / PC box selection. Uses first clean empty slot in selected destination, never overwrites occupied/unknown bytes. Party cap 6, PC 21 boxes × 30. Save commits all queued changes to a copy; resetting or reopening discards queue. Existing functions retain user-confirmed in-game status. **New addition functionality still needs end-to-end gameplay/load/save testing.** No Pokédex/quest flags are modified. Alternate forms, ability/nature/shiny customization and moving/removing existing Pokémon are not included.

The binary template asset is 1,025 normal species × 100 levels × 76 bytes, 7,790,000 bytes, created by executing this ROM's CreateMon function at 0x98060 with Unicorn's Thumb CPU engine. Minimal CpuSet/CpuFastSet/Div BIOS hooks; game flags/options normal/zero. Source trainer name is a neutral placeholder, not user data. Every template was validated through ROM species/level getters and PC withdrawal conversion; 102,500 conversions matched level and calculated stats. Fixed per-species personality and initial traits are deliberate presets, not a random generator. Runtime copies the save's full trainer ID at SB2+0xA, 7 raw OT-name bytes and OT-gender (+0x32 bit 6) into each new record. Other traits remain as generated by the ROM. Browser verifies the template asset SHA-256 before using it. No ROM bytes, ROM file, or user saves are deployed.

PC record is 52 bytes (not the party's 76). Logical storage starts with a 4-byte header, then 630 records, followed by box names/wallpapers. ROM PC getter at 0x121B74 computes base +4 + box*1560 + slot*52; box max 20 and slot max 29. Withdrawal wrapper at 0x121E94 calls conversion 0x9A4DC, copies 52 bytes and rebuilds party stats. Nickname/OT/species packed fields are common. Storage is assembled from sector IDs 5..13 using the exact 4084-byte chunks; dirty chunks/checksums alone are rewritten, including split records. Metadata and inactive save slot are unchanged.

Validation: `node tests/additions.test.mjs <local supplied test save>` checks SHA, Party capacity, box capacity, malformed requests, append-only changes, preservation, and a slot at logical 4060 crossing a sector boundary. Executing ROM routines on the resulting test save independently read added Mewtwo Lv50 from Party and Rayquaza from box3/slot19; actual withdrawal conversion returned Lv100 and HP321/321. This is execution of specific game routines, not a full emulated playthrough.

Reproduction (requires local exact matching ROM and Python unicorn): `python scripts/generate_templates.py /absolute/path/to/rom.gba`. Runtime dependencies do not include Unicorn. The site remains static and all user-save processing remains in the browser.

## Version 0.4 — visual Pokémon picker

User confirmed adding Pokémon works in-game. Added a searchable, paginated image-button grid (24 per page), selected Pokémon preview and queue thumbnails. Native hidden select retains exact original species-value behavior; image buttons set it without touching save code. Buttons have names, pressed states, focus styles; search with no results clears selection and refuses queue insertion. Images load lazily, with fixed dimensions and mobile 3-column layout.

1,025 PNG assets validated with Pillow: 1,018 from this exact ROM's front picture/palette tables (0x3E0AA4 / 0x3D35DC, 8-byte entries). GBA LZ77 decompression, first 64×64 frame, 4bpp tiled pixels, BGR555 palette, transparent index 0. Palettes may have fewer than 16 used colors; extractor verifies every referenced color exists.

The ROM shares one front-picture pointer among Ogerpon and six later species. Seven correctly labeled supplementary sprites, IDs 1017/1020/1021/1022/1023/1024/1025, were downloaded unchanged from https://github.com/PokeAPI/sprites/tree/master/sprites/pokemon (raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/{id}.png). Visible credits are under ROM details. PNG visual samples inspected for early species, Pikachu, Mewtwo, Larvitar, Rayquaza, Sprigatito, Meowscarada and all seven supplemental species.

Rebuild images: `python scripts/extract_sprites.py /path/to/matching-rom.gba` (Pillow; network access for seven supplemental images). No save-format or factory changes in this version.

## v0.5 — Party/PC roster and EV/stat editor

- Shows all six Party slots and 21 PC boxes with 30 slots each, occupancy, names and sprites. Empty PC cells target an exact slot; occupied cells cannot be overwritten. Party additions append in order.
- Occupied and newly queued Pokémon can be selected for EV editing (0–252 each, total ≤510). Stat targets solve for an achievable EV without changing species, level, nature or other traits. The panel stages a per-Pokémon change before exporting the save.
- This ROM has no per-Pokémon IV storage: native fields 39–44 return zero. No fictitious IV setter is offered. Stat calculation uses the ROM's global bonus, nature overrides, growth curves, variant traits, alternate base stats, EV-disabled flag and save-specific level cap. PC stores EVs and computes stats on withdrawal; Party cached stats/HP are updated while preserving missing HP/fainted state.
- Eggs, partner Pokémon and the special base-stat scaling mode remain viewable but do not expose editing because their calculation has not been implemented. Thai nickname bytes stay unchanged.
- New modules: `roster.mjs`, extracted `stat-data.mjs`; reproduce metadata with `scripts/extract_stats.py <exact-rom-path>` (requires Unicorn). ROM/save bytes are never included in the deployment.
- Verification: 360 native-ROM fixtures across levels, natures, traits and EV allocations; actual-save Party recalculation and PC withdrawal match edited stats; exact PC placements and cross-sector EV writes preserve all unrelated bytes. Existing core/extras/additions tests pass. DOM interaction test covers staged edits, invalid values, slot selection, newly added Pokémon, queue removal and reset. No new full-game playthrough is claimed.

## v0.6 — Forms and unified Pokémon detail panel

- The search catalog contains 1,463 named species/form entries with local sprites. 1,459 entries have native-ROM-verified templates at all levels 1–100. Four entries (Urshifu Rapid Strike and three Tatsugiri entries, ROM IDs 1805/1833/1834/1835) remain visible but cannot be added: the ROM's own form tables map them to other records. Newer forms without a verified descriptive label use `Form #<ROM ID>` instead of guessed names. Search supports English names plus Thai Mega/Alola/Hisui/Galar aliases.
- Native form table terminators are now respected. Templates use the exact stored species + form pair that resolves to the displayed form, including ROM-specific form-table inconsistencies. The original 1,025 templates remain intact.
- Name, gender, nature, species/form-specific Ability slot, held item, four searchable moves, current Party HP, EVs and calculated stat targets share one selected-Pokémon panel. The old duplicate Party nickname/HP editor was removed. Earlier staged field edits survive subsequent edits to that Pokémon.
- Gender/nature changes preserve the personality XOR used for shiny status. Fixed-sex and genderless species are constrained. Hardy (nature zero) is handled through a compatible personality because zero in the ROM's nature override means “use personality.” Raw Thai names are preserved unless renamed (new names currently English/digits).
- Ability choices are read from ROM base/alternate species tables; ability-randomizer saves retain the existing slot. Held-item choices exclude key items/TMs and respect the 10-bit field. Changed Party moves receive 1 PP to avoid overstating ROM-specific signature-move PP; heal at a Pokémon Center to refill. PC withdrawal supplies PP through native game logic. All four moves cannot be empty or duplicated.
- Data sources: the supplied fingerprinted ROM for all numeric records, move/ability names and sprites; [R.O.W.E. source constants](https://github.com/BelialClover/RoweSource/blob/main/include/constants/species.h) for older form labels, matched against ROM species names. One additional supplemental sprite (Terapagos Terastal) comes from [PokeAPI sprites](https://github.com/PokeAPI/sprites). Remaining sprites use the ROM directly.
- Reproduction: run `generate_templates.py` for the baseline, then `expand_catalog.py <ROM> <directory-containing-include_constants_species.h>`, followed by `extract_stats.py` and `extract_sprites.py`. Keep ROM/save files outside this repository.
- Verification: exact field round-trips and native ROM getters for name/gender/nature/Ability/held item/moves/EV; Mega, Alola, Hisui and other form mapping; native Party recalculation and PC withdrawal; shiny-XOR preservation; existing save-boundary tests; DOM tests for combined fields, draft merging, live nature/stat changes, Thai/English form search and exact PC placement. All 1,463 PNG files validate. No full-game playthrough is claimed.

## v0.7 — Edit level and visible search suggestions

- Adds level 1–100 to the same Party/PC Pokémon detail panel. Writes the ROM growth-table EXP threshold while preserving the move bits and partner bit sharing that word; updates Party cached level, recalculated stats and HP while preserving missing HP/fainted state. PC level derives from EXP on withdrawal. Original moves, PP and form are preserved; this does not trigger automatic move learning or evolution. Stat preview respects the save's Level Cap.
- Held item and all four move search fields show matching buttons immediately beneath the input. Matching is case-insensitive and finds text anywhere in a name (e.g. `a`). All matches remain accessible in a bounded scrolling list. Empty results, click/touch selection, arrow navigation, Escape and keeping the previous selection until a choice is made are handled. Native selects remain available for direct selection.
- Validation: levels 1/50/100 across supported ROM growth data and 12 representative species/forms in Party and PC match the independently native-generated templates' EXP. Readback confirms cached level/stats/HP, unchanged name/moves/PP/traits, backup preservation, invalid level rejection and no-op identity. Existing field round-trip tests pass. DOM tests cover level editing, invalid input, immediate matching/counts, no matches, selection persistence, keyboard behavior and merging changes.
