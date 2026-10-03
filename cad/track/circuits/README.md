# 2026 circuit research pack

This folder holds what we know about every circuit on the 2026 Formula 1 calendar, in one data file per circuit.
It is meant as the starting point for building more tracks like the Red Bull Ring in `cad/track/`.
Nothing here changes the current track or the car.

## What is in the pack

- `calendar_2026.json`: the 23 rounds with dates, sprint weekends, and the two races that were dropped.
- `<id>.json`: one file per circuit (23 files). The fields are described in `schema.json`.
- `../raw/centreline/<id>.csv`: the line down the middle of the track, one point every 5 m, with height and,
  where known, track width.
- `../raw/tumftm/`: the original TUMFTM track files (16 circuits), with `SOURCE.md` for the licence.
- `../raw/bacinger/`: one extra track line for Madrid, with `SOURCE.md`.
- `build_report.txt`: what the last build had to drop or work around.
- `tools/track/research/`: the scripts that made all of this.

## The 2026 calendar

Checked on 3 October 2026 against formula1.com, the F1 and FIA press release of 26 July 2026, Reuters and Wikipedia.

| Round | Grand Prix | Circuit (file) | Dates |
|---|---|---|---|
| 1 | Australia | Albert Park (`albert_park`) | 6 to 8 March |
| 2 | China, sprint | Shanghai (`shanghai`) | 13 to 15 March |
| 3 | Japan | Suzuka (`suzuka`) | 27 to 29 March |
| 4 | Miami, sprint | Miami International Autodrome (`miami`) | 1 to 3 May |
| 5 | Canada, sprint | Circuit Gilles Villeneuve (`montreal`) | 22 to 24 May |
| 6 | Monaco | Circuit de Monaco (`monaco`) | 5 to 7 June |
| 7 | Barcelona-Catalunya | Circuit de Barcelona-Catalunya (`barcelona`) | 12 to 14 June |
| 8 | Austria | Red Bull Ring (`red_bull_ring`) | 26 to 28 June |
| 9 | Britain, sprint | Silverstone (`silverstone`) | 3 to 5 July |
| 10 | Belgium | Spa-Francorchamps (`spa`) | 17 to 19 July |
| 11 | Hungary | Hungaroring (`hungaroring`) | 24 to 26 July |
| 12 | Netherlands, sprint | Zandvoort (`zandvoort`) | 21 to 23 August |
| 13 | Italy | Monza (`monza`) | 4 to 6 September |
| 14 | Spain | Madring, Madrid (`madring`) | 11 to 13 September |
| 15 | Azerbaijan | Baku City Circuit (`baku`) | 24 to 26 September (race on Saturday) |
| 16 | Bahrain, held in Malaysia | Sepang (`sepang`) | 2 to 4 October |
| 17 | Singapore, sprint | Marina Bay (`marina_bay`) | 9 to 11 October |
| 18 | United States | Circuit of the Americas (`cota`) | 23 to 25 October |
| 19 | Mexico City | Autódromo Hermanos Rodríguez (`mexico_city`) | 30 October to 1 November |
| 20 | São Paulo | Interlagos (`interlagos`) | 6 to 8 November |
| 21 | Las Vegas | Las Vegas Strip Circuit (`las_vegas`) | 19 to 21 November (race on Saturday) |
| 22 | Qatar | Lusail (`lusail`) | 27 to 29 November |
| 23 | Abu Dhabi | Yas Marina (`yas_marina`) | 4 to 6 December |

The calendar first had 24 races. The Bahrain race at Sakhir (12 April) and the Saudi Arabian race at Jeddah (19 April)
were called off in March because of the war in the Middle East. In July the Bahrain Grand Prix was moved to Sepang in
Malaysia, so that race is in the pack as `sepang`. Jeddah was not replaced. That leaves 23 rounds, so there are no files
for Sakhir or Jeddah. News reports in July said Qatar and Abu Dhabi could also be called off. They are still on the
official calendar, so they are included.

Madrid (Madring) is new and hosts the Spanish Grand Prix. Barcelona keeps a race under a new name. Imola is gone.

## Where the data comes from

