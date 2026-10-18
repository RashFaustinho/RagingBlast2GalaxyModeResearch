#!/usr/bin/env python3
"""Read-only evidence for stock ZONE arena, reward queries and secret-route routing.
Needs capstone==5.0.7. Never runs or patches the executable or game files.
"""
import argparse, hashlib, json, struct
from pathlib import Path
from collections import Counter
from elf_evidence import EXPECTED, load_segments, bytes_at
from mmd_edit_research import Document
from mmd_condition_research import expression, format_expression

def main():
    p=argparse.ArgumentParser(description=__doc__);p.add_argument('--elf',type=Path,required=True);p.add_argument('--zones',type=Path,required=True);a=p.parse_args()
    from capstone import Cs,CS_ARCH_PPC,CS_MODE_64,CS_MODE_BIG_ENDIAN
    raw=a.elf.read_bytes();assert hashlib.sha256(raw).hexdigest()==EXPECTED,'Unsupported executable';segments=load_segments(raw)
    dec=Cs(CS_ARCH_PPC,CS_MODE_64|CS_MODE_BIG_ENDIAN);dec.skipdata=True
    assert struct.unpack('>f',bytes_at(raw,segments,0x6e8d90+0x19ec,0x6e8d90+0x19f0)[1])[0]==100.0, 'Health-percent scale differs'
    checks={0x271714:('lwz','r4, 0x1c(r3)'),0x271720:('bl','0x26cea0'),0x2f3e6c:('lwz','r3, 0x60(r9)'),0x2f3e3c:('lwz','r3, 0x64(r9)'),0x2f3e0c:('lwz','r3, 0x68(r9)'),0x2f3fd4:('bl','0x1224bc'),0xf03b0:('stw','r0, 0x2c(r7)'),0xf03d4:('stw','r0, 0x30(r7)'),0x26fa90:('bl','0x26f8c8'),0x2767b0:('bl','0x26fa18'),0x2767b4:('stw','r3, 0x668(r31)'),0x272b58:('bl','0x2f5848')}
    for addr,want in checks.items():
        got=next(dec.disasm_lite(bytes_at(raw,segments,addr,addr+4)[1],addr));assert(got[2],got[3])==want,(hex(addr),got,want)
    ranges={'arena_setup':(0x271700,0x2717e4),'arena_converter':(0x26cea0,0x26cecc),'statistic_dispatch':(0x2f3b34,0x2f3b8c),'statistic_getters':(0x2f3ce0,0x2f3ff8),'result_statistic_collector':(0xf01e0,0xf0504),'secret_requirement':(0x26f8c8,0x26fa18),'secret_latch':(0x26fa18,0x26fac8),'latch_consumer':(0x27678c,0x2767b8),'route_selection':(0x271ed0,0x2720f0),'reward_condition_consumer':(0x272b30,0x272bf4)}
    dis={name:[f'{pc:08X}: {m} {o}'.rstrip()for pc,n,m,o in dec.disasm_lite(bytes_at(raw,segments,start,end)[1],start)]for name,(start,end)in ranges.items()}
    rows=[]
    for file in sorted(a.zones.glob('zone_*.mmd')):
        b=file.read_bytes();d=Document(b);root=struct.unpack_from('>I',b,16)[0];roots=d.body(root);arenas=[];gates=[];rewards=[]
        for i in range(d.descriptors[root][0]):
            r=struct.unpack_from('>14I',roots,i*56);arenas.append(r[7]);gate=r[12]
            if gate:gates.append({'node':i,'expression':format_expression(expression(d.body(gate)))})
            if r[11]:
                body=d.body(r[11])
                for j in range(0,len(body),8):
                    kind,target,ref=struct.unpack_from('>HHI',body,j);rewards.append({'node':i,'kind':kind,'target':target,'condition':format_expression(expression(d.body(ref)))if ref else 'Always'})
        rows.append({'file':file.name,'sha256':hashlib.sha256(b).hexdigest(),'arenas':arenas,'stored_conditions':gates,'rewards':rewards})
    assert len(rows)==16 and sum(len(r['arenas'])for r in rows)==128
    print(json.dumps({'source_elf_sha256':EXPECTED,'instruction_checks':len(checks),'scope':'Static original-code analysis and original ZONE parsing. Does not claim every secret route was played. Flag11/12/13 names are independently established by zone_outcome_flags_research.py.','findings':{'arena_field':'+1C read by setup; originals vary by fight','reward_query_1_14':'Remaining health percentage; native getter scales team-health ratio to integer percent','query_1_3':'Maximum combo hit count','query_1_11_12_13':'11=Win with Super Attack;12=Win with Ultimate Attack;13=Win while in Raging Soul. See separate outcome evidence for label cross-checks.','routing':'Ordinary forks use +34 destinations; secret destinations additionally follow native per-zone requirements and a latched result. The traced native secret check does not evaluate root+30. Rewards are evaluated separately at272B58.'},'zones':rows,'disassembly':dis},indent=2))
if __name__=='__main__':main()
