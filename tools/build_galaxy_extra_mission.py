#!/usr/bin/env python3
"""Insert one Ascend objective in Kid Buu's original Galaxy, without EBOOT edits.

Requires the exact original BLES00978 galaxy.mmd inside an extracted ZPAK.
Unlike the historical ADV18E runtime fixture, this clean insertion preserves
all original mission roots. It is structurally validated, not separately
claimed as a played-through archive revision. No boot changes are needed
unless --ally-preset selects a newly appended preset from a modified boot.
Outputs a new folder; never overwrites inputs or a pre-existing output folder.
"""
import argparse
import json
import struct
from pathlib import Path
from mmd_edit_research import Document
from mmd_graph_research import inspect_graph
from build_kid_buu_mod import member_body, resize_stpk, recompress_resized
import zpak_research as z

ORIGINAL_MMD_SHA = 'c0a12c58b22cb4b2884bcfe8c550a1f5a25f60c192986c6f1fd9bd3eccb155a7'


def build(container, ally_preset=None):
    if ally_preset is not None and not 0 <= ally_preset < 65535:
        raise ValueError('Expected a valid 16-bit preset index')
    pak, layout = z.read_container(container)
    original = member_body(pak,'galaxy.mmd')
    if z.sha(original) != ORIGINAL_MMD_SHA:
        raise ValueError('Expected original BLES00978 galaxy.mmd; do not stack onto another mod')
    d = Document(original)
    rootref, edgeref = struct.unpack_from('>II',d.header,16)
    ownerref = struct.unpack_from('>I',d.header,28)[0]
    roots = bytearray(d.body(rootref))
    new_id = d.descriptors[rootref][0]
    new_edge = d.descriptors[edgeref][0]
    assert (new_id,new_edge)==(498,515)
    root = bytearray(roots[238*92:239*92])
    struct.pack_into('>2f',root,0,64.0,18.5)
    struct.pack_into('>H',root,8,8)  # Supreme Kai's World
    struct.pack_into('>H',root,10,2)  # Perfect Action category
    struct.pack_into('>H',root,16,29) # Complete all Perfect Actions
    struct.pack_into('>I',root,0x2c,0) # No cloned rewards
    edge_list = d.append(struct.pack('>4H',493,0,new_edge,0),2,4)
    struct.pack_into('>I',root,0x20,edge_list)
    if ally_preset is not None:
        roster = d.append(struct.pack('>HHI',ally_preset,0,0),1,8)
        group = d.append(struct.pack('>II',0,roster),1,8)
        struct.pack_into('>I',root,0x24,group)
    actions = d.append(struct.pack('>III',1,0xffffffff,0),1,12)
    struct.pack_into('>I',root,0x3c,actions)
    # Redirect the node489 end of edge493 to a new edge, preserving its degree.
    ref = struct.unpack_from('>I',roots,489*92+0x20)[0]
    incidents = bytearray(d.body(ref))
    found = 0
    for pos in range(0,len(incidents),4):
        if struct.unpack_from('>H',incidents,pos)[0]==493:
            struct.pack_into('>H',incidents,pos,new_edge);found+=1
    assert found==1
    d.replace_unique(ref,incidents)
    edges = bytearray(d.body(edgeref))
    assert struct.unpack_from('>4H',edges,493*8)==(489,0,117,0)
    struct.pack_into('>4H',edges,493*8,new_id,0,117,0)
    edges.extend(struct.pack('>4H',489,0,new_id,0))
    d.replace_unique(edgeref,edges,new_edge+1)
    roots.extend(root);d.replace_unique(rootref,roots,new_id+1)
    owner_list = struct.unpack_from('>I',d.body(ownerref),66*12+4)[0]
    n,size,_ = d.descriptors[owner_list];assert size==4 and n==9
    d.replace_unique(owner_list,d.body(owner_list)+struct.pack('>HH',new_id,0),n+1)
    mmd = d.encode()
    graph = inspect_graph(mmd)
    assert graph['consistent'],graph
    # Every original root is unchanged: only its separate graph list may differ.
    assert Document(mmd).body(rootref)[:498*92]==Document(original).body(rootref)
    output = recompress_resized(resize_stpk(pak,'galaxy.mmd',mmd),layout)
    assert member_body(z.read_container(output)[0],'galaxy.mmd')==mmd
    return mmd,output,dict(original_mmd_sha256=z.sha(original),mmd_sha256=z.sha(mmd),
                          galaxy_sha256=z.sha(output),graph=graph,ally_preset=ally_preset,
                          objective_type=29,action_id=1,modified_original_roots=0,
                          runtime_status='Clean builder output: not separately played through')


if __name__=='__main__':
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument('galaxy_zpak',type=Path)
    p.add_argument('--ally-preset',type=int)
    p.add_argument('--output',type=Path,required=True)
    args=p.parse_args()
    if args.output.exists():p.error('Output path already exists')
    mmd,zpak,report=build(args.galaxy_zpak.read_bytes(),args.ally_preset)
    args.output.mkdir(parents=True)
    (args.output/'galaxy.mmd').write_bytes(mmd)
    (args.output/'galaxy.zpak').write_bytes(zpak)
    (args.output/'manifest.json').write_text(json.dumps(report,indent=2)+'\n')
    print(json.dumps(report,indent=2))
