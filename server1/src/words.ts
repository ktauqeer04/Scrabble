// Words categorized by difficulty
// Easy: short, common, simple to draw
// Normal: moderate length, everyday objects/concepts
// Hard: longer, abstract, or complex to draw

const easyWords = [
  "apple", "ball", "book", "cat", "car",
  "cup", "dog", "door", "egg", "eye",
  "fish", "flag", "hat", "hand", "house",
  "key", "kite", "leaf", "moon", "nose",
  "pen", "pig", "rain", "ring", "shoe",
  "snow", "star", "sun", "tree", "cake",
  "chair", "clock", "cloud", "crown", "fork",
  "frog", "gift", "heart", "ice", "lamp",
  "lock", "milk", "nest", "owl", "pizza",
  "rock", "sock", "spoon", "tent", "train"
];

const mediumWords = [
  "bridge", "castle", "dolphin", "elephant", "fireplace",
  "guitar", "hammock", "igloo", "jellyfish", "lighthouse",
  "mushroom", "notebook", "octopus", "parachute", "rainbow",
  "sandwich", "telescope", "umbrella", "volcano", "waterfall",
  "airplane", "balloon", "cactus", "diamond", "glacier",
  "helicopter", "island", "jungle", "kangaroo", "magnet",
  "ninja", "orchestra", "penguin", "robot", "snowflake",
  "tornado", "unicorn", "wizard", "zipline", "backpack",
  "campfire", "dinosaur", "envelope", "firework", "greenhouse",
  "hourglass", "jackpot", "keyboard", "landscape", "microscope"
];

const hardWords = [
  "quicksand", "xylophone", "escalator", "ferris wheel", "vending machine",
  "kaleidoscope", "constellation", "metamorphosis", "archaeologist", "photosynthesis",
  "cryptocurrency", "civilization", "ecosystem", "hallucination", "infrastructure",
  "reincarnation", "silhouette", "stethoscope", "thermodynamics", "ventriloquist",
  "amphitheater", "biodiversity", "choreography", "claustrophobia", "domestication",
  "electromagnet", "extraterrestrial", "gyroscope", "hieroglyphics", "hypothermia",
  "immunization", "labyrinth", "mausoleum", "observatory", "paleontology",
  "planetarium", "quarantine", "renaissance", "sustainability", "telecommunication",
  "topography", "transcendence", "urbanization", "vaccination", "wavelength",
  "xenophobia", "yesteryear", "zeitgeist", "acupuncture", "bureaucracy"
];

const words = {
  easy: easyWords,
  medium: mediumWords,
  hard: hardWords
};

export default words;