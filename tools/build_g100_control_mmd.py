#!/usr/bin/env python3
"""Reproduce the G100 diagnostic MMD from the exact original European galaxy.mmd.

Keeps 498 original roots and 66 original world icons, adds 34 one-action Galaxies
for empty native/form owners, and links the new world chain through original icon53.
Needs the matching G100 research executable/save. Does not patch AFS or EBOOT.
Read-only by default; --output creates a new MMD, never overwrites an input.
"""
import argparse
import hashlib
import json
import math
from pathlib import Path
import struct

from mmd_edit_research import Document
from mmd_graph_research import inspect_graph

SOURCE_SHA256 = "c0a12c58b22cb4b2884bcfe8c550a1f5a25f60c192986c6f1fd9bd3eccb155a7"
OUTPUT_SHA256 = "09c8724f5f6d0d6903410f01aacd8e0477d8b1029a5ba183b71920825c019ebf"


def build(source):
    if hashlib.sha256(source).hexdigest() != SOURCE_SHA256:
        raise ValueError("Expected the exact original European galaxy.mmd")
    d = Document(source)
    rootref,edgeref,iconref,ownerref=struct.unpack_from('>4I',d.header,16)
    roots,edges,icons,owners=[d.body(r)for r in(rootref,edgeref,iconref,ownerref)]
    occupied=[struct.unpack_from('>H',icons,i*28+12)[0]for i in range(66)]
    empty=[i for i in range(100)if i not in occupied];assert len(empty)==34
    newroots=[];newicons=[];newowners=bytearray(owners)
    aux=struct.unpack_from('>I',owners)[0];metadata=[]
    for n,owner in enumerate(empty):
     node=498+n;index=66+n
     assert struct.unpack_from('>I',owners,owner*12+4)[0]==0
     root=bytearray(roots[238*92:239*92]);struct.pack_into('>2f',root,0,0,0)
     struct.pack_into('>HHHHH',root,8,8,2,20,2,29)
     for offset in [0x20,0x24,0x2c,0x30,0x34,0x38,0x40,0x44,0x48,0x4c,0x50,0x54]:struct.pack_into('>I',root,offset,0)
     struct.pack_into('>HHI',root,0x12,0,0,0)
     task=d.append(struct.pack('>III',1,0xffffffff,0),1,12);struct.pack_into('>I',root,0x3c,task)
     newroots.append(root)
     lst=d.append(struct.pack('>HH',node,0),1,4);struct.pack_into('>IIHH',newowners,owner*12,aux,lst,node,0)
     icon=bytearray(icons[53*28:54*28]);ang=n*2*math.pi/34
     struct.pack_into('>3f',icon,0,5*math.cos(ang),-2+4*(n/33),5*math.sin(ang));struct.pack_into('>H',icon,12,owner)
     previous=index-1 if n else 53;following=index+1 if n<33 else 53
     neighbors=d.append(struct.pack('>4I',0,previous,0,following),2,8);struct.pack_into('>I',icon,24,neighbors)
     newicons.append(icon);metadata.append(dict(owner=owner,node=node,worldIndex=index))
    d.replace_unique(rootref,roots+b''.join(newroots),532)
    d.replace_unique(iconref,icons+b''.join(newicons),100);d.replace_unique(ownerref,newowners)
    # Add an outgoing world edge from an original icon to the new chain; keep old edges.
    updated=bytearray(d.body(iconref));oldref=struct.unpack_from('>I',updated,53*28+24)[0]
    b=d.body(oldref);ref=d.append(b+struct.pack('>II',0,66),len(b)//8+1,8);struct.pack_into('>I',updated,53*28+24,ref);d.replace_unique(iconref,updated)
    mmd=d.encode();graph=inspect_graph(mmd);assert graph['consistent'],graph
    if hashlib.sha256(mmd).hexdigest() != OUTPUT_SHA256:
        raise ValueError("Diagnostic MMD reproduction hash differs")
    return mmd, metadata, graph


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("mmd", type=Path)
    parser.add_argument("--output", type=Path)
    args = parser.parse_args()
    try:
        output, added, graph = build(args.mmd.read_bytes())
        if args.output:
            with args.output.open("xb") as file:
                file.write(output)
        print(json.dumps({"sha256": hashlib.sha256(output).hexdigest(),
                          "addedGalaxies": added,
                          "graphConsistent": graph["consistent"],
                          "written": args.output is not None,
                          "researchOnly": True}, indent=2))
    except (OSError, ValueError, KeyError) as error:
        parser.error(str(error))


if __name__ == "__main__":
    main()
