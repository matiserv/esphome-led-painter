#!/usr/bin/env python3
"""Add the led_painter effect and last-effect memory to ESPHome device configs.

Usage:  python3 add_led_painter.py device.yaml:light_id [device2.yaml:light_id ...]

Run it in the folder that holds the device YAML files and a "components"
folder with led_painter (or pass --github to pull the component from GitHub).

For each file it adds:
  * external_components + led_painter
  * the "Paint" effect on the given addressable light
  * an API action "paint" that Home Assistant calls with the colours
  * a global + interval + on_turn_on that restore the last effect after off/on

Files that already mention led_painter are left untouched.
"""

import re
import sys

GITHUB = "github://matiserv/esphome-led-painter"

ACTION = """  actions:
    - action: paint
      variables:
        colors: string
      then:
        - lambda: id(painter).set_hex(colors.c_str(), colors.size());
"""

RESTORE = """      - lambda: |-
          if (id(last_effect) != "None" && std::string(id({lid}).get_effect_name().c_str()) == "None") {{
            auto call = id({lid}).turn_on();
            call.set_effect(id(last_effect));
            call.perform();
          }}
"""

SOURCE_LOCAL = """  - source:
      type: local
      path: components
    components: [led_painter]
"""

TAIL = """
external_components:
{source}
led_painter:
  id: painter

globals:
  - id: last_effect
    type: std::string
    restore_value: yes
    max_restore_data_length: 32
    initial_value: '"None"'

interval:
  - interval: 5s
    then:
      - lambda: |-
          if (!id({lid}).remote_values.is_on()) return;
          std::string cur = id({lid}).get_effect_name().c_str();
          if (cur != id(last_effect)) id(last_effect) = cur;
"""


def patch(path, lid, source):
    text = open(path, encoding="utf-8").read()
    if "led_painter" in text:
        return "skipped (already has led_painter)"
    lines = text.split("\n")

    def top(key):
        return [i for i, l in enumerate(lines) if re.match(r"^%s:\s*(#.*)?$" % key, l)]

    for key in ("external_components", "globals", "interval"):
        if top(key):
            return "skipped (already has a %s section - add the entries by hand)" % key
    api = top("api")
    if len(api) != 1:
        return "skipped (no single api section)"
    if any(re.match(r"^  (actions|services):", l) for l in lines[api[0] + 1 : api[0] + 40] if l[:1] == " "):
        return "skipped (api already has actions/services - add the action by hand)"

    ids = [i for i, l in enumerate(lines) if re.match(r"^    id:\s*%s\s*$" % re.escape(lid), l)]
    if len(ids) != 1:
        return "skipped (light id %s not found)" % lid
    start = ids[0]
    end = next((i for i in range(start + 1, len(lines)) if re.match(r"^(  - |\S)", lines[i])), len(lines))
    block = range(start, end)

    fx = [i for i in block if re.match(r"^    effects:\s*$", lines[i])]
    if len(fx) != 1:
        return "skipped (the light has no effects list)"
    item = next((lines[i] for i in range(fx[0] + 1, end) if re.match(r"^\s+- ", lines[i])), "      - x")
    indent = re.match(r"^(\s+)- ", item).group(1)
    on = [i for i in block if re.match(r"^    on_turn_on:\s*$", lines[i])]

    # Apply from the bottom up so earlier indexes stay valid.
    edits = [(fx[0] + 1, indent + "- led_painter:\n")]
    if on:
        edits.append((on[0] + 1, RESTORE.format(lid=lid)))
    else:
        edits.append((start + 1, "    on_turn_on:\n" + RESTORE.format(lid=lid)))
    edits.append((api[0] + 1, ACTION))
    for index, chunk in sorted(edits, reverse=True):
        lines[index:index] = chunk.rstrip("\n").split("\n")

    out = "\n".join(lines).rstrip("\n") + "\n" + TAIL.format(lid=lid, source=source)
    open(path, "w", encoding="utf-8").write(out)
    return "updated"


if __name__ == "__main__":
    args = [a for a in sys.argv[1:] if a != "--github"]
    src = "  - source: %s\n    components: [led_painter]\n" % GITHUB if "--github" in sys.argv else SOURCE_LOCAL
    if not args:
        sys.exit(__doc__)
    for arg in args:
        path, _, lid = arg.partition(":")
        print("%-28s %s" % (path, patch(path, lid, src) if lid else "use file.yaml:light_id"))
