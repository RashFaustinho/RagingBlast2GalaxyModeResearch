#!/usr/bin/env python3
"""Read-only MAIN/ZONE address book. Command-line node/native IDs are decimal.

MAIN participant preset namespaces differ between galaxy.mmd and tutorial.mmd.
For ZONE, --preset-table must explicitly name normal or Ultimate's DAT.
Unknown fields are preserved as raw bytes; absence of a condition means true.
"""
import argparse
import json
import struct
from pathlib import Path
from mmd_edit_research import Document
from mmd_condition_research import expression, format_expression, evaluate
from mmd_graph_research import inspect_graph
from preset_research import table


def describe(data, node, selected_native=None, parameters=None, preset_table=None):
    d = Document(data)
    rootref = struct.unpack_from('>I', d.header, 16)[0]
    count, stride, offset = d.descriptors[rootref]
    if not 0 <= node < count:
        raise ValueError('Node outside root array')
    root = d.body(rootref)[node * stride:(node+1) * stride]
    base = d.header_size + len(d.descriptors) * 8
    absolute = base + offset + node * stride
    result = dict(node=node, root_offset_hex=hex(absolute), root_hex=root.hex(),
                  coordinates=list(struct.unpack_from('>2f', root)))

    def ref_info(ref):
        n, size, off = d.descriptors[ref]
        return dict(descriptor=ref, descriptor_offset_hex=hex(d.header_size+ref*8),
                    count=n, stride=size, body_offset_hex=hex(base+off))

    def expr(ref):
        if not ref:
            return dict(descriptor=0, expression='[absent]')
        ast = expression(d.body(ref))
        out = ref_info(ref)
        out['expression'] = format_expression(ast)
        try:
            out['value'] = evaluate(ast, selected_native=selected_native)
        except ValueError as e:
            out['evaluation_requires_context'] = str(e)
        return out

    def preset(index):
        if parameters is None or preset_table is None:
            return dict(preset=index)
        rows = table((parameters/preset_table).read_bytes(), 44)
        a, s, *other = rows[index]
        app = table((parameters/'preset_appearance_table.dat').read_bytes(), 32)[a]
        strength = table((parameters/'preset_strength_table.dat').read_bytes(), 88)[s]
        return dict(preset=index, preset_offset_hex=hex(16+index*44),
                    appearance=a, appearance_offset_hex=hex(16+a*32),
                    strength=s, strength_offset_hex=hex(16+s*88),
                    native=app[0], costume=app[1], costume_mode=app[2],
                    local_move_selectors=list(app[3:]), level=strength[0],
                    AI_type_hex=hex(strength[1]),
                    items_hex=[hex(i) for i in strength[2:] if i != 0xffffffff],
                    preset_remaining_words_hex=[hex(i) for i in other])

    if data[:4] == b'MAIN':
        if stride != 92:
            raise ValueError('Unexpected MAIN root stride')
        result.update(stage=struct.unpack_from('>H',root,8)[0],
                      category=struct.unpack_from('>H',root,10)[0],
                      music=struct.unpack_from('>H',root,12)[0],
                      display_difficulty=struct.unpack_from('>H',root,14)[0],
                      objective_type=struct.unpack_from('>H',root,16)[0],
                      time_limit_raw_seconds=struct.unpack_from('>I',root,28)[0],
                      rule_description_selectors=list(struct.unpack_from('>2H',root,18)),
                      graph_validation=inspect_graph(data))
        edge_ref = struct.unpack_from('>I',d.header,20)[0]
        incident_ref = struct.unpack_from('>I',root,32)[0]
        result['incident_edges'] = ref_info(incident_ref)
        result['incident_edges']['entries'] = []
        for edge, opaque in struct.iter_unpack('>HH',d.body(incident_ref)):
            a, _, b, _ = struct.unpack_from('>4H',d.body(edge_ref),edge*8)
            result['incident_edges']['entries'].append(dict(edge=edge,endpoints=[a,b]))
        for side, rel in [('allies',0x24),('enemies',0x28)]:
            ref = struct.unpack_from('>I',root,rel)[0]
            result[side] = None
            if not ref:
                continue
            group = ref_info(ref)
            tag, roster_ref = struct.unpack('>II',d.body(ref))
            group['tag_hex'] = hex(tag)
            if tag == 0:
                group['roster'] = ref_info(roster_ref)
                group['candidates'] = []
                for i, (p, opaque, condition) in enumerate(struct.iter_unpack('>HHI',d.body(roster_ref))):
                    candidate = preset(p)
                    candidate.update(candidate=i, participant_offset_hex=hex(base+d.descriptors[roster_ref][2]+i*8),opaque_u16=opaque,condition=expr(condition))
                    if condition == 0:
                        candidate['condition']['value'] = 1
                    group['candidates'].append(candidate)
            else:
                group['special_group_body_hex'] = d.body(ref).hex()
            result[side] = group
        ref = struct.unpack_from('>I',root,0x3c)[0]
        result['just_actions'] = None
        if ref:
            result['just_actions'] = ref_info(ref)
            result['just_actions']['steps'] = [dict(native_action_id=a,direct_parameter=p,parameter_expression=expr(e)) for a,p,e in struct.iter_unpack('>IiI',d.body(ref))]
        for rel in [0x30,0x34,0x40,0x44,0x48]:
            result[f'expression_{rel:02X}'] = expr(struct.unpack_from('>I',root,rel)[0])
        ref = struct.unpack_from('>I',root,0x38)[0]
        result['OR_query_list_38'] = None
        if ref:
            entries = []
            for kind, argument in struct.iter_unpack('>HH',d.body(ref)):
                if kind == 0:
                    break
                entries.append(dict(query_type=kind,argument=argument))
            result['OR_query_list_38'] = dict(**ref_info(ref),entries=entries)
        for rel in [0x4c,0x50,0x54]:
            ref = struct.unpack_from('>I',root,rel)[0]
            result[f'item_list_{rel:02X}'] = dict(**ref_info(ref),items_hex=[hex(i[0]) for i in struct.iter_unpack('>H',d.body(ref))]) if ref else None
    else:
        if stride != 56:
            raise ValueError('Unexpected ZONE root stride')
        v = struct.unpack_from('>12I',root,8)
        result.update(stage_kind=v[0],enemy=preset(v[1]),persistent_stage_ID=v[2],
                      handicap_code=v[3],time_limit_raw_seconds=v[4],stage_ID_raw=v[5],music_raw=v[6],opaque_24=v[7],expression_30=expr(v[10]))
        for key,ref in [('stamp_criteria',v[8]),('next_nodes',v[11])]:
            result[key] = dict(**ref_info(ref),values=[i[0] for i in struct.iter_unpack('>I',d.body(ref))]) if ref else None
        result['conditional_rewards'] = [dict(kind=k,reward_id=r,condition=expr(e)) for k,r,e in struct.iter_unpack('>HHI',d.body(v[9]))] if v[9] else []
    return result


if __name__ == '__main__':
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument('mmd',type=Path)
    p.add_argument('--node',type=int,required=True)
    p.add_argument('--selected-native',type=int)
    p.add_argument('--parameters',type=Path)
    p.add_argument('--preset-table')
    args = p.parse_args()
    if args.parameters and not args.preset_table:
        if args.mmd.name in ('galaxy.mmd','tutorial.mmd'):
            args.preset_table = 'preset_character_'+args.mmd.stem+'.dat'
        else:
            p.error('Specify --preset-table for this mode')
    print(json.dumps(describe(args.mmd.read_bytes(),args.node,args.selected_native,args.parameters,args.preset_table),indent=2))
