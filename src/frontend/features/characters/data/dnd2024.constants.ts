import type { AbilityName } from "../types/character.types";

// ── Species ───────────────────────────────────────────────────────────────────
export interface SpeciesData {
  name: string;
  description: string;
}

export const SPECIES_DATA: SpeciesData[] = [
  { name: "Aasimar", description: "Mortals touched by divine power, bearing the light of the gods. They can heal others, manifest radiant wings, and channel celestial energy." },
  { name: "Dragonborn", description: "Proud humanoids with draconic ancestry who breathe the elemental power of their dragon lineage. Strong, honorable, and fierce in combat." },
  { name: "Dwarf", description: "Stout and hardy folk forged in mountain halls, renowned for their craftsmanship, resilience, and stubborn determination." },
  { name: "Elf", description: "Long-lived and graceful beings with a deep connection to magic and nature, known for their keen senses and trance-like rest." },
  { name: "Gnome", description: "Small, curious, and inventive folk with an insatiable love of tinkering, illusion magic, and discovery." },
  { name: "Goliath", description: "Towering humanoids from high mountain peaks, raised in a culture of competition and self-reliance. They possess remarkable physical strength." },
  { name: "Halfling", description: "Small, cheerful folk with extraordinary luck and a talent for going unnoticed. They value comfort, community, and a good meal." },
  { name: "Human", description: "The most adaptable of all peoples, humans thrive through ambition and versatility, building great civilizations in a single lifetime." },
  { name: "Orc", description: "Powerfully built and fierce, orcs are driven by an inner fire that fuels both their aggression and their resilience when pushed to their limits." },
  { name: "Tiefling", description: "Descendants of mortals who made pacts with infernal powers, marked by horns, tails, and an unshakeable connection to the Lower Planes." },
];

export const SPECIES = SPECIES_DATA.map((s) => s.name) as readonly string[];

// ── Classes ───────────────────────────────────────────────────────────────────
export interface SubclassData {
  name: string;
  description: string;
}

export interface ClassData {
  name: string;
  description: string;
  skillCount: number;
  skillChoices: string[];
  savingThrows: AbilityName[];
  subclasses: SubclassData[];
  hitDie: number;
}

