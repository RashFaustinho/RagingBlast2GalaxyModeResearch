# Raging Blast 2 BLES00978 — item list from original game data (English)

This list is newly reconstructed from `item_parameter.dat` and the original English text resources. No community names were used. Hex IDs are **array indices to equip**, not name-text IDs or effect-flag IDs. There are 381 definition records; duplicate names and placeholder records are retained.

Source: boot AFS member22; progress AFS members884,1903,1961 have byte-identical `F_Item_US.pak`. Text IDs and hashes: [provenance](item-localization-provenance-EN.json). Machine-readable version: [CSV](item-catalog-BLES00978-EN.csv).

**Research limit:** descriptions are the effects advertised by the game, not proof that every effect works for every character or mode. Goku chain observed in KB10A; the causal role of cancellation items remains under controlled tests. Vegeta cancellation with 15B is unresolved.

| Equip ID (hex) | Decimal | Original English name | Original description | Property flags (hex) |
|---|---:|---|---|---|
| `0x000` | 0 | Rush Attack Up S | Raises the power of Rush Attacks a little. | 0 |
| `0x001` | 1 | Rush Attack Up M | Raises the power of Rush Attacks a little more. | 1 |
| `0x002` | 2 | Rush Attack Up L | Raises the power of Rush Attacks a great deal. | 2 |
| `0x003` | 3 | Charge Attack Up S | Raises the power of Charge Attacks activated by holding <PAD=□> a little. | 5 |
| `0x004` | 4 | Charge Attack Up M | Raises the power of Charge Attacks activated by holding <PAD=□> more. | 6 |
| `0x005` | 5 | Charge Attack Up L | Raises the power of Charge Attacks activated by holding <PAD=□> a great<br>deal. | 7 |
| `0x006` | 6 | Smash Attack UP S | Raises the power of  Smash Attacks by a little. | 9 |
| `0x007` | 7 | Smash Attack UP M | Raises the power of  Smash Attacks a little more. | A |
| `0x008` | 8 | Smash Attack UP L | Raises the power of  Smash Attacks a great deal. | B |
| `0x009` | 9 | Throw Attack Up S | Powers up throws a little. | 14 |
| `0x00A` | 10 | Throw Attack Up M | Powers up throws a little more. | 15 |
| `0x00B` | 11 | Throw Attack Up L | Powers up throws a great deal. | 16 |
| `0x00C` | 12 | Raging Soul Attack Up | Increases attack power for all melee attacks only during Raging Soul. | D B4 |
| `0x00D` | 13 | Reduce Charge Time | Reduces the time required to charge up. This doesn't<br>include charge time for Ki Blast or Signature skill. | 1D |
| `0x00E` | 14 | Snap-Charger | Making easier to perform a Snap-Charge Attack. | 2A |
| `0x00F` | 15 | Wall Drive Time Extension S | Increases the amount of time your opponent is stuck in the wall a<br>little. | 1F |
| `0x010` | 16 | Wall Drive Time Extension L | Increases the amount of time your opponent is stuck in a wall. | 20 |
| `0x011` | 17 | Crash Damage Up | Raises damage when you crash your opponent into the ground or a wall. | 22 |
| `0x012` | 18 | Skirmish Power Up S | Some bonus is given according to the number of hits when<br>engaging in Blow or Shot Exchange. | A6 |
| `0x013` | 19 | Pursuit Attack: 1 Up S | Increases number of attacks for Pursuit Attack: 1 by 1. | 24 |
| `0x014` | 20 | Pursuit Attack: 1 Up L | Increases number of attacks for Pursuit Attack: 1 by 2. | 25 |
| `0x015` | 21 | Pursuit Attack: 2 Up S | Increases number of attacks for Pursuit Attack: 2 by 1. | 26 |
| `0x016` | 22 | Pursuit Attack: 2 Up L | Increases number of attacks for Pursuit Attack: 2 by 2. | 27 |
| `0x017` | 23 | Extreme Rush | Raises the power of Rush Attacks a great deal. | 3 |
| `0x018` | 24 | Serious! | Powers up your melee attack with every health bar lost. | BB |
| `0x019` | 25 | Smash Counter | Counter becomes the same attack as Smash Attack: 4. | 29 |
| `0x01A` | 26 | Snap Attack Up | Greatly raises the power of Snap Attack. | 1E |
| `0x01B` | 27 | Bond of Fellow Soldiers | Increases Rush Attack power every time an ally is defeated in Team<br>Battle. | C5 |
| `0x01C` | 28 | Ally's Grudge | Increases Smash Attack and Charge Attack power by holding down<br><PAD=□> every time an ally is defeated in Team Battle. | C6 |
| `0x01D` | 29 | Quick Throw | Even when your opponent prevents your throw attack, you can grab your<br>opponent again immediately. | 2B |
| `0x01E` | 30 | Ki Blast Attack Up S | Powers up ki blasts a little. | 2D |
| `0x01F` | 31 | Ki Blast Attack Up M | Powers up ki blasts a little more. | 2E |
| `0x020` | 32 | Ki Blast Attack Up L | Powers up ki blasts a great deal. | 2F |
| `0x021` | 33 | Ki Blast Attack Rate Up | Launches one extra ki blast in Rush mode. | 33 |
| `0x022` | 34 | Ki Blast Speed Up | Speeds up ki blasts. | 34 |
| `0x023` | 35 | Ki Blast Homing Ability Up | Enhances the seeking ability of homing ki blasts. | 36 |
| `0x024` | 36 | Ki Blast Consumption Down | Reduces the Ki spent on Ki Blasts. | 38 |
| `0x025` | 37 | Rush Ki Recover S | Recovers a little more ki when you deal damage with a Rush attack. | 39 |
| `0x026` | 38 | Rush Ki Recover L | Recovers a great deal of ki when you deal damage with a Rush attack. | 3A |
| `0x027` | 39 | Ki Charge Speed Up | Speeds up the time it takes to charge ki. | 3C |
| `0x028` | 40 | Battle Drive | Start the battle with the ki gauge fully filled. | B3 |
| `0x029` | 41 | Ki Auto-Recover | Automatically refills ki. | 5B |
| `0x02A` | 42 | Androidize | Makes you unable to charge, but able to automatically recover ki. | 3F 5A |
| `0x02B` | 43 | Destruction Ki Recover | Recovers ki when you destroy fields with a dash or a Super Dash. | E6 |
| `0x02C` | 44 | Super Guard Ki Recover | Refills ki when you deflect or defend an enemy Super or<br>Ultimate Attack. | BA |
| `0x02D` | 45 | Dash Secrets | Makes dashing cost you no ki. | 45 |
| `0x02E` | 46 | Super Dash Half Ki | Reduces the ki spent on a Super Dash by half. | 46 |
| `0x02F` | 47 | Super Dash Secrets | Makes Super Dashing cost you no ki. | 47 |
| `0x030` | 48 | Vanishing Half Ki | Reduces the ki spent on a Vanishing move by half. | 4B |
| `0x031` | 49 | Vanishing Secrets | Makes Vanishing moves cost you no ki. | 4C |
| `0x032` | 50 | Counter Half Ki | Reduces the ki spent on a counter by half. | 4D |
| `0x033` | 51 | Counter Secrets | Makes counters cost you no ki. | 4E |
| `0x034` | 52 | Sway Secrets | Makes sways cost you no ki. | 4F |
| `0x035` | 53 | Super Rising Half Ki | Reduces the ki spent on a Super Rising move by half. | 48 |
| `0x036` | 54 | Super Rising Secrets | Makes Super Rising moves cost you no ki. | 49 |
| `0x037` | 55 | Signature Skill Ki Consumption Down | Reduces the ki spent on signature skills. | 50 |
| `0x038` | 56 | Signature Skill Ki Consumption Half | Reduces the ki spent on signature skills by half. | 51 |
| `0x039` | 57 | Transform Ki Consumption Down | Reduces ki consumed by transforming. | 52 |
| `0x03A` | 58 | Ki Control | Reduces the ki spent on Super or Ultimate Attacks by half. | 60 |
| `0x03B` | 59 | Mind Breaker | Costs your opponent ki in a Guard Crush. | 55 |
| `0x03C` | 60 | Gigantic Power | Costs your opponent a great deal of ki in a Guard Crush. | 56 |
| `0x03D` | 61 | High-Tension Time Expand S | Makes High-Tension mode last a little longer. | 62 |
| `0x03E` | 62 | High-Tension Time Expand L | Makes High-Tension mode last longer. | 63 |
| `0x03F` | 63 | High-Tension Start | Start the battle in High-Tension mode. | B1 |
| `0x040` | 64 | Forehead Control Device | Reduces your opponent's High-Tension mode time. | 65 |
| `0x041` | 65 | Ultra Divine Water | Puts you in High-Tension mode when you have one health<br>bar left. | C9 |
| `0x042` | 66 | Attitude! | Greatly boosts your ki whenever you lose a health bar. | BD |
| `0x043` | 67 | Max Limit Power | Puts you in High-Tension mode if you win a Blow or Shot Exchange. | B7 |
| `0x044` | 68 | Unexpected Blow | Super Attack or Ultimate Attack can be used in Raging Soul mode. | B5 |
| `0x045` | 69 | High-Tension Ki Consumption<br>Down | During High-Tension Mode, Ki consumption for everything other than<br>Super Attack/Ultimate Attack decrease. | AE |
| `0x046` | 70 | High-Tension Ki Blast Attack Up | During High-Tension Mode, attack power of all Ki Blast attacks<br>slightly increase. | AF |
| `0x047` | 71 | Opponent Paralyze Time Up S | Lengthens the time your opponent is paralyzed a little. | 58 |
| `0x048` | 72 | Opponent Paralyze Time Up M | Lengthens the time your opponent is paralyzed. | 59 |
| `0x049` | 73 | Energy Shaver | Costs your opponent a great deal of ki by Throw Attacks | 57 |
| `0x04A` | 74 | Raging Soul Time Extension | Makes Raging Soul mode last longer. | B6 |
| `0x04B` | 75 | High Speed Ki Blast | Speeds up ki blasts a great deal. | 35 |
| `0x04C` | 76 | Magnet Ki Blast | Enhances the seeking ability of homing ki blasts a great deal. | 37 |
| `0x04D` | 77 | Defense Up S | Raises defense a little. | 6A |
| `0x04E` | 78 | Defense Up M | Raises defense. | 6B |
| `0x04F` | 79 | Defense Up L | Raises defense a great deal. | 6C |
| `0x050` | 80 | Health Up S | Expands your health gauge by 1 bar. | 71 |
| `0x051` | 81 | Health Up L | Expands your health gauge by 2 bars. | 72 |
| `0x052` | 82 | Faint Time Down S | Recovery from knocked-out status takes fewer button inputs than <br>normal. | 7C |
| `0x053` | 83 | Faint Time Down M | Quick recovery from knocked-out status takes fewer button inputs than <br>normal. | 7D |
| `0x054` | 84 | Paralyze Time Down S | Cuts down the time you spend paralyzed a little. | 67 |
| `0x055` | 85 | Paralyze Time Down M | Cuts down the time you spend paralyzed. | 68 |
| `0x056` | 86 | No Wall Drive Time Extension | Cancels the effect of  item to extend time of wall drive<br>which is equipped by opponent. | 7E |
| `0x057` | 87 | Strong Guard | Makes it impossible to break your guards by<br>melee attacks or throws. | 7F |
| `0x058` | 88 | Rush Armor | Makes you unfazed by Rush Attacks. <br>However, received damage increases. | 80 |
| `0x059` | 89 | Smash Armor | Makes you unfazed by Smash Attacks and Charge Attacks while<br>holding <PAD=□> longer. However, you receive more damage. | 81 |
| `0x05A` | 90 | Guard Damage Cut S | Cuts down the damage taken when guarding an attack a little. |  |
| `0x05B` | 91 | Guard Damage Cut M | Cuts down the damage taken when guarding an attack a great deal. |  |
| `0x05C` | 92 | Beautiful Roll | Allows recovery with fewer button inputs when blown away by a charge <br>attack or similar attacks. | 87 |
| `0x05D` | 93 | Material Power | Raises defense whenever you add another item. | 88 |
| `0x05E` | 94 | High-Tension Afterimage<br>Technique | Randomly lets you dodge opponent's attacks when in High-Tension<br>mode. | B0 |
| `0x05F` | 95 | Random Vanishing | Lets you dodge an opponent's attacks on rare occasions. | 89 |
| `0x060` | 96 | Random Roll | Randomly lets you pull your stance together when blown away. | 8B |
| `0x061` | 97 | Random Throw Evasion | Randomly lets you perform Throw Evasion. | 8C |
| `0x062` | 98 | Random Ki Blast Deflect | Randomly lets you deflect a Ki Blast. | 8D |
| `0x063` | 99 | Miracle Power | Reduces damage if your remaining health is reduced to one bar. | CA |
| `0x064` | 100 | Sunglasses | Makes you impervious to the Solar Flare's blinding power. | 8E |
| `0x065` | 101 | Sturdy Scouter | Scouter that will not break no matter how much damage is received. | F4 |
| `0x066` | 102 | Damage Regulator | Receives only certain amount of damage. | 85 |
| `0x067` | 103 | Health Auto-Recover | Makes your health gradually refill during battle. | 8F |
| `0x068` | 104 | Moment's Rest | Refills a little health whenever you defeat an opponent in a team<br>battle. | C7 |
| `0x069` | 105 | Life Drain Attack | Health recovers every time you deal damage to opponent<br>by melee attacks. | F1 |
| `0x06A` | 106 | Mirage | Evade a Super Attack by Snap-Vanishing, and you will automatically <br>evade the remainder of the attack until it finishes. | 91 |
| `0x06B` | 107 | Latent Power! | Greatly boosts defense whenever you lose a health bar. | BF |
| `0x06C` | 108 | Super Attack Power Up S | Enhances the power of Super Attacks a little. | 93 |
| `0x06D` | 109 | Super Attack Power Up M | Enhances the power of Super Attacks. | 94 |
| `0x06E` | 110 | Super Attack Power Up L | Enhances the power of Super Attacks a great deal. | 95 |
| `0x06F` | 111 | Ultimate Attack Power Up S | Enhances the power of Ultimate Attacks a little. | 9A |
| `0x070` | 112 | Ultimate Attack Power Up M | Enhances the power of Ultimate Attacks. | 9B |
| `0x071` | 113 | Ultimate Attack Power Up L | Enhances the power of Ultimate Attacks a great deal. | 9C |
| `0x072` | 114 | Overwhelm! | Greatly boosts your Super Attack strength with each health bar lost. | C1 |
| `0x073` | 115 | Instinct! | Greatly boosts your Ultimate Attack strength with each health bar lost.<br> | C3 |
| `0x074` | 116 | Skirmish Power Up M | Bonus is given according to the number of hits when<br>engaging in Blow or Shot Exchange. | A9 |
| `0x075` | 117 | Go For Broke Super Attack | Either increases or reduces the power of your Super and Ultimate <br>Attacks. | A0 |
| `0x076` | 118 | Go For Broke Defense | Either increases or reduces the power of the Super and Ultimate <br>Attacks you're hit with. | A1 |
| `0x077` | 119 | #18's Kiss | Ultimate Attacks become no longer guardable. | A2 |
| `0x078` | 120 | Bit of Spirit | Turns Spirit Bomb, which is Goku's Ultimate Attack, into Large Spirit <br>Bomb. | A4 |
| `0x079` | 121 | Everyone's Spirit | Turns Spirit Bomb, which is Goku's Ultimate Attack, into Super Spirit <br>Bomb. | A5 |
| `0x07A` | 122 | Faint Time Up S | Quick recovery from knocked-out status takes more button inputs.<br>However, max value of Limit Points increases. | AC |
| `0x07B` | 123 | Faint Time Up L | Quick recovery from knocked-out status takes great amount of button<br>inputs. However, max value of Limit Points increases. | AD |
| `0x07C` | 124 | Power Out of Control | Gives you massive power/defense boosts when your remaining health is<br>reduced to less than one bar. | CB |
| `0x07D` | 125 | Feel Superior | Powers up ki blasts and Super Attacks against opponents with less<br>attack power than you. | B9 |
| `0x07E` | 126 | Challenge to the Strong | Powers up melee and Ultimate Attacks against opponents with more<br>attack power than you. | B8 |
| `0x07F` | 127 | Indomitable Spirit | Raises your Melee, defense, ki, and attack and defense power of Super<br>Attack a little. | C 2C 69 92 |
| `0x080` | 128 | Absolute Confidence | Raises your Melee, ki, and Super Attack abilities. | D 32 98 |
| `0x081` | 129 | Rush of Fighting Spirit | Enhances the power of Ki blasts, Super and Ultimate Attacks a little. | 2C 93 9A |
| `0x082` | 130 | Emperor's Dignity | Enhances the power of Ki blasts, Super and Ultimate Attacks<br>a great deal. | 31 97 9E |
| `0x083` | 131 | Sturdy Clothes | Keeps your outfit in perfect condition, no matter how much you're<br>beaten up. | F6 |
| `0x084` | 132 | Halo | Puts an Angel Halo on your head. | F5 |
| `0x085` | 133 | Unequip Scouter | Take a scouter away from a warrior who equips it | F3 |
| `0x086` | 134 | Lost Cap | Remove hat from character wearing hat. | F8 |
| `0x087` | 135 | Ragged Clothes | Starts battle with a beat up costume. | F7 |
| `0x088` | 136 | Sturdy Cap | Hat that will not be ripped no matter how much damage is received. | F9 |
| `0x089` | 137 | Aura Change Nappa | Turns Normal aura and Ki Charging aura into Nappa-type. | 10A |
| `0x08A` | 138 | Aura Change Yellow 2 | Turns your aura yellow and turns blue when charging. |  |
| `0x08B` | 139 | Aura Change Majin Vegeta | Turns Normal aura and Ki Charging aura into Majin Vegeta-type. | 111 |
| `0x08C` | 140 | Aura Change Jeice | Turns Normal aura and Ki Charging aura into Jeice-type. | 10B |
| `0x08D` | 141 | Aura Change Android #13 | Turns Normal aura and Ki Charging aura into Android #13-type. | 109 |
| `0x08E` | 142 | Aura Change Frieza | Turns Normal aura and Ki Charging aura into<br>Frieza 1st Form-type. | 10F |
| `0x08F` | 143 | Aura Change Ginyu | Turns Normal aura and Ki Charging aura into Ginyu-type. | 10C |
| `0x090` | 144 | Aura Change Dabura | Turns Normal aura and Ki Charging aura into Dabura-type. | 103 |
| `0x091` | 145 | Aura Change Earth Warriors | Turns Normal aura and Ki Charging aura into Earth Warrior-type. | FC |
| `0x092` | 146 | Aura Change White 2 | Turns your aura white and turns red when charging. |  |
| `0x093` | 147 | Aura Change White 3 | Turns Normal aura and Ki Charging aura into Videl-type. |  |
| `0x094` | 148 | Aura Change Videl | Turns Normal aura and Ki Charging aura into Videl-type. | 112 |
| `0x095` | 149 | Aura Change Pink 1 | Turns Normal aura and Ki Charging aura into<br>Super Janemba-type. |  |
| `0x096` | 150 | Aura Change Super Janemba | Turns Normal aura and Ki Charging aura into<br>Super Janemba-type. | 110 |
| `0x097` | 151 | Aura Change Majin Buu | Turns Normal aura and Ki Charging aura into Kid Buu-type. | 105 |
| `0x098` | 152 | Aura Change Blue 1 | Turns Normal aura and Ki Charging aura into Burter-type. |  |
| `0x099` | 153 | Aura Change Blue 2 | Turns your aura blue and turns light purple when charging. |  |
| `0x09A` | 154 | Aura Change Burter | Turns Normal aura and Ki Charging aura into Burter-type. | 10E |
| `0x09B` | 155 | Aura Change Ultramarine | Turns your aura ultramarine and turns blue when charging. |  |
| `0x09C` | 156 | Aura Change Bojack | Turns Normal aura and Ki Charging aura into<br>Full Power Bojack-type. | 101 |
| `0x09D` | 157 | Aura Change Green 2 | Turns your aura green and turns red when charging. |  |
| `0x09E` | 158 | Aura Change Green 3 | Turns your aura green and turns Super Saiyan 3-like<br>when charging. |  |
| `0x09F` | 159 | Aura Change Super Saiyan | Turns Normal aura and Ki Charging aura into Super Saiyan-type. | FE |
| `0x0A0` | 160 | Aura Change Super Saiyan 2 | Turns Normal aura and Ki Charging aura into Super Saiyan 2-type. | FF |
| `0x0A1` | 161 | Aura Change Super Saiyan 3 | Turns Normal aura and Ki Charging aura into Super Saiyan 3-type. | 100 |
| `0x0A2` | 162 | Plasma Aura | Makes lightning shoot out of your aura. | FA |
| `0x0A3` | 163 | Aura Change Hatchiyack | Turns Normal aura and Ki Charging aura into Hatchiyack-type. | 107 |
| `0x0A4` | 164 | Aura Change Evil Warrior | Turns Normal aura and Ki Charging aura into Evil Warrior-type. | 102 |
| `0x0A5` | 165 | Aura Change Android | Turns Normal aura and Ki Charging aura into Android-type. | 108 |
| `0x0A6` | 166 | Aura Change Broly | Turns Normal aura and Ki Charging aura into<br>Legendary Super Saian Broly-type. | 106 |
| `0x0A7` | 167 | Aura Change Saiyan | Turns Normal aura and Ki Charging aura into Saiyan-type. | FB |
| `0x0A8` | 168 | Aura Change Wicked Saiyan | Turns Normal aura and Ki Charging aura into Wicked Saiyan-type. | FD |
| `0x0A9` | 169 | Aura Change Gohan | Turns Normal aura and Ki Charging aura into Ultimate Gohan-type. | 104 |
| `0x0AA` | 170 | Aura Change Zarbon | Turns Normal aura and Ki Charging aura into Super Zarbon-type. | 10D |
| `0x0AB` | 171 | Aura Change Red Flame | Turns Normal aura and Ki Charging aura into Red flame-type. | 113 |
| `0x0AC` | 172 | Aura Change Blue Flame | Turns Normal aura and Ki Charging aura into Blue flame-type. | 114 |
| `0x0AD` | 173 | Max Computer | Put on a CPU opponent to make them much stronger. (CPU-only Item) | 11E |
| `0x0AE` | 174 | Goku Type | Well-balanced in attack and defense; gifted in melee battle. (CPU-only <br>Item) | 11F |
| `0x0AF` | 175 | Vegeta Type | Well-balanced in attack and defense; gifted in long-range battle. <br>(CPU-only Item) | 120 |
| `0x0B0` | 176 | Gohan Type | Gifted in High-Tension attacks. (CPU-only Item) | 121 |
| `0x0B1` | 177 | Trunks Type | Attacks mainly based around nimble Rush moves. (CPU-only Item) | 122 |
| `0x0B2` | 178 | Piccolo Type | Puts up a solid defense while waiting for the opponent to let his <br>guard down. (CPU-only Item) | 123 |
| `0x0B3` | 179 | Krillin Type | Gifted in using the ki powers at his disposal. (CPU-only Item) | 124 |
| `0x0B4` | 180 | Tien Type | Aims for killer Rushes and one-hit-kill Ultimate Attacks. (CPU-only <br>Item) | 125 |
| `0x0B5` | 181 | Chiaotzu Type | Uses a variety of skills as he moves haphazardly. (CPU-only Item) | 126 |
| `0x0B6` | 182 | Guldo Type | Constantly dodges attacks as he waits for help from friends. (CPU-only <br>Item) | 127 |
| `0x0B7` | 183 | Frieza Type | Attacks based chiefly around Super Attacks. (CPU-only Item) | 128 |
| `0x0B8` | 184 | Cell Type | Stymies the enemy with his nimble moves. (CPU-only Item) | 129 |
| `0x0B9` | 185 | Majin Buu Type | Uses a great variety of combos. (CPU-only Item) | 12A |
| `0x0BA` | 186 | Broly Type | Belligerent; aggressively pursues his opponent. (CPU-only Item) | 12B |
| `0x0BB` | 187 | Ginyu Type | Powers himself up as he fights. (CPU-only Item) | 12C |
| `0x0BC` | 188 | Recoome Type | Gifted in throws. (CPU-only Item) | 12D |
| `0x0BD` | 189 | Pursuit Attack Loss | Max number of Pursuit Attacks: 1 and Pursuit Attack: 2 to pursuit <br>decreases. However, max value of Limit Points increases. | 28 |
| `0x0BE` | 190 | Rush Attack Down | Rush Attack power greatly decreases. However max value of Limit Points <br>increases. | 4 |
| `0x0BF` | 191 | Melee Power Down S | Lowers melee attack power a little. | F 19 |
| `0x0C0` | 192 | Melee Power Down M | Lowers melee attack power. | 10 1B |
| `0x0C1` | 193 | Melee Power Down L | Greatly reduces melee attack power. | 11 1A |
| `0x0C2` | 194 | Strength Down | Greatly reduces the power of melee attacks and throws. | 12 1C |
| `0x0C3` | 195 | Ultimate Melee Power Up | Your melee attacks take on superhuman force. | E |
| `0x0C4` | 196 | Ultimate Throw Power Up | Your throw attacks take on superhuman force. | 17 |
| `0x0C5` | 197 | Super Wall Drive Time Extended | Greatly expands the amount of time your opponent is driven into the<br>wall. | 21 |
| `0x0C6` | 198 | Ultimate Crash Damage Up | Raises the damage dealt when you drive your opponent into the ground<br>or a wall. | 23 |
| `0x0C7` | 199 | Best Attack | Raises your charge melee attack power to astonishing levels. | 8 |
| `0x0C8` | 200 | Super Serious! | Hugely expands your melee attack power each time you lose<br>one health bar. | BC |
| `0x0C9` | 201 | Ki Consumption Up | Increases the Ki spent on all skills. However max value of Limit <br>Points increases. | 61 |
| `0x0CA` | 202 | Amount of Ki Restricted | Ki gauge cannot be charged more than one bar. However max value of <br>Limit Points increases. | 40 |
| `0x0CB` | 203 | Ki Charge Speed Down | Ki Charging speed slows down. However max value of Limit Points <br>increases. | 3E |
| `0x0CC` | 204 | Transformation Ki Recover | Refills ki to maximum whenever your character transforms. | 5F |
| `0x0CD` | 205 | All Dash Ki Consumption Up | Greatly increases Ki spent on movement techniques such as Dash or <br>Super Dash. However max value of Limit Points increases. | 4A |
| `0x0CE` | 206 | Transform Secrets | Makes transforming cost you no ki. | 17B |
| `0x0CF` | 207 | Pinch Hitter | In a team battle, puts your teammate in High-Tension mode after a <br>switch-out. | F2 |
| `0x0D0` | 208 | Super Mode | Refills your ki fast in battle. | 5C |
| `0x0D1` | 209 | Ultimate Ki Power Up | Your ki attacks take on superhuman force. | 30 |
| `0x0D2` | 210 | Complete Ki Control | Reduces the ki spent on all skills. | 54 |
| `0x0D3` | 211 | Ultimate Ki Charge Speed Up | Makes the speed at which you charge ki something of ultimate<br>proportions. | 3D |
| `0x0D4` | 212 | Super Rush Ki Recover | Raises the amount of ki you refill when landing a Rush Attack to<br>astonishing proportions. | 3B |
| `0x0D5` | 213 | Super Androidize | Makes you unable to charge, but able to automatically recover ki<br>incredibly fast. | 3F 5C |
| `0x0D6` | 214 | Desire of Destruction | Refills an astonishing amount of ki when you destroy a building or<br>terrain with a dash or a Super Dash. | E7 |
| `0x0D7` | 215 | Super High-Tension Time Extend | Greatly expands the time you spend in High-Tension mode. | 64 |
| `0x0D8` | 216 | Super Ki Auto-Recover | Automatically refills ki a great deal. | 5D |
| `0x0D9` | 217 | Super Attitude! | Gives an astonishing amount of ki each time you lose<br>one health bar. | BE |
| `0x0DA` | 218 | Defense Power Down | Greatly increases damage taken. However max value of<br>Limit Points increases. Cost 0 | 6F |
| `0x0DB` | 219 | Super Health Power Down | Reduces number of health gauges to one bar. However max value of Limit Points increases. | 7B |
| `0x0DC` | 220 | Health 1 Survive | Your health will not go down beyond one bar. | 7A |
| `0x0DD` | 221 | Super Regeneration Cells | Gives you astonishingly quick recovery abilities. | 5C 8F |
| `0x0DE` | 222 | Winner's Privilege | Refills a great deal of health whenever you defeat an opponent in a<br>team battle. | C8 |
| `0x0DF` | 223 | Health Up XL | Expands your health gauge by 3 bars. | 73 |
| `0x0E0` | 224 | Defense Down S | Lowers defense a little. | 6D |
| `0x0E1` | 225 | Defense Down L | Lowers defense. | 6E |
| `0x0E2` | 226 | Guard Damage Cut L | You will not take damage if you guard. |  |
| `0x0E3` | 227 | Health Down S | Lowers health a little. | 75 |
| `0x0E4` | 228 | Health Down M | Lowers health. | 76 |
| `0x0E5` | 229 | Health Down L | Lowers health a great deal. | 77 |
| `0x0E6` | 230 | Super Health Power Up | Gives a massive boost to your health gauge. | 74 |
| `0x0E7` | 231 | Health Power Down L | Lowers health ultimately. | 78 |
| `0x0E8` | 232 | Ultimate Defense Up | Raises your defense to ultimate proportions. | 70 |
| `0x0E9` | 233 | Ultimate Armor | Become unfazed by melee attacks. However damage is more<br>easily received. | 80 81 |
| `0x0EA` | 234 | Super Latent Power! | Raises your defense to astonishing levels each time you lose<br>one health bar. | C0 |
| `0x0EB` | 235 | Super Attack Power Down | Reduces the attack power of Super Attacks, but max value of Limit <br>Points increases. | 99 |
| `0x0EC` | 236 | Ultimate Attack Power Down | Reduces the attack power of Ultimate Attacks, but max value of Limit <br>Points increases. | 9F |
| `0x0ED` | 237 | <PAD=Ｒ３> Seal | Super Attacks become unusable. However max value of Limit Points <br>increases. | A3 |
| `0x0EE` | 238 | Go To Hell | Makes Super and Ultimate Attacks powerful enough to defeat your<br>opponent in one hit. | 86 |
| `0x0EF` | 239 | Ultimate Super Attack Power Up | Raises your Super Attack power to ultimate proportions. | 96 |
| `0x0F0` | 240 | Ultimate Attack Power Up Max | Raises your Ultimate Attack power to ultimate proportions. | 9D |
| `0x0F1` | 241 | Super Overwhelm! | Raises your Super Attack power to astonishing levels each time<br>you lose one health bar. | C2 |
| `0x0F2` | 242 | Instincts of a Champion! | Raises your Ultimate Attacks power to astonishing levels each time<br>you lose one health bar. | C4 |
| `0x0F3` | 243 | Skirmish Power Up L | Big bonus is given according to the number of hits when engaging in <br>Blow/Shot Exchange. | A7 |
| `0x0F4` | 244 | Skirmish Power Down | Big handicap is given according to the number of hits when engaging in <br>Blow/Shot Exchange. | A8 |
| `0x0F5` | 245 | God of Battle | Gives you the power of a war god. | 2 7 B 16 2F 33 34 3C 64 6C 8E 91 95 9C B0 B3 BB BD BF C1 C3 C9 F2 FA |
| `0x0F6` | 246 | Fierce God | Gives you the power of a demon god. | E 17 30 3A 3C 45 47 49 4C 4E 4F 51 56 60 64 68 70 91 96 9D A6 A9 BB BD BF C1 C3 C7 E7 |
| `0x0F7` | 247 | Limitbreaker | Gives you power beyond all limits. | C D 13 15 2C 2E 71 92 94 9C |
| `0x0F8` | 248 | Inherited Power | Raises your melee, ki, defense, and Super Attack abilities. | D 15 2E 6B 94 9B |
| `0x0F9` | 249 | Super Warrior | Raises your melee, ki, defense, and Super Attack abilities to<br>astonishing levels. | E 17 30 70 96 9D |
| `0x0FA` | 250 | Seal Super Health Recover I | Negates Super Health Recovery I. Equip this with basic form, and it <br>will be effective for all team members. | 12E |
| `0x0FB` | 251 | Seal Super Health Recover II | Negates Super Health Recovery II. Equip this with basic form, and it <br>will be effective for all team members. | 12F |
| `0x0FC` | 252 | Seal Super Health Recover III | Negates Super Health Recovery III. Equip this with basic form, and it <br>will be effective for all team members. | 130 |
| `0x0FD` | 253 | Seal Super Health Recover IV | Negates Super Health Recovery IV. Equip this with basic form, and it <br>will be effective for all team members. | 131 |
| `0x0FE` | 254 | Seal Super Health Recover V | Negates Super Health Recovery V. Equip this with basic form, and it <br>will be effective for all team members. | 132 |
| `0x0FF` | 255 | Seal Super Ki Recover I | Negates Super Ki Recovery I. Equip this with basic form, and it will <br>be effective for all team members. | 133 |
| `0x100` | 256 | Seal Super Ki Recover II | Negates Super Ki Recovery II. Equip this with basic form, and it will <br>be effective for all team members. | 134 |
| `0x101` | 257 | Seal Super Ki Recover III | Negates Super Ki Recovery III. Equip this with basic form, and it will <br>be effective for all team members. | 135 |
| `0x102` | 258 | Seal Super Ki Recover IV | Negates Super Ki Recovery IV. Equip this with basic form, and it will <br>be effective for all team members. | 136 |
| `0x103` | 259 | Seal Super Ki Recover V | Negates Super Ki Recovery V. Equip this with basic form, and it will <br>be effective for all team members. | 137 |
| `0x104` | 260 | Seal Health Auto-Loss I | Negates Health Auto-Loss I. Equip this with basic form, and it will be <br>effective for all team members. | 138 |
| `0x105` | 261 | Seal Health Auto-Loss II | Negates Health Auto-Loss II. Equip this with basic form, and it will <br>be effective for all team members. | 139 |
| `0x106` | 262 | Seal Health Auto-Loss III | Negates Health Auto-Loss III. Equip this with basic form, and it will <br>be effective for all team members. | 13A |
| `0x107` | 263 | Seal Health Auto-Loss IV | Negates Health Auto-Loss IV. Equip this with basic form, and it will <br>be effective for all team members. | 13B |
| `0x108` | 264 | Seal Health Auto-Loss V | Negates Health Auto-Loss V. Equip this with basic form, and it will be <br>effective for all team members. | 13C |
| `0x109` | 265 | Seal Ki Auto-Loss I | Negates Ki Auto-Loss I. Equip this with basic form, and it will be <br>effective for all team members. | 13D |
| `0x10A` | 266 | Seal Ki Auto-Loss II | Negates Ki Auto-Loss II. Equip this with basic form, and it will be <br>effective for all team members. | 13E |
| `0x10B` | 267 | Seal 1/10 Score I | Negates 1/10th Score I. Equip this with basic form, and it will be <br>effective for all team members. | 13F |
| `0x10C` | 268 | Seal 1/10 Score II | Negates 1/10th Score II. Equip this with basic form, and it will be <br>effective for all team members. | 140 |
| `0x10D` | 269 | Seal 1/10 Score III | Negates 1/10th Score III. Equip this with basic form, and it will be <br>effective for all team members. | 141 |
| `0x10E` | 270 | Seal Go To Hell I | Negates Go To Hell I. Equip this with basic form, and it will be <br>effective for all team members. | 142 |
| `0x10F` | 271 | Seal Go To Hell II | Negates Go To Hell II. Equip this with basic form, and it will be <br>effective for all team members. | 143 |
| `0x110` | 272 | Seal Go To Hell III | Negates Go To Hell III. Equip this with basic form, and it will be <br>effective for all team members. | 144 |
| `0x111` | 273 | Seal Near Death Start I | Negates Near Death Start I. Equip this with basic form, and it will be <br>effective for all team members. | 145 |
| `0x112` | 274 | Seal Near Death Start II | Negates Near Death Start II. Equip this with basic form, and it will <br>be effective for all team members. | 146 |
| `0x113` | 275 | Seal Near Death Start III | Negates Near Death Start III. Equip this with basic form, and it will <br>be effective for all team members. | 147 |
| `0x114` | 276 | Seal 1/10 Super Attack Damage I | Negates 1/10th Super Attack Damage I. Equip this with basic form, and <br>it will be effective for all team members. | 148 |
| `0x115` | 277 | Seal 1/10 Super Attack Damage II | Negates 1/10th Super Attack Damage II. Equip this with basic form, and <br>it will be effective for all team members. | 149 |
| `0x116` | 278 | Seal 100% Vanishing I | Negates 100% Vanishing I. Equip this with basic form, and it will be <br>effective for all team members. | 14A |
| `0x117` | 279 | Seal 100% Vanishing II | Negates 100% Vanishing II. Equip this with basic form, and it will be <br>effective for all team members. | 14B |
| `0x118` | 280 | Super Health Recover I | Health constantly recovers. Negate effects with Galaxy Item (Seal). | 14C |
| `0x119` | 281 | Super Health Recover II | Health constantly recovers. Negate effects with Galaxy Item (Seal). | 14D |
| `0x11A` | 282 | Super Health Recover III | Health constantly recovers. Negate effects with Galaxy Item (Seal). | 14E |
| `0x11B` | 283 | Super Health Recover IV | Health constantly recovers. Negate effects with Galaxy Item (Seal). | 14F |
| `0x11C` | 284 | Super Health Recover V | Health constantly recovers. Negate effects with Galaxy Item (Seal). | 150 |
| `0x11D` | 285 | Super Health Recover X | Health constantly recovers. Effect will not be negated. | 151 |
| `0x11E` | 286 | Super Ki Recover I | Ki constantly recovers. Negate effects with Galaxy Item (Seal). | 152 |
| `0x11F` | 287 | Super Ki Recover II | Ki constantly recovers. Negate effects with Galaxy Item (Seal). | 153 |
| `0x120` | 288 | Super Ki Recover III | Ki constantly recovers. Negate effects with Galaxy Item (Seal). | 154 |
| `0x121` | 289 | Super Ki Recover IV | Ki constantly recovers. Negate effects with Galaxy Item (Seal). | 155 |
| `0x122` | 290 | Super Ki Recover V | Ki constantly recovers. Negate effects with Galaxy Item (Seal). | 156 |
| `0x123` | 291 | Super Ki Recover X | Ki constantly recovers. Effect will not be negated. | 157 |
| `0x124` | 292 | Health Auto-Loss I | Health automatically decreases. Negate effects with <br>Galaxy Item (Seal). | 158 |
| `0x125` | 293 | Health Auto-Loss II | Health automatically decreases. Negate effects with <br>Galaxy Item (Seal). | 159 |
| `0x126` | 294 | Health Auto-Loss III | Health automatically decreases. Negate effects with <br>Galaxy Item (Seal). | 15A |
| `0x127` | 295 | Health Auto-Loss IV | Health automatically decreases. Negate effects with <br>Galaxy Item (Seal). | 15B |
| `0x128` | 296 | Health Auto-Loss V | Health automatically decreases. Negate effects with <br>Galaxy Item (Seal). | 15C |
| `0x129` | 297 | Health Auto-Loss X | Health automatically decreases. Effect will not be negated. | 15D |
| `0x12A` | 298 | Ki Auto-Loss I | Ki automatically decreases. Negate effects with Galaxy Item (Seal). | 15E |
| `0x12B` | 299 | Ki Auto-Loss II | Ki automatically decreases. Negate effects with Galaxy Item (Seal). | 15F |
| `0x12C` | 300 | Ki Auto-Loss X | Ki automatically decreases. Effect will not be negated. | 160 |
| `0x12D` | 301 | 1/10 Score I | Battle Score is reduced to 1/10th. Negate effects with<br>Galaxy Item (Seal). | 161 |
| `0x12E` | 302 | 1/10 Score II | Battle Score is reduced to 1/10th. Negate effects with<br>Galaxy Item (Seal). | 162 |
| `0x12F` | 303 | 1/10 Score III | Battle Score is reduced to 1/10th. Negate effects with<br>Galaxy Item (Seal). | 163 |
| `0x130` | 304 | Go To Hell I | Defeat with one blow when Super Attack and Ultimate Attack connects.<br>Negate effects with Galaxy Item (Seal). | 164 |
| `0x131` | 305 | Go To Hell II | Defeat with one blow when Super Attack and Ultimate Attack connects.<br>Negate effects with Galaxy Item (Seal). | 165 |
| `0x132` | 306 | Go To Hell III | Defeat with one blow when Super Attack and Ultimate Attack connects.<br>Negate effects with Galaxy Item (Seal). | 166 |
| `0x133` | 307 | Go To Hell X | Defeat with one blow when Super Attack and Ultimate Attack connects.<br>Effect will not be negated. | 167 |
| `0x134` | 308 | Near Death Start I | Start battle in Near Death. Negate effects with Galaxy Item (Seal). | 168 |
| `0x135` | 309 | Near Death Start II | Start battle in Near Death. Negate effects with Galaxy Item (Seal). | 169 |
| `0x136` | 310 | Near Death Start III | Start battle in Near Death. Negate effects with Galaxy Item (Seal). | 16A |
| `0x137` | 311 | Near Death Start X | Start battle in Near Death. Effect will not be negated. | 16B |
| `0x138` | 312 | 1//10 Super Attack Damage I | Damage taken from Super Attack is reduced to 1/10th. Negate effects<br>with Galaxy Item (Seal). | 16C |
| `0x139` | 313 | 1//10 Super Attack Damage II | Damage taken from Super Attack is reduced to 1/10th. Negate effects<br>with Galaxy Item (Seal). | 16D |
| `0x13A` | 314 | 100% Vanishing I | Use Vanishing at a 100% rate. Negate effects with<br>Galaxy Item (Seal). | 8A 16E |
| `0x13B` | 315 | 100% Vanishing II | Use Vanishing at a 100% rate. Negate effects with<br>Galaxy Item (Seal). | 8A 16F |
| `0x13C` | 316 | Raging Soul Start | Start battle in Raging Soul. Ignore number of Raging Soul uses. | B2 |
| `0x13D` | 317 | CPU Strengthened (Small) with passage of time | CPU Level increases by 1 every 20 seconds. | 174 |
| `0x13E` | 318 | CPU Strengthened (Medium) with passage of time | CPU Level increases by 1 every 10 seconds. | 172 |
| `0x13F` | 319 | CPU Strengthened (Large) with passage of time | CPU Level increases by 1 every 5 seconds. Doesn't exceed Level 30,<br>which is the maximum Level. | 170 |
| `0x140` | 320 | CPU Weakened (Small) with passage of time | CPU Level decreases by 1 every 20 seconds. | 175 |
| `0x141` | 321 | CPU Weakened (Medium) with passage of time | CPU Level decreases by 1 every 10 seconds. | 173 |
| `0x142` | 322 | CPU Weakened (Large) with passage of time | CPU Level decreases by 1 every 5 seconds. Doesn't fall below Level 1,<br>which is the minimum Level. | 171 |
| `0x143` | 323 | Raging Soul when 1 bar of health is remaining | Ignore number of Raging Soul uses when 1 bar of health is remaining. | CC |
| `0x144` | 324 | Raging Soul when 2 bars of health are remaining | Ignore number of Raging Soul uses when 2 bars of health are remaining. | D4 |
| `0x145` | 325 | Raging Soul when 3 bars of health are remaining | Ignore number of Raging Soul uses when 3 bars of health are remaining. | DD |
| `0x146` | 326 | High-Tension when 2 bars of health are remaining | Ignore number of High Tension uses when 2 bars of health are remaining.<br> | D5 |
| `0x147` | 327 | High-Tension when 3 bars of health are remaining | Ignore number of High Tension uses when 3 bars of health are remaining.<br> | DE |
| `0x148` | 328 | CPU strengthened when 1 bar of health is remaining | CPU becomes Level 20 when 1 bar of health is remaining.<br>For CPU. | CD |
| `0x149` | 329 | CPU strengthened when 2 bars of health are remaining | CPU becomes Level 20 when 2 bars of health are remaining. <br>For CPU. | D6 |
| `0x14A` | 330 | CPU strengthened when 3 bars of health are remaining | CPU becomes Level 20 when 3 bars of health are remaining.<br>For CPU. | DF |
| `0x14B` | 331 | CPU greatly strengthened when 1 bar of health is remaining | CPU becomes Level 25 when 1 bar of health is remaining.<br>For CPU. | CE |
| `0x14C` | 332 | CPU greatly strengthened when 2 bars of health are remaining | CPU becomes Level 25 when 2 bars of health are remaining.<br>For CPU. | D7 |
| `0x14D` | 333 | CPU greatly strengthened when 3 bars of health are remaining | CPU becomes Level 25 when 3 bars of health are remaining.<br>For CPU. | E0 |
| `0x14E` | 334 | CPU super strengthened when 1 bar of health is remaining | CPU becomes Level 30 when 1 bar of health is remaining.<br>For CPU. | CF |
| `0x14F` | 335 | CPU super strengthened when 2 bars of health are remaining | CPU becomes Level 30 when 2 bars of health are remaining.<br>For CPU. | D8 |
| `0x150` | 336 | CPU super strengthened when 3 bars of health are remaining | CPU becomes Level 30 when 3 bars of health are remaining.<br>For CPU. | E1 |
| `0x151` | 337 | Transform one step when 1 bar of health is remaining | Automatically transform when 1 bar of health is remaining. No ki<br>consumed when Transforming. | D0 |
| `0x152` | 338 | Transform one step when 2 bars of health are remaining | Automatically transform when 2 bars of health are remaining. No ki<br>consumed when Transforming. | D9 |
| `0x153` | 339 | Transform one step when 3 bars of health are remaining | Automatically transform when 3 bars of health are remaining. No ki<br>consumed when Transforming. | E2 |
| `0x154` | 340 | Transform two steps when 1 bar of health is remaining | Automatically transform 2 steps when 1 bar of health is remaining.<br>Become Super Saiyan 3 when you are a Super Saiyan. | D1 |
| `0x155` | 341 | Transform two steps when 2 bars of health are remaining | Automatically transform when 2 bars of health are remaining. Become<br>Super Saiyan 3 when you are a Super Saiyan. | DA |
| `0x156` | 342 | Transform two steps when 3 bars of health are remaining | Automatically transform when 3 bars of health are remaining. Become<br>Super Saiyan 3 when you are a Super Saiyan. | E3 |
| `0x157` | 343 | Transform three steps when 1 bar of health is remaining | Automatically transform 3 steps when 1 bar of health is remaining.<br>Does not mean Frieza 1st Form will become Final Form. | D2 |
| `0x158` | 344 | Transform three steps when 2 bars of health are remaining | Automatically transform 3 steps when 2 bars of health are remaining.<br>Does not mean Frieza 1st Form will become Final Form. | DB |
| `0x159` | 345 | Transform three steps when 3 bars of health are remaining | Automatically transform 3 steps when 3 bars of health are remaining.<br>Does not mean Frieza 1st Form will become Final Form. | E4 |
| `0x15A` | 346 | Cancel Transformation when 1 bar of health is remaining | Cancel Transformation automatically when 1 bar of health is remaining. | 178 |
| `0x15B` | 347 | Cancel Transformation when 2 bars of health are remaining | Cancel Transformation automatically when 2 bars of health are<br>remaining. | 179 |
| `0x15C` | 348 | Cancel Transformation when 3 bars of health are remaining | Cancel Transformation automatically when 3 bars of health are<br>remaining. | 17A |
| `0x15D` | 349 | Switch Out when 1 bar of health is remaining | Switch Out automatically when 1 bar of health is remaining. | D3 |
| `0x15E` | 350 | Switch Out when 2 bars of health are remaining | Switch Out automatically when 2 bars of health are remaining. | DC |
| `0x15F` | 351 | Switch Out when 3 bars of health are remaining | Switch Out automatically when 3 bars of health are remaining. | E5 |
| `0x160` | 352 | Raging Soul at KO Switching | Become Raging Soul when entering at KO Switching. Ignore number of<br>Raging Soul uses. | E8 |
| `0x161` | 353 | High-Tension at KO Switching | Become High-Tension when entering at KO Switching. Ignore number of<br>Raging Soul uses. | E9 |
| `0x162` | 354 | CPU Evolution at KO Switching | CPU Level rises by 1 after KO Switching. | EA |
| `0x163` | 355 | CPU Great Evolution at KO Switching | CPU Level rises by 2 after KO Switching. | EB |
| `0x164` | 356 | CPU Super Evolution at KO Switching | CPU Level rises by 3 after KO Switching. | EC |
| `0x165` | 357 | Transform 1step at KO Switching | Transform when entering at KO Switching. | ED |
| `0x166` | 358 | Transform 2 steps at KO Switching | Transform 2 steps when entering at KO Switching. | EE |
| `0x167` | 359 | Transform 3 steps at KO Switching | Transform 3 steps when entering at KO Switching. | EF |
| `0x168` | 360 | Cancel Transformation at KO Switching | Cancel Transformation when entering at KO Switching. | F0 |
| `0x169` | 361 | No Transformations | Transformations are prohibited. However, transforming through Item<br>Effects is possible. | 176 |
| `0x16A` | 362 | No Switch Outs | Switch Outs are prohibited. However, switching through Item Effects is<br>possible. | 177 |
| `0x16B` | 363 | No Raging Soul Limit | Ignore number of Raging Soul uses, and activate any number of Raging<br>Souls. | 66 |
| `0x16C` | 364 | Expanded Reserves | Expanded Reserve Items will be explained.  |  |
| `0x16D` | 365 | Expanded Reserves | Expanded Reserve Items will be explained.  |  |
| `0x16E` | 366 | Expanded Reserves | Expanded Reserve Items will be explained.  |  |
| `0x16F` | 367 | Expanded Reserves | Expanded Reserve Items will be explained.  |  |
| `0x170` | 368 | Expanded Reserves | Expanded Reserve Items will be explained.  |  |
| `0x171` | 369 | Expanded Reserves | Expanded Reserve Items will be explained.  |  |
| `0x172` | 370 | Expanded Reserves | Expanded Reserve Items will be explained.  |  |
| `0x173` | 371 | Expanded Reserves | Expanded Reserve Items will be explained.  |  |
| `0x174` | 372 | Expanded Reserves | Expanded Reserve Items will be explained.  |  |
| `0x175` | 373 | Expanded Reserves | Expanded Reserve Items will be explained.  |  |
| `0x176` | 374 | Expanded Reserves | Expanded Reserve Items will be explained.  |  |
| `0x177` | 375 | Expanded Reserves | Expanded Reserve Items will be explained.  |  |
| `0x178` | 376 | Expanded Reserves | Expanded Reserve Items will be explained.  |  |
| `0x179` | 377 | Expanded Reserves | Expanded Reserve Items will be explained.  |  |
| `0x17A` | 378 | Expanded Reserves | Expanded Reserve Items will be explained.  |  |
| `0x17B` | 379 | Expanded Reserves | Expanded Reserve Items will be explained.  |  |
| `0x17C` | 380 | Expanded Reserves | Expanded Reserve Items will be explained.  |  |
