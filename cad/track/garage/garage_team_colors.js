/**
 * Garage colours per team, taken from /workspace/f1-teams/teams_liveries.json (photo approximated paint colours,
 * Oct 3 2026). panel = wall panels, cabinets and pillars; accent = trim and tyre blankets; tv = F1 graphics colour.
 * Keys match the team ids in teams.js ('sauber' is the Audi entry).
 */
export const GARAGE_TEAM_COLORS = {
  "mclaren": {
    "name": "McLaren",
    "panel": "#F77C09",
    "accent": "#232328",
    "tv": "#F47600"
  },
  "mercedes": {
    "name": "Mercedes",
    "panel": "#01C7C9",
    "accent": "#0F0F14",
    "tv": "#00D7B6"
  },
  "red-bull": {
    "name": "Red Bull Racing",
    "panel": "#192355",
    "accent": "#DA2520",
    "tv": "#4781D7"
  },
  "ferrari": {
    "name": "Ferrari",
    "panel": "#DF111D",
    "accent": "#19191E",
    "tv": "#ED1131"
  },
  "williams": {
    "name": "Williams",
    "panel": "#0071C6",
    "accent": "#58ADED",
    "tv": "#1868DB"
  },
  "racing-bulls": {
    "name": "Racing Bulls",
    "panel": "#1D3A96",
    "accent": "#DB2615",
    "tv": "#6C98FF"
  },
  "aston-martin": {
    "name": "Aston Martin",
    "panel": "#015E57",
    "accent": "#CEDE02",
    "tv": "#229971"
  },
  "haas": {
    "name": "Haas",
    "panel": "#E0071E",
    "accent": "#191919",
    "tv": "#9C9FA2"
  },
  "audi": {
    "name": "Audi",
    "panel": "#B6B4B2",
    "accent": "#E60215",
    "tv": "#F50537"
  },
  "alpine": {
    "name": "Alpine",
    "panel": "#02569E",
    "accent": "#F085BA",
    "tv": "#00A1E8"
  },
  "cadillac": {
    "name": "Cadillac",
    "panel": "#19191B",
    "accent": "#EFF1F0",
    "tv": "#909090"
  }
};
GARAGE_TEAM_COLORS.sauber = GARAGE_TEAM_COLORS.audi;
