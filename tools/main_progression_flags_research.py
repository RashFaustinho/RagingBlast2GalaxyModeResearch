#!/usr/bin/env python3
"""Read-only proof of MAIN progression query masks, availability writer and clear-history path."""
import argparse, hashlib, json, struct
from pathlib import Path
from elf_evidence import EXPECTED, load_segments, bytes_at

def main():
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument('--elf',type=Path,required=True)
    a=p.parse_args()
    from capstone import Cs, CS_ARCH_PPC, CS_MODE_64, CS_MODE_BIG_ENDIAN
    raw=a.elf.read_bytes()
    assert hashlib.sha256(raw).hexdigest()==EXPECTED,'Unsupported executable'
    segments=load_segments(raw)
    decoder=Cs(CS_ARCH_PPC,CS_MODE_64|CS_MODE_BIG_ENDIAN)
    decoder.skipdata=True
    def code(start,end):return [(pc,m,o)for pc,n,m,o in decoder.disasm_lite(bytes_at(raw,segments,start,end)[1],start)]
    def u32(pc):return struct.unpack('>I',bytes_at(raw,segments,pc,pc+4)[1])[0]
    # Constructor installs these callbacks into the generic query dispatcher.
    assert u32(u32(0x6e8d90+0x1a08))==0x2f41f0
    assert u32(u32(0x6e8d90+0x1a0c))==0x2f4afc
    checks={
        0x2f4200:('rlwinm','r3, r3, 0, 0x1c, 0x1c'),
        0x2f4b0c:('rlwinm','r3, r3, 0, 0x1e, 0x1e'),
        0x2f45a4:('bl','0x2f5848'), # reveal +30 expression
        0x2f4614:('lwz','r9, 0x34(r29)'),
        0x2f4650:('bl','0x2f3884'), # OR-query eligibility list
        0x2f4670:('bl','0x2f5848'), # availability +34 expression
        0x2f4694:('ori','r0, r0, 0x16'), # marks availability bit2 and map-change flags
        0x1eea18:('ori','r9, r9, 8'), # clear-history latch
        0x1eea24:('stb','r9, 0(r3)'),
        0x1e6b64:('bl','0x1ee9f8'),
        0x1cf268:('lwz','r0, 0(r9)'), # tutorial saved completion word
        0x1cf26c:('clrlwi','r0, r0, 0x1f'),
        0x1cf298:('ori','r0, r0, 8'),
    }
    for pc,want in checks.items():assert code(pc,pc+4)[0][1:]==want,(hex(pc),code(pc,pc+4),want)
    ranges={
        'callback_installation':(0x2f49c4,0x2f49ec),
        'query2_clear_history':(0x2f41f0,0x2f420c),
        'query3_availability':(0x2f4afc,0x2f4b18),
        'availability_from_or_list_and_expression':(0x2f45ec,0x2f46a4),
        'galaxy_clear_history_latch':(0x1ee9f8,0x1eea2c),
        'galaxy_caller':(0x1e6b50,0x1e6b70),
        'tutorial_saved_clear_import':(0x1cf22c,0x1cf2bc),
    }
    print(json.dumps({
        'source_elf_sha256':EXPECTED,
        'scope':'Static MAIN code analysis. These callback meanings are not asserted for arbitrary other contexts. No new gameplay test or executable modification.',
        'instruction_checks':len(checks),
        'query2':{'meaning':'The specified mission has been cleared','mask':'0x08','true_value':8,'false_value':0},
        'query3':{'meaning':'The specified mission is unlocked / available','mask':'0x02','true_value':2,'false_value':0,'distinct_from':'Reveal/visibility bit 0x20 and prior victory'},
        'editing':'Use query2 for a cleared-predecessor gate. Query3 can be true before first victory. These query results are masked integers, not normalized booleans: do not compare them with literal 1.',
        'disassembly':{name:[f'{pc:08X}: {m} {o}'for pc,m,o in code(*span)]for name,span in ranges.items()},
    },indent=2))

if __name__=='__main__':main()
