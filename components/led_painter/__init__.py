"""led_painter - a "paint" effect for addressable lights.

The component keeps a frame of RGB pixels and an addressable light effect
stretches that frame over the whole strip. The frame is set from Home
Assistant with an API action that calls ``set_hex()``, and a diagnostic
sensor reports how many LEDs the painted light has.
"""

import zlib

import esphome.codegen as cg
import esphome.config_validation as cv
from esphome.components.light.effects import register_addressable_effect
from esphome.components.light.types import AddressableLightEffect
from esphome.components import sensor
from esphome.const import CONF_ID, CONF_NAME, ENTITY_CATEGORY_DIAGNOSTIC

CODEOWNERS = []
AUTO_LOAD = ["sensor"]
MULTI_CONF = True

CONF_LED_PAINTER_ID = "led_painter_id"
CONF_RESTORE = "restore"
CONF_REVERSE = "reverse"
CONF_ZONES = "zones"

led_painter_ns = cg.esphome_ns.namespace("led_painter")
LedPainter = led_painter_ns.class_("LedPainter", cg.Component)
LedPainterEffect = led_painter_ns.class_("LedPainterEffect", AddressableLightEffect)

CONFIG_SCHEMA = cv.Schema(
    {
        cv.GenerateID(): cv.declare_id(LedPainter),
        cv.Optional(CONF_RESTORE, default=True): cv.boolean,
        # Diagnostic sensor reporting how many LEDs the painted light has.
        cv.Optional(CONF_ZONES, default={CONF_NAME: "Painter zones"}): sensor.sensor_schema(
            icon="mdi:led-strip-variant",
            accuracy_decimals=0,
            entity_category=ENTITY_CATEGORY_DIAGNOSTIC,
        ),
    }
).extend(cv.COMPONENT_SCHEMA)


async def to_code(config):
    var = cg.new_Pvariable(config[CONF_ID])
    await cg.register_component(var, config)
    cg.add(var.set_restore(config[CONF_RESTORE]))
    zones = await sensor.new_sensor(config[CONF_ZONES])
    cg.add(var.set_zones_sensor(zones))
    cg.add(var.set_pref_key(zlib.crc32(str(config[CONF_ID]).encode()) & 0xFFFFFFFF))


@register_addressable_effect(
    "led_painter",
    LedPainterEffect,
    "Paint",
    {
        cv.GenerateID(CONF_LED_PAINTER_ID): cv.use_id(LedPainter),
        cv.Optional(CONF_REVERSE, default=False): cv.boolean,
    },
)
async def led_painter_effect_to_code(config, effect_id):
    parent = await cg.get_variable(config[CONF_LED_PAINTER_ID])
    effect = cg.new_Pvariable(effect_id, config[CONF_NAME])
    cg.add(effect.set_painter(parent))
    cg.add(effect.set_reverse(config[CONF_REVERSE]))
    return effect
