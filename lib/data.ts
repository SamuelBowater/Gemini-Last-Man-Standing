export const POSITIONS = [
  { key: "forward", label: "Forward", hint: "Find the finisher up top." },
  { key: "midfielder", label: "Midfielder", hint: "Runners from deep count double the fear." },
  { key: "defender", label: "Defender", hint: "A set-piece header will do just fine." },
] as const;

export type PositionKey = (typeof POSITIONS)[number]["key"];

export const SUGGESTED: Record<PositionKey, string[]> = {
  forward: [
    "Erling Haaland", "Mohamed Salah", "Alexander Isak", "Ollie Watkins", "Dominic Solanke",
    "Nicolas Jackson", "Jean-Philippe Mateta", "Yoane Wissa", "Chris Wood", "Jorgen Strand Larsen",
    "Danny Welbeck", "Evanilson", "Joao Pedro", "Matheus Cunha", "Liam Delap",
  ],
  midfielder: [
    "Bukayo Saka", "Cole Palmer", "Bryan Mbeumo", "Bruno Fernandes", "Morgan Rogers",
    "Martin Odegaard", "Jarrod Bowen", "Antoine Semenyo", "Anthony Gordon", "Phil Foden",
    "Jacob Murphy", "Eberechi Eze", "Kaoru Mitoma", "Emile Smith Rowe", "James Maddison",
  ],
  defender: [
    "Trent Alexander-Arnold", "Virgil van Dijk", "William Saliba", "Pedro Porro", "Josko Gvardiol",
    "Levi Colwill", "Gabriel Magalhaes", "Antonee Robinson", "Ezri Konsa", "Milos Kerkez",
    "Destiny Udogie", "Nathan Ake", "Murillo", "Vladimir Coufal", "Rico Lewis",
  ],
};

export const TEAMS = [
  "Arsenal", "Aston Villa", "AFC Bournemouth", "Brentford", "Brighton", "Burnley", "Chelsea",
  "Crystal Palace", "Everton", "Fulham", "Leeds United", "Liverpool", "Manchester City",
  "Manchester United", "Newcastle United", "Nottingham Forest", "Sunderland", "Tottenham Hotspur",
  "West Ham United", "Wolves",
];

export const FD_COMPETITION_CODE = "PL"; // football-data.org's code for the Premier League