Every value in a circuit file says where it came from, and each file lists its sources with links.

- FIA documents for each race (circuit map and Race Director notes): official lap length, sector lengths,
  overtaking zones, track limits, pit entry and exit rules, recent changes to kerbs and run-off.
  2026 documents exist for rounds 1 to 16. Rounds 17 to 23 have not happened yet, so their files use the 2025 documents.
- TUMFTM racetrack-database: an accurate middle line with track widths, for 16 of the circuits.
- OpenStreetMap: track position on the map, pit lane, grandstands, bridges, tunnels, buildings, walls and fences.
- Wikipedia: names, location, turn count, corner names and lap records.
- OpenTopoData: ground height along the track (EU-DEM 25 m in Europe, SRTM 30 m elsewhere).
- bacinger/f1-circuits: a rough track line for Madrid only, because OpenStreetMap does not map the whole lap yet.

If a value could not be checked, it is `null` with a note. No numbers were guessed.

## Coverage

Full data (accurate middle line with track widths, plus heights), 14 circuits:
Albert Park, Shanghai, Suzuka, Montreal, Barcelona, Red Bull Ring, Silverstone, Spa, Hungaroring, Monza, Sepang,
Circuit of the Americas, Mexico City, Interlagos.

Middle line from OpenStreetMap with heights, but no track widths, 8 circuits:
Miami, Monaco, Baku, Marina Bay, Las Vegas, Lusail, Zandvoort, Yas Marina.
TUMFTM has no file for the first six. For Zandvoort and Yas Marina, TUMFTM has an older layout (58 m and 266 m too long),
so the OpenStreetMap line is used. Their widths from the old layout are noted as a rough guide.

Weakest data, 1 circuit: Madring. The track line is hand drawn and coarse (5430 m against the official 5414 m),
and the race direction is not confirmed, so left and right in that file may be swapped.

Gaps for all circuits:

- Kerb types and positions are not published anywhere as data. The files only quote recent FIA notes about kerbs.
- Run-off surfaces per corner are not checked. The files quote FIA notes and list what OpenStreetMap has mapped nearby.
- Garage counts are not checked.
- Pit lane length is the length of the mapped pit road, not an official figure.
- Heights come from satellite terrain data. On street circuits (Monaco, Baku, Singapore, Las Vegas, Miami) buildings,
  bridges and tunnels make them rough.
- Some corner names were left out because they could not be found in a source. The build report lists them.
- The 2026 overtaking zones for rounds 17 to 23 are not published yet. Those files hold the 2025 DRS zones instead.

## How to use it when building a track

1. Read `<id>.json` and the centreline CSV it points to.
2. Turn latitude and longitude into flat metres around the circuit's `lat` and `lon` (east and north).
3. Put it in the same frame as the Red Bull Ring: origin at the pole grid box, car facing -X at the start, y up.
   Find the pole box from the start line on the FIA circuit map, since `s = 0` in the CSV is only near the start line.
4. Multiply metres by 10 for the scene (the model is built in decimetres, see `DM` in `cad/track/red_bull_ring.js`).
5. Use `track_width` and the width columns for the track edges. Where they are missing, measure the edges from aerial photos.
6. Use `pit_lane`, `landmarks`, `sectors` and `overtaking` to place the pit lane, grandstands, bridges, timing lines and signs.
   Distances along the lap are given as `s_m` in metres, and sides as left or right when driving in race direction.

The Red Bull Ring already has a full build (`tools/track/build_red_bull_ring.py`), made from the same TUMFTM file,
OpenStreetMap and EU-DEM data. Its pack file shows how a built circuit looks in this format.

Note: the task notes say Z is up, but the current track code uses y up (three.js style). The pack itself only uses
latitude, longitude and height, so it works either way.

## Running the scripts again

```
python3 tools/track/research/fetch_tumftm.py          # download the TUMFTM and Madrid track files
python3 tools/track/research/build_research_pack.py   # rebuild every circuit file (or name one, e.g. monaco)
```

The build needs internet access and takes about 15 minutes the first time. Downloads are kept in `.track_cache/research/`,
which git ignores. The build prints a report of anything it had to drop or work around.
