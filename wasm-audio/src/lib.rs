#![no_std]

#[macro_use]
extern crate alloc;

mod pitch;

use pitch::PitchDetector;
use wasm_bindgen::prelude::*;

const POWER_THRESHOLD: f32 = 5.0;
const CLARITY_THRESHOLD: f32 = 0.6;
const PICK_THRESHOLD: f32 = 0.95;

pub fn set_panic_hook() {
  #[cfg(feature = "console_error_panic_hook")]
  console_error_panic_hook::set_once();
}

#[wasm_bindgen]
pub struct WasmPitchDetector {
  sample_rate: f32,
  detector: PitchDetector,
}

#[wasm_bindgen]
impl WasmPitchDetector {
  #[must_use]
  pub fn new(sample_rate: f32, fft_size: usize) -> Self {
    set_panic_hook();
    Self {
      sample_rate,
      detector: PitchDetector::new(fft_size, fft_size / 2),
    }
  }

  #[must_use]
  pub fn detect_pitch(&mut self, audio_samples: &[f32]) -> f32 {
    self
      .detector
      .get_pitch(
        audio_samples,
        self.sample_rate,
        POWER_THRESHOLD,
        CLARITY_THRESHOLD,
        PICK_THRESHOLD,
      )
      .unwrap_or_default()
  }

  #[must_use]
  pub fn pitch_to_midi_note(pitch: f32) -> u32 {
    (12.0 * (pitch / 440.0).log2() + 69.01) as u32
  }

  #[must_use]
  pub fn midi_note_to_pitch(note: u32) -> f32 {
    440.0 * 2.0f32.powf((note as f32 - 69.0) / 12.0)
  }

  #[must_use]
  pub fn cents_from_correct_pitch(frequency: f32, midi_note: u32) -> i32 {
    (1200.0 * (frequency / Self::midi_note_to_pitch(midi_note)).log2()) as i32
  }
}
