#include "led_painter.h"

#include <cstring>
#include <memory>

#include "esphome/core/hal.h"
#include "esphome/core/log.h"

namespace esphome {
namespace led_painter {

static const char *const TAG = "led_painter";

static uint8_t hex_nibble(char c) {
  if (c >= '0' && c <= '9')
    return c - '0';
  if (c >= 'a' && c <= 'f')
    return c - 'a' + 10;
  if (c >= 'A' && c <= 'F')
    return c - 'A' + 10;
  return 0;
}

void LedPainter::setup() {
  if (!this->restore_)
    return;
  this->pref_ = global_preferences->make_preference<StoredFrame>(this->pref_key_ ^ 0x4C504E54UL);
  std::unique_ptr<StoredFrame> stored(new StoredFrame());
  if (this->pref_.load(stored.get()) && stored->count > 0 && stored->count <= MAX_STORED_PIXELS) {
    this->frame_.assign(stored->rgb, stored->rgb + stored->count * 3);
    this->version_++;
  }
}

void LedPainter::dump_config() {
  ESP_LOGCONFIG(TAG, "LED Painter:");
  ESP_LOGCONFIG(TAG, "  Restore frame: %s", YESNO(this->restore_));
  ESP_LOGCONFIG(TAG, "  Frame pixels: %u", (unsigned) this->size());
}

void LedPainter::set_hex(const char *hex, size_t len) {
  size_t pixels = len / 6;
  if (pixels == 0)
    return;
  if (pixels > MAX_PIXELS)
    pixels = MAX_PIXELS;
  this->frame_.resize(pixels * 3);
  for (size_t i = 0; i < pixels * 3; i++)
    this->frame_[i] = (hex_nibble(hex[i * 2]) << 4) | hex_nibble(hex[i * 2 + 1]);
  this->version_++;
  if (this->restore_)
    this->set_timeout("save", 3000, [this]() { this->save_(); });
}

void LedPainter::save_() {
  const size_t pixels = this->size();
  if (pixels == 0 || pixels > MAX_STORED_PIXELS)
    return;
  std::unique_ptr<StoredFrame> stored(new StoredFrame());
  memset(stored.get(), 0, sizeof(StoredFrame));
  stored->count = pixels;
  memcpy(stored->rgb, this->frame_.data(), pixels * 3);
  this->pref_.save(stored.get());
}

void LedPainter::report_zones(uint16_t zones) {
  if (zones == this->zones_)
    return;
  this->zones_ = zones;
  if (this->zones_sensor_ != nullptr)
    this->zones_sensor_->publish_state(zones);
}

Color LedPainter::sample(float pos) const {
  const size_t pixels = this->size();
  if (pixels == 0)
    return Color(0, 0, 0);
  if (pos < 0.0f)
    pos = 0.0f;
  if (pos > 1.0f)
    pos = 1.0f;
  const float f = pos * (pixels - 1);
  const size_t a = (size_t) f;
  const size_t b = a + 1 < pixels ? a + 1 : pixels - 1;
  const float t = f - a;
  const uint8_t *pa = &this->frame_[a * 3];
  const uint8_t *pb = &this->frame_[b * 3];
  return Color((uint8_t)(pa[0] + (pb[0] - pa[0]) * t + 0.5f), (uint8_t)(pa[1] + (pb[1] - pa[1]) * t + 0.5f),
               (uint8_t)(pa[2] + (pb[2] - pa[2]) * t + 0.5f));
}

void LedPainterEffect::init() {
  if (this->painter_ != nullptr)
    this->painter_->report_zones(this->get_addressable_()->size());
}

void LedPainterEffect::start() {
  AddressableLightEffect::start();
  this->first_ = true;
}

void LedPainterEffect::apply(light::AddressableLight &it, const Color &current_color) {
  if (this->painter_ == nullptr)
    return;
  const uint32_t now = millis();
  const uint32_t version = this->painter_->version();
  // Redraw on a new frame, and a few times a second so brightness changes are picked up.
  if (!this->first_ && version == this->last_version_ && now - this->last_draw_ < 100)
    return;
  this->first_ = false;
  this->last_version_ = version;
  this->last_draw_ = now;

  const int32_t leds = it.size();
  this->painter_->report_zones(leds);
  for (int32_t i = 0; i < leds; i++) {
    float pos = leds > 1 ? (float) i / (float) (leds - 1) : 0.0f;
    if (this->reverse_)
      pos = 1.0f - pos;
    it[i] = this->painter_->sample(pos);
  }
  it.schedule_show();
}

}  // namespace led_painter
}  // namespace esphome
