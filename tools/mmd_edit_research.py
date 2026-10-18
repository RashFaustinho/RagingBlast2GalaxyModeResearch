#!/usr/bin/env python3
"""Small append/relocate builder for the observed MAIN and ZONE formats.

Offsets inside descriptors are payload-relative. Existing descriptor indices
remain stable when adding descriptors. This does not validate game semantics.
"""
import struct


class Document:
    def __init__(self, data):
        if data[:4] == b"MAIN":
            self.header_size, version = 0x24, 0x60000
        elif data[:4] == b"ZONE":
            self.header_size, version = 0x14, 0x10000
        else:
            raise ValueError("Expected observed MAIN or ZONE magic")
        if len(data) < self.header_size:
            raise ValueError("Truncated header")
        actual, size, payload = struct.unpack_from(">III", data, 4)
        if actual != version or size % 8 or self.header_size + size + payload != len(data):
            raise ValueError("Unsupported version or inconsistent sizes")
        self.header = bytearray(data[:self.header_size])
        self.descriptors = [list(struct.unpack_from(">HHI", data, self.header_size + i))
                            for i in range(0, size, 8)]
        self.payload = bytearray(data[self.header_size + size:])
        self.validate()

    def validate(self):
        for count, size, offset in self.descriptors:
            if offset + count * size > len(self.payload):
                raise ValueError("Descriptor outside payload")

    def body(self, index):
        count, size, offset = self.descriptors[index]
        return bytes(self.payload[offset:offset + count * size])

    def _append(self, body, count, size):
        if len(body) != count * size or not 0 <= count <= 65535 or not 0 <= size <= 65535:
            raise ValueError("Descriptor geometry does not match body")
        self.payload.extend(bytes((-len(self.payload)) % 4))
        offset = len(self.payload)
        self.payload.extend(body)
        return [count, size, offset]

    def append(self, body, count, size):
        index = len(self.descriptors)
        self.descriptors.append(self._append(body, count, size))
        return index

    def relocate(self, index, body, count=None):
        old_count, size, _ = self.descriptors[index]
        self.descriptors[index] = self._append(body, old_count if count is None else count, size)

    def replace_unique(self, index, body, count=None):
        """Resize an unaliased payload range and shift later descriptor offsets."""
        old_count, size, start = self.descriptors[index]
        end = start + old_count * size
        count = old_count if count is None else count
        if len(body) != count * size or not 0 <= count <= 65535 or (len(body) - (end-start)) % 4:
            raise ValueError("Unsupported count, geometry or alignment")
        for i, (n, stride, offset) in enumerate(self.descriptors):
            if i != index and n * stride and offset < end and offset + n * stride > start:
                raise ValueError("Cannot resize an aliased payload range")
        delta = len(body) - (end-start)
        self.payload[start:end] = body
        for i, entry in enumerate(self.descriptors):
            if i != index and entry[2] >= end:
                entry[2] += delta
        self.descriptors[index] = [count, size, start]

    def encode(self):
        self.validate()
        struct.pack_into(">II", self.header, 8, len(self.descriptors) * 8, len(self.payload))
        table = b"".join(struct.pack(">HHI", *entry) for entry in self.descriptors)
        result = bytes(self.header) + table + bytes(self.payload)
        checked = Document(result)
        if checked.descriptors != self.descriptors or checked.payload != self.payload:
            raise ValueError("Builder roundtrip mismatch")
        return result
