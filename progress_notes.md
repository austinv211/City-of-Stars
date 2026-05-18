# issues to follow up on

- In character sheet, the attacks and spellcasting should be weapons and damage cantrips
- In character sheet, the spells and cantrips should be cantrips and prepared spells
- both of these should be each doing lookups against the dnd api for rules on the number of prepared spells, which spells / cantrips are allowed at the level, weapons the character can search for, damage cantrips the character can search for, additional the number of spell slots they can have
- the character sheet should list have fields representing all characteristics of the 5e character sheet, reference the markdown below the D&D 5E CHARACTER SHEET CHARACTER DATA section for my proposed character sheet including the homebrew trackers I set lookups
- please reference <https://5e-bits.github.io/docs/api> for all available apis to connect to search boxes and panels, any panel that has a input box should search against the api if possible
- level up rules should absolutely use the apis available for determining what choices to provide to the user when they level up. once the DM triggers a level up of the party, there should be a level up available action on the character sheet that walks the player through the choices to make for their character leveling up and apply the changes to the character when complete.
- Keep allowing players to edit their character sheet completely when in the campaign, but give a log to the DM of what changes have been done in the UI for tracking
- I am absolutely looking for this to follow the dnd 5e rules 2014 edition so that I do not create any weird scenarious with the app causing strange behavior.
- The encounter app should just provide the roll results for an action, spell, or attack but do not automatically do anything with the result. let the DM adjust health of any character and apply status effects that are visible for the players in the UI. Hide npc stat info for the players and only show the monster name and its picture and size to the players when selected.
- In the encounter screen you should be able to select any collection of dice for a roll and group together, showing badges with numbers representing the number of that dice selected, then the dice should finally do the rolling animation once they hit a button to initiate the roll. Players should only be able to initiate a roll for their characters and not the NPCs
- In the encounter screen, only logs for the current encounter should be shown
- In the encounter screen make the animation a 3d d20 rolling in the background with the animation of the number rolling as it does currently
- It should account for multiple dice being rolled, with additional bonuses being added
- the dice roller should account for advantage and disadvantage, and include a total bonus modifier field
- In the DM encounters view, there should be a list of created encounters and side panel showing the history of encounters previously ran, when clicking into one it should show the log from that encounter
- In general please do a quality pass by checking all sections of the rules in the DND API and make sure everything thus-far is in accordance with 2014 5e DND rules

# D&D 5E CHARACTER SHEET CHARACTER DATA

## 1. Character Header Info

- Character Name: \***\*\*\*\*\***\_\***\*\*\*\*\***
- Class & Level: \***\*\*\*\*\***\_\_\***\*\*\*\*\***
- Background: \***\*\*\*\*\*\*\***\_\***\*\*\*\*\*\*\***
- Player Name: \***\*\*\*\*\***\_\_\_\_\***\*\*\*\*\***
- Species/Race: \***\*\*\*\*\***\_\_\_\***\*\*\*\*\***
- Alignment: \***\*\*\*\*\*\*\***\_\_\***\*\*\*\*\*\*\***

## 2. Ability Scores & Saving Throws

For each attribute, record the Base Score, Modifier, and check if Proficient [X] in the Saving Throw.

- [ ] **STR** (Strength): Score: [ ] Mod: [ ] Save: [ ]
- [ ] **DEX** (Dexterity): Score: [ ] Mod: [ ] Save: [ ]
- [ ] **CON** (Constitution): Score: [ ] Mod: [ ] Save: [ ]
- [ ] **INT** (Intelligence): Score: [ ] Mod: [ ] Save: [ ]
- [ ] **WIS** (Wisdom): Score: [ ] Mod: [ ] Save: [ ]
- [ ] **CHA** (Charisma): Score: [ ] Mod: [ ] Save: [ ]

## 3. Vital Stats & Combat Basics

- Proficiency Bonus: +[ ]
- Armor Class (AC): [ ]
- Initiative Modifier: +[ ]
- Speed (Feet): [ ]
- Passive Wisdom (Perception): [ ]
- Passive Intelligence (Investigation): [ ]
- Passive Wisdom (Insight): [ ]

### Hit Points (HP)

- Max Hit Points: [ ]
- Current Hit Points: **\*\*\*\***\_\_**\*\*\*\***
- Temporary Hit Points: **\*\***\_\_\_\_**\*\***

### Hit Dice

- Total Hit Dice: [ ] (e.g., 1d10)
- Current Hit Dice: **\*\*\*\***\_\_\_**\*\*\*\***

### Death Saves

- Successes: [ ] [ ] [ ]
- Failures: [ ] [ ] [ ]

### Custom Campaign Tracker

- **Will of the Void (Method Acting Gauge):**
  [ 0 ] [ 1 ] [ 2 ] [ 3 ] [ 4 ] [ 5 ] [ 6 ] [ 7 ] [ 8 ] [ 9 ] [ 10 ]
  _Current Level:_ [ ]
  _Effects/Static Note:_ **\*\*\*\***\*\***\*\*\*\***\_\_\_**\*\*\*\***\*\***\*\*\*\***

## 4. Skills

Mark [X] if proficient. Use double brackets [[X]] for Expertise.

