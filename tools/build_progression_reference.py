from pathlib import Path
import sys,json,struct,collections,hashlib
sys.path.insert(0,str(Path(__file__).resolve().parent))
from mmd_edit_research import Document
import argparse
parser=argparse.ArgumentParser(description="Build original BLES00978 reward namespaces for the offline editor.")
parser.add_argument('--galaxy',type=Path,required=True)
parser.add_argument('--character-groups',type=Path,required=True,help='Original cs_form.dat, 66 raw 36-byte rows')
args=parser.parse_args()
R=Path(__file__).resolve().parents[1]
D=Document(args.galaxy.read_bytes());roots=D.body(int.from_bytes(D.header[16:20],'big'));icons=D.body(int.from_bytes(D.header[24:28],'big'))
assert hashlib.sha256(args.galaxy.read_bytes()).hexdigest()=='c0a12c58b22cb4b2884bcfe8c550a1f5a25f60c192986c6f1fd9bd3eccb155a7'
assert len(args.character_groups.read_bytes())==66*36
rewards=[]
for node in range(D.descriptors[int.from_bytes(D.header[16:20],'big')][0]):
 ref=struct.unpack_from('>I',roots,node*92+44)[0]
 if ref:
  for kind,i,expr in struct.iter_unpack('>HHI',D.body(ref)):rewards.append(dict(node=node,kind=kind,id=i,condition=expr,expression=D.body(expr).hex()if expr else''))
raw496=roots[496*92:497*92]
info={k:int.from_bytes(raw496[o:o+n],'big')for k,o,n in [('rule1',18,2),('rule2',20,2),('modifiers',76,4),('ui50',80,4),('ui54',84,4)]}
for k in ['modifiers','ui50','ui54']:info[k]=list(x[0]for x in struct.iter_unpack('>H',D.body(info[k])))if info[k]else[]
kinds=[(0,'Super move unlock','native × 100 + local move selector','Unlocks a move for the encoded native character/form.'),(1,'Ability item','item array index','Unlocks an equipment item in inventory; it does not equip it on a fighter.'),(2,'Costume unlock','native × 100 + costume index','Unlocks a costume entry for the encoded character.'),(3,'BGM unlock','music index','Unlocks a track in the collection.'),(4,'Galaxy transformation form','native character/form ID','Unlocks this native form for use in Galaxy Mode. It does not itself transform an enemy preset.'),(5,'Limit Points increase','amount','Increases the current character’s maximum Limit Points; the number is an amount.'),(6,'Stage unlock','stage index','Uses the stage-unlock bitset. No kind-6 record occurs in the original Galaxy mission rewards.'),(7,'Dragon Ball','original value 0','Requests the Dragon Ball reward path; additional game/save conditions also apply.'),(8,'Museum picture','picture collection index','Unlocks a Museum picture. These IDs are not equipment indices.'),(9,'Galaxy / character unlock','native base-character ID','Sets the character-availability flag used by Galaxy selection. Existing saves can already have it set.'),(10,'Enhanced character','character-select group index (cs_form.dat)','Unlocks the corresponding enhanced-character group. The ID is neither a native ID nor a Galaxy world-icon index.')]
reference={'kinds':[dict(id=i,name=n,encoding=e,help=h,originalCount=sum(x['kind']==i for x in rewards))for i,n,e,h in kinds],'originalRewardIds':{str(i):sorted(set(x['id']for x in rewards if x['kind']==i))for i,*_ in kinds},'originalUnlockSources':[x for x in rewards if x['kind']in [4,9,10]],'galaxyIcons':[{'index':i,'native':struct.unpack_from('>H',icons,i*28+12)[0]}for i in range(len(icons)//28)],'enhancedCharacters':[{'index':i,'native':struct.unpack_from('>I',args.character_groups.read_bytes(),i*36+4)[0]}for i in range(66)],'mission496':info,'evidence':{'reward_dispatch':'0x1EA228..0x1EA788; table0x1EA388, condition call0x2F4B98','item_inventory':'kind1: save+0x20+0x5AA0','form_unlock':'kind4: per-native0xE8-byte row, bit0x01000000','galaxy_unlock':'kind9: same native row, bit1 (LSB)','enhanced_unlock':'kind10: bitset at character-section+0x5B60','modifier_packet':'root+4C ->0x1EDD28..0x1EDDB0 -> config+A00 bitmap via0x1CDC1C','ui_lists':'root+50/+54 -> separate UI routines0x1E72xx/0x1E73xx','original_text':'progress AFS1903/T_Get_US.pak: GET009..015,026..030,147..148'},'limits':'Static file/code/text analysis; no new in-game test. No per-entry side flag exists in the 2-byte mission modifier list; The original Galaxy merge at12C83C applies this bitmap to team0/player candidates only; enemy bonuses belong in preset Strength. See PROGRESSION_AND_MODIFIERS_EN.md and the later runtime control notes.'}
# Assert the user's original example and name/namespace distinctions.
assert info['rule1']==10 and info['modifiers']==[296] and info['ui50']==[296]
assert len(reference['galaxyIcons'])==66
(R/'research/studio-v02').mkdir(exist_ok=True)
(R/'research/studio-v02/PROGRESSION_REFERENCE.json').write_text(json.dumps(reference,indent=2)+'\n')
(R/'editor/js/progression-data.js').write_text('/* Original BLES00978 file/code/text research. See docs/PROGRESSION_AND_MODIFIERS_EN.md. */\nglobalThis.RB2=globalThis.RB2||{};\nRB2.PROGRESSION='+json.dumps(reference,separators=(',',':'))+';\n')
print(json.dumps({'rewardKinds':len(kinds),'originalRewardRecords':len(rewards),'enhancedCharacterGroups':66,'mission496':info},indent=2))
