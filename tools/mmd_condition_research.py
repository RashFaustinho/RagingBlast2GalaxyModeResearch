#!/usr/bin/env python3
"""Decode the observed postfix expressions in MAIN/ZONE descriptors.

Native evidence: BLES00978 2F5848, operator table via TOC+1A68, query dispatcher
2F3C28. Evaluation supports constants, arithmetic, booleans and query5 (selected
Galaxy native ID). Other queries require caller-provided observations.
"""
import struct

OPS = {33: "+", 34: "-", 35: "*", 36: "/", 37: "OR", 38: "AND",
       39: "NOT", 40: "NEG", 41: "==", 42: "!=", 43: "<", 44: ">",
       45: "<=", 46: ">="}


def tokens(data):
    if len(data) % 8:
        raise ValueError("Expression must contain complete eight-byte tokens")
    result = []
    for offset in range(0, len(data), 8):
        kind, operand = struct.unpack_from(">Ii", data, offset)
        if kind not in (0, 1, 2):
            raise ValueError("Unsupported token kind")
        result.append((kind, operand))
        if kind == 0:
            return result
    raise ValueError("Missing terminator")


def expression(data):
    stack = []
    for kind, value in tokens(data):
        if kind == 0:
            if len(stack) != 1:
                raise ValueError("Expression does not leave exactly one result")
            return stack[0]
        if kind == 2:
            stack.append(value)
        else:
            arity = 1 if value in (39, 40) else 2
            if len(stack) < arity:
                raise ValueError("Expression stack underflow")
            args = stack[-arity:]
            del stack[-arity:]
            if value == 16:
                stack.append(("QUERY", args[1], args[0]))
            elif value in OPS:
                stack.append((OPS[value], *args))
            else:
                raise ValueError("Unsupported/reserved operator")
        if len(stack) > 32:
            raise ValueError("Expression exceeds native stack capacity")


def format_expression(node):
    if isinstance(node, int):
        return str(node)
    op, *args = node
    args = [format_expression(x) for x in args]
    if op == "QUERY":
        return f"query(type={args[0]}, argument={args[1]})"
    if len(args) == 1:
        return f"{op}({args[0]})"
    return f"({args[0]} {op} {args[1]})"


def evaluate(node, selected_native=None, query=None):
    def signed(value):
        return (value + 0x80000000) % 0x100000000 - 0x80000000
    if isinstance(node, int):
        return node
    op, *args = node
    args = [evaluate(x, selected_native, query) for x in args]
    if op == "QUERY":
        kind, argument = args
        if kind == 5 and selected_native is not None:
            return int(selected_native == argument)
        if kind == 4:
            return 0
        if kind == 6:
            return argument
        if query is not None:
            return query(kind, argument)
        raise ValueError("Query requires runtime/save-state context")
    if op == "NOT": return int(not args[0])
    if op == "NEG": return signed(-args[0])
    a, b = args
    if op == "+": return signed(a+b)
    if op == "-": return signed(a-b)
    if op == "*": return signed(a*b)
    if op == "/":
        if b == 0: raise ValueError("Division by zero")
        return signed((abs(a)//abs(b)) * (-1 if (a<0) != (b<0) else 1))
    if op == "OR": return int(bool(a) or bool(b))
    if op == "AND": return int(bool(a) and bool(b))
    if op == "==": return int(a==b)
    if op == "!=": return int(a!=b)
    if op == "<": return int(a<b)
    if op == ">": return int(a>b)
    if op == "<=": return int(a<=b)
    if op == ">=": return int(a>=b)
    raise ValueError("Unknown operator")


def constant(value):
    return struct.pack(">IiII", 2, value, 0, 0)