export const CLASSES: ClassData[] = [
  {
    name: "Barbarian",
    description: "A fierce warrior who enters a battle rage, trading defense for devastating power. Barbarians excel at absorbing punishment and dealing massive melee damage.",
    skillCount: 2,
    skillChoices: ["Animal Handling", "Athletics", "Intimidation", "Nature", "Perception", "Survival"],
    savingThrows: ["strength", "constitution"],
    hitDie: 12,
    subclasses: [
      { name: "Path of the Berserker", description: "Channel rage into frenzied attacks, striking with extra bonus action attacks while risking exhaustion." },
      { name: "Path of the Wild Heart", description: "Channel the spirit of beasts, gaining animal senses and the ability to speak with animals." },
      { name: "Path of the World Tree", description: "Draw power from the cosmic World Tree, gaining teleportation and the ability to protect allies." },
      { name: "Path of the Zealot", description: "Fueled by divine power, your rage lets you fight on past death itself — you can be brought back easily after falling." },
    ],
  },
  {
    name: "Bard",
    description: "A magical performer who weaves spells through music, inspiring allies and manipulating foes. Bards are versatile jack-of-all-trades with unmatched social skills.",
    skillCount: 3,
    skillChoices: ["Acrobatics", "Animal Handling", "Arcana", "Athletics", "Deception", "History", "Insight", "Intimidation", "Investigation", "Medicine", "Nature", "Perception", "Performance", "Persuasion", "Religion", "Sleight of Hand", "Stealth", "Survival"],
    savingThrows: ["dexterity", "charisma"],
    hitDie: 8,
    subclasses: [
      { name: "College of Dance", description: "Express magic through movement, weaving dazzling footwork into spells and inspiring allies through performance." },
      { name: "College of Glamour", description: "Master the magic of the Feywild to charm and captivate, becoming an irresistible presence who can command a crowd." },
      { name: "College of Lore", description: "Accumulate knowledge from every discipline, supplementing Bardic Inspiration with cutting words and bonus spell access." },
      { name: "College of Valor", description: "Blend martial prowess with bardic magic, wearing armor, fighting effectively, and inspiring allies in the heat of combat." },
    ],
  },
  {
    name: "Cleric",
    description: "A divine spellcaster who draws power from their deity, healing wounds, smiting foes, and channeling holy energy. Clerics are essential support characters.",
    skillCount: 2,
    skillChoices: ["History", "Insight", "Medicine", "Persuasion", "Religion"],
    savingThrows: ["wisdom", "charisma"],
    hitDie: 8,
    subclasses: [
      { name: "Life Domain", description: "Focused on healing and preservation, maximizing the power of healing spells and protecting the living." },
      { name: "Light Domain", description: "Wield the power of radiance and fire, illuminating darkness and searing enemies with holy light." },
      { name: "Trickery Domain", description: "Serve a deity of deceit, gaining illusion spells, clones, and tools for mischief and infiltration." },
      { name: "War Domain", description: "Champion of a martial deity, gaining extra attacks, weapon proficiencies, and divine strikes in battle." },
    ],
  },
  {
    name: "Druid",
    description: "A nature priest who shapes the land's power into spells and can transform into beasts. Druids balance powerful magic with primal connection to the wild.",
    skillCount: 2,
    skillChoices: ["Arcana", "Animal Handling", "Insight", "Medicine", "Nature", "Perception", "Religion", "Survival"],
    savingThrows: ["intelligence", "wisdom"],
    hitDie: 8,
    subclasses: [
      { name: "Circle of the Land", description: "Tap into the magic of natural terrain, recovering spell slots and gaining bonus spells based on your homeland." },
      { name: "Circle of the Moon", description: "Specialize in Wild Shape, transforming into more powerful beasts and eventually elemental or plant forms." },
      { name: "Circle of the Sea", description: "Draw power from tides and storms, pushing enemies with waves of force and calling lightning from gathering clouds." },
      { name: "Circle of Stars", description: "Channel stellar constellations to gain star maps, enhanced Wild Shape, and cosmic healing abilities." },
    ],
  },
  {
    name: "Fighter",
    description: "A master of weapons and armor, excelling through superior tactics, physical training, and combat maneuvers. Fighters attack more often than any other class.",
    skillCount: 2,
    skillChoices: ["Acrobatics", "Animal Handling", "Athletics", "History", "Insight", "Intimidation", "Perception", "Survival"],
    savingThrows: ["strength", "constitution"],
    hitDie: 10,
    subclasses: [
      { name: "Battle Master", description: "Study military maneuvers to perform special combat techniques using Superiority Dice — trip, disarm, rally, and more." },
      { name: "Champion", description: "Push physical excellence to its limits, expanding your critical hit range and gaining additional athletic prowess." },
      { name: "Eldritch Knight", description: "Supplement martial training with abjuration and evocation spells, binding a weapon to yourself through magical attunement." },
      { name: "Psi Warrior", description: "Unlock latent psychic power to shove enemies with the mind, create psionic shields, and augment strikes with telekinetic force." },
    ],
  },
  {
    name: "Monk",
    description: "A martial artist who harnesses inner energy (Ki) to perform superhuman feats of speed, stunning strikes, and deflecting missiles with bare hands.",
    skillCount: 2,
    skillChoices: ["Acrobatics", "Athletics", "History", "Insight", "Religion", "Stealth"],
    savingThrows: ["strength", "dexterity"],
    hitDie: 8,
    subclasses: [
      { name: "Warrior of the Elements", description: "Command the four elements, riding flows of water, surfing stone, and hurling elemental blasts." },
      { name: "Warrior of the Hand", description: "Enhance unarmed combat with grapples and shoves, becoming an expert at controlling the battlefield up close." },
      { name: "Warrior of the Open Hand", description: "Master unarmed strikes, using Flurry of Blows to trip and push enemies, and achieve perfect physical health." },
      { name: "Warrior of Shadow", description: "Blend into darkness using Shadow Arts, stepping through shadows and manifesting a shroud of darkness around you." },
    ],
  },
  {
    name: "Paladin",
    description: "A holy warrior who combines martial might with divine spellcasting. Paladins smite evil with radiant power and shield allies with auras of protection.",
    skillCount: 2,
    skillChoices: ["Athletics", "Insight", "Intimidation", "Medicine", "Persuasion", "Religion"],
    savingThrows: ["wisdom", "charisma"],
    hitDie: 10,
    subclasses: [
      { name: "Oath of Devotion", description: "Swear to uphold justice and virtue, gaining holy spells and auras that protect the innocent." },
      { name: "Oath of Glory", description: "Inspire greatness in yourself and others, gaining inspirational spells and the ability to share your aura." },
      { name: "Oath of the Ancients", description: "Protect the light of hope and nature's beauty, gaining fey-touched magic and resistance to spells." },
      { name: "Oath of Vengeance", description: "Hunt the wicked relentlessly, gaining spells that slow and hunt foes with remorseless precision." },
    ],
  },
  {
    name: "Ranger",
    description: "A hunter and explorer who tracks prey through any terrain, combining archery and survival skills with nature magic to fight the enemies of civilization.",
    skillCount: 3,
    skillChoices: ["Animal Handling", "Athletics", "Insight", "Investigation", "Nature", "Perception", "Stealth", "Survival"],
    savingThrows: ["strength", "dexterity"],
    hitDie: 10,
    subclasses: [
      { name: "Beast Master", description: "Bond with an animal companion that fights alongside you, sharing your adventures and growing in power." },
      { name: "Fey Wanderer", description: "Draw power from the Feywild, charming foes and adding psychic damage to attacks with an otherworldly grace." },
      { name: "Gloom Stalker", description: "Become a predator of the dark, excelling in the first round of combat and terrifying enemies who see in darkness." },
      { name: "Hunter", description: "Study classical hunter techniques to specialize against specific types of foes with powerful tactical options." },
    ],
  },
  {
    name: "Rogue",
    description: "A cunning and stealthy expert who deals devastating Sneak Attack damage when conditions favor it. Rogues excel at skills, traps, and getting out of trouble fast.",
    skillCount: 4,
    skillChoices: ["Acrobatics", "Athletics", "Deception", "Insight", "Intimidation", "Investigation", "Perception", "Performance", "Persuasion", "Sleight of Hand", "Stealth"],
    savingThrows: ["dexterity", "intelligence"],
    hitDie: 8,
    subclasses: [
      { name: "Arcane Trickster", description: "Supplement thievery with illusion and enchantment magic, picking locks with mage hand and stealing magic from enemies." },
      { name: "Assassin", description: "Master infiltration and disguise, dealing devastating damage when striking first or surprising an enemy." },
      { name: "Soulknife", description: "Manifest blades of psychic energy from your mind, reading thoughts and teleporting with psionic power." },
      { name: "Thief", description: "Maximize criminal expertise — faster bonus actions, climbing walls, using magic items, and duplicating objects." },
    ],
  },
  {
    name: "Sorcerer",
    description: "A spellcaster with innate magical power flowing through their blood. Sorcerers shape and twist spells using Metamagic, bending magic to their will.",
    skillCount: 2,
    skillChoices: ["Arcana", "Deception", "Insight", "Intimidation", "Persuasion", "Religion"],
    savingThrows: ["constitution", "charisma"],
    hitDie: 6,
    subclasses: [
      { name: "Aberrant Sorcery", description: "Draw power from a Far Realm influence, creating psychic mutations and warping the minds of those nearby." },
      { name: "Clockwork Sorcery", description: "Channel order and mechanical precision from Mechanus, imposing neutrality and protecting allies from extremes." },
      { name: "Draconic Sorcery", description: "Descended from a dragon, your magic is enhanced by draconic power — gaining a breath weapon and natural armor." },
      { name: "Wild Magic Sorcery", description: "Your magic surges unpredictably, with wild effects that can be chaotic boons or hazards at any moment." },
    ],
  },
  {
    name: "Warlock",
    description: "A spellcaster empowered by a pact with an otherworldly patron. Warlocks have few but powerful spell slots that recharge on a short rest, plus eldritch invocations.",
    skillCount: 2,
    skillChoices: ["Arcana", "Deception", "History", "Intimidation", "Investigation", "Nature", "Religion"],
    savingThrows: ["wisdom", "charisma"],
    hitDie: 8,
    subclasses: [
      { name: "Archfey Patron", description: "Bargained with a powerful fey lord, gaining glamour magic, fear spells, and evasion through dimensional steps." },
      { name: "Celestial Patron", description: "Serves a powerful being of the Upper Planes, gaining healing magic and radiant power to protect the innocent." },
      { name: "Fiend Patron", description: "Made a pact with a devil or demon, gaining fire and necromancy spells plus temporary hit points when you slay enemies." },
      { name: "Great Old One Patron", description: "Bound to a cosmic entity of unfathomable power, gaining telepathy, mind-reading, and access to forbidden knowledge." },
    ],
  },
  {
    name: "Wizard",
    description: "A scholar of arcane magic who learns spells from a spellbook. Wizards have the most diverse and powerful spell list of any class, rewarding preparation and study.",
    skillCount: 2,
    skillChoices: ["Arcana", "History", "Insight", "Investigation", "Medicine", "Religion"],
    savingThrows: ["intelligence", "wisdom"],
    hitDie: 6,
    subclasses: [
      { name: "Abjurer", description: "Specialize in protective magic, creating powerful magical wards and an Arcane Ward that absorbs damage for you." },
      { name: "Diviner", description: "Peer through time and fate, using Portent dice to replace rolls and gaining glimpses of what is yet to come." },
      { name: "Evoker", description: "Master of destructive energy, sculpting explosions to spare allies and empowering spells to deal maximum damage." },
      { name: "Illusionist", description: "Weave convincing illusions that become nearly real, creating duplicates and reshaping images to fool the mind." },
    ],
  },
];

