#!/usr/bin/env python3
"""Extract f_LevelInitSpawnPlayers DefineFunction2 bodies from level SWFs and diff them."""
import struct, sys, zlib, re

def parse_swf_tags(swf_bytes):
    """Full tag walker for SWF. Returns list of (code, data_bytes, data_offset)."""
    data = swf_bytes
    sig = data[:3]
    if sig == b'CWS':
        # zlib compressed: decompress body after 8-byte header
        # zlib stream starts at byte 8, with standard zlib header
        decompressed = zlib.decompress(data[8:])
        data = data[:8] + decompressed
    elif sig == b'ZWS':
        import zlib
        decompressed = zlib.decompress(data[8:], zlib.MAX_WBITS | 32)
        data = data[:8] + decompressed
    elif sig == b'FWS':
        pass
    else:
        raise ValueError(f"Unknown SWF signature: {sig}")

    version = data[3]
    file_length = struct.unpack('<I', data[4:8])[0]

    # Parse RECT (n_bits | x_min | x_max | y_min | y_max) packed in bits, starting at byte 8
    bit_pos = 8 * 8  # start reading bits from byte 8
    n_bits = 0
    # Read 5-bit n_bits
    for i in range(5):
        byte = data[bit_pos // 8]
        bit = (byte >> (7 - (bit_pos % 8))) & 1
        n_bits = (n_bits << 1) | bit
        bit_pos += 1

    # Read 4 signed fixed-point (n_bits each)
    for _ in range(4):
        val = 0
        for i in range(n_bits):
            byte = data[bit_pos // 8]
            bit = (byte >> (7 - (bit_pos % 8))) & 1
            val = (val << 1) | bit
            bit_pos += 1
        # sign extend
        if val & (1 << (n_bits - 1)):
            val -= (1 << n_bits)

    # Frame rate (8.8 fixed) + frame count
    frame_rate = struct.unpack('<H', data[bit_pos//8:bit_pos//8+2])[0] / 256.0
    bit_pos += 16  # 2 bytes
    frame_count = struct.unpack('<H', data[bit_pos//8:bit_pos//8+2])[0]
    bit_pos += 16
    byte_pos = bit_pos // 8

    tags = []
    while byte_pos < len(data):
        if byte_pos + 2 > len(data):
            break
        header_word = struct.unpack('<H', data[byte_pos:byte_pos+2])[0]
        tag_code = (header_word >> 6) & 0x3FF
        tag_length = header_word & 0x3F
        tag_data_off = byte_pos + 2
        if tag_length == 0x3F:
            # Long tag: next 4 bytes are the length
            if tag_data_off + 4 > len(data):
                break
            tag_length = struct.unpack('<I', data[tag_data_off:tag_data_off+4])[0]
            tag_data_off += 4
        tag_data = data[tag_data_off:tag_data_off+tag_length]
        tags.append((tag_code, tag_data, tag_data_off))
        byte_pos = tag_data_off + tag_length

    return tags, version, frame_rate, frame_count

def find_function_by_name(tags, target_name):
    """Find a DefineFunction2 tag whose name matches target_name.
    DefineFunction2 (tag 26): data = [2B function_id][1B num_params][2B reserved][params...][1B flags][string name][action bytes]
    Returns the action bytes (bytecode) for that function.
    """
    results = []
    for tag_code, data, off in tags:
        if tag_code != 26:
            continue
        if len(data) < 6:
            continue
        # Parse DefineFunction2 header
        # function_id (2 bytes), num_params (1 byte), reserved (2 bytes)
        func_id = struct.unpack('<H', data[0:2])[0]
        num_params = data[2]
        # reserved (2 bytes after num_params)
        param_start = 5
        pos = param_start
        # Read param names: each param is a string (index, then null-terminated name in AVM1 via 16-bit length? No...)
        # Actually AVM1 strings in DefineFunction2 params: each param name is a 16-bit length + UTF-8 chars
        # Wait — in AVM1, strings in SWF are either packed as 16-bit length-prefixed (SWF string) or 0-terminated
        # DefineFunction2 format: [2B id][1B num_params][2B reserved][params...]
        # Each param: 1 byte index_in_register, then string name. In the binary, param name is a null-terminated string? No.
        # Actually: the SWF string for DefineFunction2 param names uses the standard SWF string format:
        # But DefineFunction2 uses index_in_register (1 byte) + name (string). The strings here are Pascal-like.
        # Let me just search for the function name in the raw data
        if target_name.encode() in data:
            # Find the name position
            name_pos = data.find(target_name.encode())
            # The bytecode starts AFTER the function name string (null-terminated in AVM1 DefineFunction2)
            # DefineFunction2: function name is stored as: [name_length 2 bytes? no]
            # Actually the name is a standard SWF string: it's null-terminated within the action data
            # In SWFAvm1, string = null-terminated? No. In DefineFunction2, the function name is stored as
            # a null-terminated string (0-terminated) in AVM1 bytecode.
            # Let's find the null terminator after the name
            null_pos = data.find(b'\x00', name_pos)
            if null_pos == -1:
                continue
            code_start = null_pos + 1
            code = data[code_start:]
            results.append((func_id, off, code, num_params))
    return results

def dump_function(name, swf_path):
    swf = open(swf_path, 'rb').read()
    tags, ver, fr, fc = parse_swf_tags(swf)
    matches = find_function_by_name(tags, name)
    print(f"\n=== {name} in {swf_path} ===")
    print(f"  SWF: v{ver}, {fr}fps, {fc} frames, {len(tags)} tags, {len(swf)} bytes")
    for func_id, off, code, num_params in matches:
        print(f"  DefineFunction2 id={func_id} off={off} num_params={num_params} code_len={len(code)}")
        print(f"  code hex: {code.hex()}")
        # Also print as AVM1 opcodes
        print(f"  code ascii: {code.decode('latin1')[:200]}")
    return matches

if __name__ == '__main__':
    import os
    os.chdir('/home/jewboy420/castle-pc-web')
    # Extract spawn functions from both
    print("=" * 60)
    r2 = dump_function('f_LevelInitSpawnPlayers', 'web/level2/level2.swf')
    print("=" * 60)
    r3 = dump_function('f_LevelInitSpawnPlayers', 'web/level3/level3.swf')

    # Also find f_ActivatePlayers and f_PlayerArray for comparison
    for fname in ['f_ActivatePlayers', 'f_PlayerArray']:
        print("=" * 60)
        dump_function(fname, 'web/level2/level2.swf')
        print("=" * 60)
        dump_function(fname, 'web/level3/level3.swf')
