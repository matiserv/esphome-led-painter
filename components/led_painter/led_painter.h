#pragma once

#include <string>
#include <vector>

#include "esphome/components/light/addressable_light_effect.h"
#include "esphome/components/sensor/sensor.h"
#include "esphome/core/color.h"
#include "esphome/core/component.h"
#include "esphome/core/preferences.h"

namespace esphome {
namespace led_painter {

static const uint16_t MAX_PIXELS = 1024;
static const uint16_t MAX_STORED_PIXELS = 170;

struct StoredFrame {
  uint16_t count;
  uint8_t rgb[MAX_STORED_PIXELS * 3];
} __attribute__((packed));

class LedPainter : public Component {
 public:
  void setup() override;
  void dump_config() override;
  float get_setup_priority() const override { return setup_priority::DATA; }

  void set_restore(bool restore) { this->restore_ = restore; }
  void set_pref_key(uint32_t key) { this->pref_key_ = key; }
  void set_zones_sensor(sensor::Sensor *zones_sensor) { this->zones_sensor_ = zones_sensor; }
  /// Report how many LEDs the painted light has (published on the zones sensor).
  void report_zones(uint16_t zones);

  /// Set the frame from a string of rrggbb hex triplets, one per pixel.
  void set_hex(const char *hex, size_t len);
  void set_hex(const std::string &hex) { this->set_hex(hex.c_str(), hex.size()); }

  size_t size() const { return this->frame_.size() / 3; }
  uint32_t version() const { return this->version_; }
  /// Colour at a position along the frame, 0.0 (start) to 1.0 (end), interpolated.
  Color sample(float pos) const;

 protected:
  void save_();

  std::vector<uint8_t> frame_;
  uint32_t version_{0};
  uint32_t pref_key_{0};
  bool restore_{true};
  ESPPreferenceObject pref_;
  sensor::Sensor *zones_sensor_{nullptr};
  uint16_t zones_{0};
};

class LedPainterEffect : public light::AddressableLightEffect {
 public:
  explicit LedPainterEffect(const char *name) : AddressableLightEffect(name) {}

  void set_painter(LedPainter *painter) { this->painter_ = painter; }
  void set_reverse(bool reverse) { this->reverse_ = reverse; }

  void init() override;
  void start() override;
  void apply(light::AddressableLight &it, const Color &current_color) override;

 protected:
  LedPainter *painter_{nullptr};
  bool reverse_{false};
  bool first_{true};
  uint32_t last_version_{0};
  uint32_t last_draw_{0};
};

}  // namespace led_painter
}  // namespace esphome