// ── Backgrounds ───────────────────────────────────────────────────────────────
export interface BackgroundData {
  name: string;
  description: string;
  primaryOptions: AbilityName[];
  secondaryOptions: AbilityName[];
}

export const BACKGROUNDS: BackgroundData[] = [
  { name: "Acolyte", description: "You spent your early years in service to a temple, learning sacred rites and the ways of divine magic.", primaryOptions: ["intelligence", "wisdom", "charisma"], secondaryOptions: ["intelligence", "wisdom", "charisma"] },
  { name: "Artisan", description: "You trained in a craft guild, learning to work with your hands and build connections through commerce.", primaryOptions: ["strength", "dexterity", "intelligence"], secondaryOptions: ["strength", "dexterity", "intelligence"] },
  { name: "Charlatan", description: "You thrived by passing yourself off as something you're not, mastering the art of deception and manipulation.", primaryOptions: ["dexterity", "constitution", "charisma"], secondaryOptions: ["dexterity", "constitution", "charisma"] },
  { name: "Criminal", description: "You have a history of breaking the law and surviving on the streets through cunning and calculated risk.", primaryOptions: ["dexterity", "constitution", "intelligence"], secondaryOptions: ["dexterity", "constitution", "intelligence"] },
  { name: "Entertainer", description: "You've traveled as a performer, honing your skill at song, dance, or storytelling to move and delight audiences.", primaryOptions: ["strength", "dexterity", "charisma"], secondaryOptions: ["strength", "dexterity", "charisma"] },
  { name: "Farmer", description: "You grew up working the land, learning patience, hard work, and the rhythms of nature that sustain life.", primaryOptions: ["strength", "constitution", "wisdom"], secondaryOptions: ["strength", "constitution", "wisdom"] },
  { name: "Guard", description: "You protected people or places, developing a watchful eye and the discipline to stand firm under pressure.", primaryOptions: ["strength", "intelligence", "wisdom"], secondaryOptions: ["strength", "intelligence", "wisdom"] },
  { name: "Guide", description: "You led travelers through dangerous terrain, mastering navigation, survival, and reading the land.", primaryOptions: ["dexterity", "constitution", "wisdom"], secondaryOptions: ["dexterity", "constitution", "wisdom"] },
  { name: "Hermit", description: "You spent years in isolated contemplation, emerging with deep insight and perhaps a revelation others have yet to understand.", primaryOptions: ["constitution", "intelligence", "wisdom"], secondaryOptions: ["constitution", "intelligence", "wisdom"] },
  { name: "Merchant", description: "You built a livelihood through trade and negotiation, developing an eye for value and a network of contacts.", primaryOptions: ["constitution", "intelligence", "charisma"], secondaryOptions: ["constitution", "intelligence", "charisma"] },
  { name: "Noble", description: "You were raised in a family of privilege and power, trained in courtly etiquette and the weight of responsibility.", primaryOptions: ["strength", "intelligence", "charisma"], secondaryOptions: ["strength", "intelligence", "charisma"] },
  { name: "Sage", description: "You devoted yourself to research and scholarship, accumulating vast knowledge in a chosen field of arcane or historical study.", primaryOptions: ["constitution", "intelligence", "wisdom"], secondaryOptions: ["constitution", "intelligence", "wisdom"] },
  { name: "Sailor", description: "You made your living on the open water, learning to handle ships, read weather, and survive the unpredictable sea.", primaryOptions: ["strength", "dexterity", "wisdom"], secondaryOptions: ["strength", "dexterity", "wisdom"] },
  { name: "Scribe", description: "You copied texts and managed records, developing meticulous attention to detail and deep familiarity with written knowledge.", primaryOptions: ["dexterity", "intelligence", "wisdom"], secondaryOptions: ["dexterity", "intelligence", "wisdom"] },
  { name: "Soldier", description: "You served in an organized military force, training for war and experiencing the camaraderie and horror of the battlefield.", primaryOptions: ["strength", "dexterity", "constitution"], secondaryOptions: ["strength", "dexterity", "constitution"] },
  { name: "Wayfarer", description: "You wandered from place to place without a permanent home, surviving by your wits and adapting to whatever came next.", primaryOptions: ["dexterity", "wisdom", "charisma"], secondaryOptions: ["dexterity", "wisdom", "charisma"] },
];

