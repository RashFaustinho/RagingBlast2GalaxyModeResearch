#!/usr/bin/env python3
"""Read-only prototype audit; Python 3 standard library only.

Reads originals directly from the uploaded progress AFS, not builder manifests.
Writes only TEST_AUDIT.json. Does not launch RPCS3 or touch game/save inputs.
"""
import argparse, hashlib, json, struct
from pathlib import Path


def sha(b): return hashlib.sha256(b).hexdigest()
def u32(b, p=0): return struct.unpack_from('>I', b, p)[0]


def afs_member(path, index):
    with path.open('rb') as f:
        h=f.read(8); assert h[:4]==b'AFS\0'
        assert index<struct.unpack_from('<I', h, 4)[0]
        f.seek(8+8*index); off,size=struct.unpack('<II',f.read(8))
        f.seek(off); b=f.read(size); assert len(b)==size
        return b


def container(b):
    if b[:4]==b'STPK': return b
    assert b[:4]==b'STPZ' and b[16:20]==b'0DCS'
    n,total,_=struct.unpack_from('<III',b,20)
    assert total+16==len(b) and n<128*1024*1024
    p=32; out=bytearray()
    while p<len(b):
        assert b[p:p+4]==b'0LCS'
        expected,size,_=struct.unpack_from('<III',b,p+4)
        assert 16<=size<=len(b)-p
        c=b[p+16:p+size]; i=0; decoded=bytearray()
        while i<len(c):
            t=c[i]; i+=1; count=t>>1
            assert count and len(decoded)+count<=expected
            if t&1:
                distance=c[i];i+=1;assert 0<distance<=len(decoded)
                for _ in range(count): decoded.append(decoded[-distance])
            else:
                assert i+count<=len(c)
                decoded.extend(c[i:i+count]);i+=count
        assert len(decoded)==expected
        out.extend(decoded);p+=size
    assert len(out)==n
    return bytes(out)


def members(b):
    assert b[:4]==b'STPK'
    count=u32(b,8);assert 16+48*count<=len(b)
    result=[]
    for i in range(count):
        entry=b[16+48*i:64+48*i]
        off,size=struct.unpack_from('>II',entry)
        name=entry[16:48].split(b'\0')[0].decode('ascii')
        assert off>=16+48*count and off+size<=len(b)
        result.append((name,b[off:off+size],entry[8:]))
    assert len({r[0]for r in result})==count
    return result


def member(b,name):
    return next(r[1]for r in members(b)if r[0]==name)


class Mmd:
    def __init__(self,b):
        self.b=b;self.magic=b[:4];self.header=36 if self.magic==b'MAIN' else 20
        assert self.magic in (b'MAIN',b'ZONE')
        version,ts,ps=struct.unpack_from('>III',b,4)
        assert version==(0x60000 if self.magic==b'MAIN'else 0x10000)
        assert ts%8==0 and self.header+ts+ps==len(b)
        self.desc=[struct.unpack_from('>HHI',b,self.header+p)for p in range(0,ts,8)]
        self.payload=b[self.header+ts:]
        assert all(off+n*stride<=ps for n,stride,off in self.desc)
    def ref(self,p): return u32(self.b,p)
    def body(self,i):
        n,stride,off=self.desc[i];return self.payload[off:off+n*stride]
    def header_body(self,p): return self.body(self.ref(p))
    def rows(self,p):
        ref=self.ref(p);_,s,_=self.desc[ref];b=self.body(ref)
        return [b[i:i+s]for i in range(0,len(b),s)]
    def links(self,i):
        ref=u32(self.rows(16)[i],52)
        return [v[0]for v in struct.iter_unpack('>I',self.body(ref))]if ref else []