- [ ] Acrobatics (Dex)
- [ ] Animal Handling (Wis)
- [ ] Arcana (Int)
- [ ] Athletics (Str)
- [ ] Deception (Cha)
- [ ] History (Int)
- [ ] Insight (Wis)
- [ ] Intimidation (Cha)
- [ ] Investigation (Int)
- [ ] Medicine (Wis)
- [ ] Nature (Int)
- [ ] Perception (Wis)
- [ ] Performance (Cha)
- [ ] Persuasion (Cha)
- [ ] Religion (Int)
- [ ] Sleight of Hand (Dex)
- [ ] Stealth (Dex)
- [ ] Survival (Wis)

## 5. Proficiencies & Languages

- Armor Proficiencies: **\*\*\*\***\*\*\*\***\*\*\*\***\_**\*\*\*\***\*\*\*\***\*\*\*\***
- Weapon Proficiencies: **\*\*\*\***\*\***\*\*\*\***\_\_\_\_**\*\*\*\***\*\***\*\*\*\***
- Tool Proficiencies: **\*\*\*\***\*\*\*\***\*\*\*\***\_\_**\*\*\*\***\*\*\*\***\*\*\*\***
- Languages Known: \***\*\*\*\*\***\*\*\***\*\*\*\*\***\_\***\*\*\*\*\***\*\*\***\*\*\*\*\***

## 6. Combat Actions & Attacks

### Weapon / Spell Attacks

1. Name: **\*\***\_\_\_**\*\*** Atk Bonus: +[ ] Damage/Type: \***\*\_\_\_\*\***
2. Name: **\*\***\_\_\_**\*\*** Atk Bonus: +[ ] Damage/Type: \***\*\_\_\_\*\***
3. Name: **\*\***\_\_\_**\*\*** Atk Bonus: +[ ] Damage/Type: \***\*\_\_\_\*\***

### Equipment & Inventory

- Dollars
- Gear Inventory List:
  - ***
  - ***
  - ***

## 7. Personality & Roleplay Features

- Personality Traits: **\*\*\*\***\*\*\*\***\*\*\*\***\_\_**\*\*\*\***\*\*\*\***\*\*\*\***
- Ideals: \***\*\*\*\*\*\*\***\*\*\***\*\*\*\*\*\*\***\_\_\***\*\*\*\*\*\*\***\*\*\***\*\*\*\*\*\*\***
- Bonds: \***\*\*\*\*\*\*\***\*\*\***\*\*\*\*\*\*\***\_\_\_\***\*\*\*\*\*\*\***\*\*\***\*\*\*\*\*\*\***
- Flaws: \***\*\*\*\*\*\*\***\*\*\***\*\*\*\*\*\*\***\_\_\_\***\*\*\*\*\*\*\***\*\*\***\*\*\*\*\*\*\***
- Features & Traits (Feats, Racial Traits, Class Abilities):
  - ***
  - ***

## 8. Spellcasting (If Applicable)

- Spellcasting Ability (INT/WIS/CHA): [ ]
- Spell Save DC: [ ]
- Spell Attack Bonus: +[ ]

### Spell Slots & Spells Known

- Level 1: Slots Total [ ] Expended [ ] | Spells: **\*\*\*\***\_**\*\*\*\***
- Level 2: Slots Total [ ] Expended [ ] | Spells: **\*\*\*\***\_**\*\*\*\***
- Level 3: Slots Total [ ] Expended [ ] | Spells: **\*\*\*\***\_**\*\*\*\***
- Level 4: Slots Total [ ] Expended [ ] | Spells: **\*\*\*\***\_**\*\*\*\***
- Level 5: Slots Total [ ] Expended [ ] | Spells: **\*\*\*\***\_**\*\*\*\***
- Level 6: Slots Total [ ] Expended [ ] | Spells: **\*\*\*\***\_**\*\*\*\***
- Level 7: Slots Total [ ] Expended [ ] | Spells: **\*\*\*\***\_**\*\*\*\***
- Level 8: Slots Total [ ] Expended [ ] | Spells: **\*\*\*\***\_**\*\*\*\***
- Level 9: Slots Total [ ] Expended [ ] | Spells: **\*\*\*\***\_**\*\*\*\***

## 9. Void Abilities & Reality Edits (Homebrew)

- Director's Cut: Cut out the up to a 30 minute scene from the story, add 3 points to will of the void
- Special Effects: The player can perform one of the following effects for 1 point to will of the void:
  - fireball: summon a pyrotechnic effect (treated like a max level fireball spell)
  - slow-mo: slow time to avoid an incoming projectile
- Prop Placement: Add a prop to the scene or replace an existing item with a prop, add 1 point to will of the void
- Automated Dialogue Replacement: Dub over another being's speech with speech of your choice, add 1 point to will of the void
- Skill Montage: Give yourself +5 to a single skill check, add 1 point to will of the void
- Jump-Cut: Teleport to another location via a jump-cut, add 2 points to will of the void
- Guest Star: The player can summon a character from a movie as a helpful companion, given the opportunity from the DM, 2 points to will of the void
- That's a Wrap: Call the end of a Void encounter (unless blocked by DM) when all players of the party are above level 2 will of the void, all players add 3 points to will of the void
- Script Writer: correct a previous bit of your dialogue with a new one, add 1 point to will of the void
  Record your active movie-warping modifications and theatrical script overrides here.
