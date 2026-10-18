#!/usr/bin/env python3
"""Replace a member in a NEW archive copy, including member growth.

Supported supplied AFS/STPK/STPZ layouts only. Other member bodies are checked
byte-for-byte. This validates packing, not gameplay. Uses standard Python only.
"""
import argparse
import json
from pathlib import Path
import zpak_research as z
from build_kid_buu_mod import resize_stpk, recompress_resized, replace_afs_copy

def main():
    p=argparse.ArgumentParser(description=__doc__)
    sub=p.add_subparsers(dest='kind',required=True)
    for kind in ['pak','afs']:
        q=sub.add_parser(kind)
        q.add_argument('archive',type=Path)
        q.add_argument('--replacement',type=Path,required=True)
        q.add_argument('--output',type=Path,required=True)
        if kind=='pak':q.add_argument('--member',required=True)
        else:q.add_argument('--index',type=int,required=True)
    a=p.parse_args()
    if a.output.exists() or a.output.resolve() in (a.archive.resolve(),a.replacement.resolve()):
        p.error('Choose a NEW output filename; inputs are never overwritten')
    original=a.archive.read_bytes();replacement=a.replacement.read_bytes()
    if not replacement:p.error('Replacement is empty')
    if a.kind=='pak':
        pak,layout=z.read_container(original)
        changed=resize_stpk(pak,a.member,replacement)
        out=recompress_resized(changed,layout) if layout else changed
        if z.read_container(out)[0]!=changed:raise ValueError('Compression roundtrip failed')
        report={'member':a.member,'before_sha256':z.sha(original),'after_sha256':z.sha(out),
                'validation':'Other member bodies unchanged; replacement and compression roundtrip verified'}
    else:
        out,report=replace_afs_copy(original,a.index,replacement)
    with a.output.open('xb') as f:f.write(out)
    print(json.dumps(report,indent=2))
if __name__=='__main__':main()