// ── Skills ────────────────────────────────────────────────────────────────────
export interface SkillData {
  name: string;
  ability: AbilityName;
  description: string;
}

export const SKILLS: SkillData[] = [
  { name: "Acrobatics", ability: "dexterity", description: "Balance, tumble, and escape from grapples or restraints with nimble body control." },
  { name: "Animal Handling", ability: "wisdom", description: "Calm, control, and communicate with animals, and intuit their intentions." },
  { name: "Arcana", ability: "intelligence", description: "Recall lore about spells, magic items, planes, and other arcane subjects." },
  { name: "Athletics", ability: "strength", description: "Climb, jump, swim, and perform feats of raw physical power." },
  { name: "Deception", ability: "charisma", description: "Mislead others with half-truths, lies, disguises, and misdirection." },
  { name: "History", ability: "intelligence", description: "Recall historical events, legends, ancient conflicts, and notable figures." },
  { name: "Insight", ability: "wisdom", description: "Read people's moods, intentions, and detect when someone is lying." },
  { name: "Intimidation", ability: "charisma", description: "Coerce others through threats, hostile presence, or a display of power." },
  { name: "Investigation", ability: "intelligence", description: "Deduce clues from evidence, find hidden objects, and reason through mysteries." },
  { name: "Medicine", ability: "wisdom", description: "Stabilize the dying, diagnose illness, and understand the workings of the body." },
  { name: "Nature", ability: "intelligence", description: "Recall lore about terrain, plants, animals, weather, and the natural world." },
  { name: "Perception", ability: "wisdom", description: "Notice hidden things using sight, hearing, or other senses." },
  { name: "Performance", ability: "charisma", description: "Entertain an audience through music, storytelling, dance, or acting." },
  { name: "Persuasion", ability: "charisma", description: "Convince others through tact, social grace, good arguments, or appeals to friendship." },
  { name: "Religion", ability: "intelligence", description: "Recall lore about deities, holy rites, religious hierarchies, and sacred symbols." },
  { name: "Sleight of Hand", ability: "dexterity", description: "Pickpocket, conceal objects, perform manual tricks, and plant items undetected." },
  { name: "Stealth", ability: "dexterity", description: "Move silently and hide from enemies, staying out of sight and sound." },
  { name: "Survival", ability: "wisdom", description: "Track quarry, hunt for food, navigate wilderness, and endure harsh conditions." },
];