def main():
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument('--progress-afs',type=Path,default=Path('/workspace/research-rb2/rpcs3-cloud/uploaded/Dragon Ball Raging Blast 2 EUR/PS3_GAME/USRDIR/data/PS3/st_pack_progress_pt_ps3.afs'))
    p.add_argument('--probes',type=Path,default=Path('/workspace/research-rb2/expansion-20261015'))
    p.add_argument('--original-elf',type=Path,default=Path('/workspace/research-rb2/rpcs3-cloud/decrypt-check/EBOOT.elf'))
    p.add_argument('--output',type=Path,default=Path(__file__).with_name('TEST_AUDIT.json'))
    a=p.parse_args();checks=[]
    def check(name,value,**detail):
        checks.append(dict(check=name,passed=bool(value),**detail))
        if not value: raise AssertionError(name)
    elf=a.original_elf.read_bytes()
    check('original_executable_identity',sha(elf)=='8e2b454ca5959476a5869d0ab9e652123a019d72791f61ab37f7dd9936b2b892')
    assert elf[:6]==b'\x7fELF\x02\x02'
    phoff=struct.unpack_from('>Q',elf,32)[0];phsize,phcount=struct.unpack_from('>HH',elf,54)
    segments=[struct.unpack_from('>IIQQQQQQ',elf,phoff+i*phsize)for i in range(phcount)]
    def code_at(va):
        for typ,flags,off,vaddr,_,size,_,_ in segments:
            if typ==1 and vaddr<=va< vaddr+size:
                return elf[off+va-vaddr:off+va-vaddr+4].hex()
        raise ValueError('Unmapped original executable address')
    for name,va,word in [('mission_save_count500',0x1D2FDC,'380001f4'),('icon_save_count66',0x319104,'39200042'),('battle_bitmap16_words',0x1CDA20,'39200010'),('owner_compare99',0x1F0AB8,'2b840063')]:
        check('original_code_'+name,code_at(va)==word,address=hex(va),instruction_hex=word)
    original_container=container(afs_member(a.progress_afs,872))
    orig=member(original_container,'galaxy.mmd');gx=(a.probes/'galaxy-static/GX19A/galaxy.mmd').read_bytes()
    g,o=Mmd(gx),Mmd(orig)
    check('original_galaxy_identity',sha(orig)=='c0a12c58b22cb4b2884bcfe8c550a1f5a25f60c192986c6f1fd9bd3eccb155a7',sha256=sha(orig))
    for label,off,old,new in [('roots',16,498,500),('edges',20,515,516),('icons',24,66,67),('owners',28,100,100)]:
        check('galaxy_'+label+'_counts',len(o.rows(off))==old and len(g.rows(off))==new,original=old,modified=new)
        if label!='owners':check('original_'+label+'_preserved',g.rows(off)[:old]==o.rows(off),records=old)
    changed=[i for i,(x,y)in enumerate(zip(o.rows(28),g.rows(28)))if x!=y]
    check('exactly_owner3_changed',changed==[3],changed_owner_indices=changed,preserved_rows=99)
    check('original_owner3_empty',o.rows(28)[3]==struct.pack('>IIHH',0,0,65535,0))
    aux,ref,start,_=struct.unpack('>IIHH',g.rows(28)[3]);owner_nodes=[v[0]for v in struct.iter_unpack('>HH',g.body(ref))]
    check('new_owner_two_nodes',owner_nodes==[498,499] and start==498,nodes=owner_nodes,start=start)
    check('new_edge_connects_new_nodes',struct.unpack('>4H',g.rows(20)[515])==(498,0,499,0))
    changed_refs={o.ref(off)for off in [16,20,24,28]}
    unchanged=sum(o.body(i)==g.body(i)for i in range(len(o.desc))if i not in changed_refs)
    check('all_other_original_descriptor_bodies_preserved',unchanged==len(o.desc)-4,descriptor_bodies=unchanged)
    gxpak=container((a.probes/'galaxy-static/GX19A/galaxy.zpak').read_bytes())
    check('galaxy_container_matches_mmd',member(gxpak,'galaxy.mmd')==gx)
    check('tutorial_member_preserved',member(gxpak,'tutorial.mmd')==member(original_container,'tutorial.mmd'))
    tasks=[]
    for i in [498,499]:
        row=g.rows(16)[i];r=u32(row,60);task=struct.unpack('>III',g.body(r));tasks.append(task[0])
        check('node'+str(i)+'_objective29',struct.unpack_from('>H',row,16)[0]==29)
    check('new_mission_actions',tasks==[1,2],action_ids=tasks)
    original_zone=member(container(afs_member(a.progress_afs,8)),'battle_zone_param_m.pak')
    check('original_zone_identity',sha(original_zone)=='aed2649abc60ab6cb271cca9c0313551c81c16c4821262954c013a183c2286fa',sha256=sha(original_zone))
    zonepath=a.probes/'zone-static'
    standalone=(zonepath/'battle_zone_param_m-appended.pak').read_bytes()
    combined=(zonepath/'battle_zone_param_m-combined.pak').read_bytes()
    original_entries=members(original_zone);solo_entries=members(standalone);combined_entries=members(combined)
    check('zone_archive_counts',len(original_entries)==17 and len(solo_entries)==18 and len(combined_entries)==18,original=17,standalone=18,combined=18)
    check('standalone_preserves_all_original_members',solo_entries[:17]==original_entries,preserved_members=17)
    check('combined_preserves_other_original_members',combined_entries[1:17]==original_entries[1:],preserved_members=16)
    candidate=member(standalone,'zone_research_additive.mmd')
    check('standalone_candidate_matches_file',candidate==(zonepath/'zone_research_additive.mmd').read_bytes())
    check('combined_keeps_standalone_candidate',member(combined,'zone_research_additive.mmd')==candidate)
    c=Mmd(candidate);check('standalone_has_two_new_battles',len(c.rows(16))==2 and c.links(0)==[1]and c.links(1)==[])
    og=Mmd(member(original_zone,'zone_green_square.mmd'))
    branchbytes=member(combined,'zone_green_square.mmd');branch=Mmd(branchbytes)
    check('combined_branch_matches_mmd',branchbytes==(zonepath/'zone_green_square-plus-two.mmd').read_bytes())
    check('branch_root_counts',len(og.rows(16))==4 and len(branch.rows(16))==6,original=4,modified=6)
    check('branch_original_roots1_to3_preserved',branch.rows(16)[1:4]==og.rows(16)[1:4])
    check('branch_root0_only_next_reference_changed',branch.rows(16)[0][:52]==og.rows(16)[0][:52]and branch.rows(16)[0][52:]!=og.rows(16)[0][52:])
    check('branch_routes',branch.links(0)==[1,4]and branch.links(4)==[5]and branch.links(5)==[3],new_route=[0,4,5,3])
    cells=[]
    for i,row in enumerate(branch.rows(16)):
        x,y=struct.unpack_from('>ff',row);cell=int(x)+1+3*(6-int(y));cells.append(cell)
        check('branch_node'+str(i)+'_grid_coordinate',x in [-1,0,1]and y in range(7)and 0<=cell<21,x=x,y=y,cell=cell)
    check('branch_save_cells_distinct',len(set(cells))==6,cells=cells)
    bounds={
        'galaxy_mission_count':len(g.rows(16)),'galaxy_mission_limit':500,
        'all_new_mission_indices_fit_savedata':max(owner_nodes)<500,
        'original_executable_launch_bitmap_fits':len(g.rows(16))<=512,
        'icon_count':len(g.rows(24)),'independent_icon_save_records':66,
        'new_icon_independent_save_storage':False,
        'new_icon66_alias_save_offset':'0xBF30',
        'new_icon66_aliases':'Global last-selected native and following flags, not an independent Galaxy aggregate record',
        'owner_ids_fit_lookup':len(g.rows(28))<=100,
        'standalone_zone_added_to_archive':True,'standalone_zone_menu_discovery_supported':False,
        'normal_zone8_aliases_ultimate_zone0':8*0x20C==0x1060,
        'zone_branch_uses_existing_mode_zone_and_distinct_grid_cells':True,
        'runtime_result_not_inferred_from_file_audit':True,
    }
    check('known_save_alias_arithmetic',0x8148+500*28==0xB7F8 and 0xB7F8+66*28==0xBF30 and 0x8148+0x3DE8==0xBF30)
    check('new_missions_fit_fixed_storage',bounds['all_new_mission_indices_fit_savedata'])
    result={'audit':'Independent readback of originals and prototypes; no builder manifest used','all_file_checks_passed':True,'check_count':len(checks),'checks':checks,'known_bounds_and_unsupported_features':bounds,'inputs':{'original_afs':str(a.progress_afs),'probe_root':str(a.probes),'gx19a_mmd_sha256':sha(gx),'standalone_zone_pak_sha256':sha(standalone),'combined_zone_pak_sha256':sha(combined)},'important':'Passing this structural/preservation audit does not make icon66 save-safe or the appended standalone Zone selectable. Runtime evidence is separate.'}
    a.output.write_text(json.dumps(result,indent=2)+'\n');print(json.dumps({'output':str(a.output),'checks_passed':len(checks),'known_unsupported_features_recorded':True},indent=2))


if __name__=='__main__':main()
