"""Graph integrity and postfix semantics are necessary before binary edits."""
import struct
import unittest
import os
from pathlib import Path
from mmd_edit_research import Document
from mmd_graph_research import inspect_graph
from mmd_inspect_advanced import describe
from mmd_condition_research import expression, evaluate, constant

ROOT = Path(__file__).resolve().parents[1]
TUTORIAL = Path(os.environ.get('RB2_TEST_FIXTURES', ROOT / 'test-fixtures')) / 'tutorial.mmd'

def program(*pairs):
    return b''.join(struct.pack('>Ii',*pair) for pair in pairs)+bytes(8)

class ConditionChecks(unittest.TestCase):
    def test_query_order_and_false_candidate(self):
        ast=expression(program((2,0),(2,5),(1,16)))
        self.assertEqual(ast,('QUERY',5,0))
        self.assertEqual(evaluate(ast,selected_native=0),1)
        self.assertEqual(evaluate(ast,selected_native=99),0)

    def test_signed_arithmetic_divides_towards_zero(self):
        ast=expression(program((2,-7),(2,3),(1,36)))
        self.assertEqual(evaluate(ast),-2)
        self.assertEqual(evaluate(expression(program((2,2147483647),(2,1),(1,33)))),-2147483648)

    def test_numeric_task_parameter(self):
        self.assertEqual(evaluate(expression(constant(2000))),2000)

    def test_unknown_runtime_query_is_not_guessed(self):
        with self.assertRaisesRegex(ValueError,'runtime/save-state'):
            evaluate(expression(program((2,1),(2,2),(1,16))))

    def test_bad_programs_rejected(self):
        for data in [bytes(8),program((1,33)),program((2,1),(2,2)),struct.pack('>Ii',2,1),program((2,1),(2,2),(1,17)),program(*[(2,1)]*33)]:
            with self.subTest(data=data.hex()),self.assertRaises(ValueError):
                expression(data)

@unittest.skipUnless(TUTORIAL.is_file(), 'Set RB2_TEST_FIXTURES to your private original files')
class GraphChecks(unittest.TestCase):
    def setUp(self):
        self.data=TUTORIAL.read_bytes()

    def test_real_tutorial_roundtrip_and_reciprocal_edges(self):
        d=Document(self.data)
        self.assertEqual(d.encode(),self.data)
        result=inspect_graph(self.data)
        self.assertTrue(result['consistent'])
        self.assertEqual(result['node_count'],9)

    def test_tutorial_ally_and_action_lists_are_separate(self):
        r=describe(self.data,5)
        self.assertEqual([c['preset'] for c in r['allies']['candidates']],[7,8,9,24])
        self.assertEqual(r['just_actions']['count'],9)
        self.assertNotEqual(r['allies']['roster']['descriptor'],r['just_actions']['descriptor'])

    def test_dangling_incident_edge_is_rejected(self):
        d=Document(self.data)
        rootref=struct.unpack_from('>I',d.header,16)[0]
        ref=struct.unpack_from('>I',d.body(rootref),32)[0]
        bad=bytearray(d.body(ref));struct.pack_into('>H',bad,0,65535)
        d.replace_unique(ref,bad)
        self.assertFalse(inspect_graph(d.encode())['consistent'])

    def test_resize_keeps_later_task_bodies_and_updates_geometry(self):
        d=Document(self.data)
        rootref=struct.unpack_from('>I',d.header,16)[0]
        ref=struct.unpack_from('>I',d.body(rootref),32)[0]
        saved=[d.body(i) for i in range(len(d.descriptors))]
        d.replace_unique(ref,d.body(ref)+struct.pack('>HH',0,0),2)
        r=Document(d.encode())
        for i,b in enumerate(saved):
            if i!=ref:self.assertEqual(r.body(i),b)
        self.assertEqual(r.descriptors[ref][0],2)
        self.assertFalse(inspect_graph(r.encode())['consistent'])

if __name__=='__main__':unittest.main()