// ── Alignments ────────────────────────────────────────────────────────────────
export interface AlignmentData {
  name: string;
  description: string;
}

export const ALIGNMENTS: AlignmentData[] = [
  { name: "Lawful Good", description: "Dedicated to order and virtue; follows rules because they protect people and society." },
  { name: "Neutral Good", description: "Fundamentally kind and helpful; does good without strict adherence to law or chaos." },
  { name: "Chaotic Good", description: "Follows their conscience over authority; believes freedom and kindness go hand in hand." },
  { name: "Lawful Neutral", description: "Values order and structure above all else; law is what matters, not necessarily good or evil." },
  { name: "True Neutral", description: "Avoids moral extremes; seeks balance or simply acts in self-interest without strong convictions." },
  { name: "Chaotic Neutral", description: "Values personal freedom above all; rejects authority and acts unpredictably, driven by whim." },
  { name: "Lawful Evil", description: "Uses order, hierarchy, and law as tools to accumulate power and dominate others." },
  { name: "Neutral Evil", description: "Purely self-serving; does whatever is needed to get what they want, without remorse." },
  { name: "Chaotic Evil", description: "Driven by destructive impulses and hatred of order; sows chaos and cruelty for its own sake." },
];

// ── Conditions ────────────────────────────────────────────────────────────────
export const CONDITIONS = [
  "Blinded", "Charmed", "Deafened", "Exhausted", "Frightened",
  "Grappled", "Incapacitated", "Invisible", "Paralyzed", "Petrified",
  "Poisoned", "Prone", "Restrained", "Stunned", "Unconscious",
];

// ── Point Buy ─────────────────────────────────────────────────────────────────
export const POINT_BUY_COSTS: Record<number, number> = {
  8: 0, 9: 1, 10: 2, 11: 3, 12: 4, 13: 5, 14: 7, 15: 9,
};
export const POINT_BUY_BUDGET = 27;
export const POINT_BUY_MIN = 8;
export const POINT_BUY_MAX = 15;
