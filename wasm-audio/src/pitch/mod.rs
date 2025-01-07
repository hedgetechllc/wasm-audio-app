//! The `McLeod Pitch Detection Algorithm` is based on the algorithm from the paper:
//! *[A Smarter Way To Find Pitch](https://www.researchgate.net/publication/230554927_A_smarter_way_to_find_pitch)*.

mod peak;

use rustfft::num_complex::Complex;
use rustfft::num_traits::Zero;
use rustfft::{Fft, FftPlanner};

use alloc::{sync::Arc, vec::Vec};
use core::cmp::Ordering;
use peak::{choose_peak, correct_peak, detect_peaks};

fn copy_real_to_complex(input: &[f32], output: &mut [Complex<f32>]) {
  input.iter().zip(output.iter_mut()).for_each(|(i, o)| {
    o.re = *i;
    o.im = 0.0;
  });
  output[input.len()..].iter_mut().for_each(|o| *o = Complex::zero());
}

fn copy_complex_to_real(input: &[Complex<f32>], output: &mut [f32]) {
  input
    .iter()
    .map(|c| c.re)
    .zip(output.iter_mut())
    .for_each(|(i, o)| *o = i);
  output[input.len()..].iter_mut().for_each(|o| *o = 0.0);
}

fn modulus_squared(arr: &mut [Complex<f32>]) {
  for s in arr {
    s.re = s.re * s.re + s.im * s.im;
    s.im = 0.0;
  }
}

fn square_sum(arr: &[f32]) -> f32 {
  arr.iter().map(|&s| s * s).sum()
}

fn autocorrelation(
  signal: &[f32],
  signal_complex: &mut [Complex<f32>],
  scratch_complex: &mut [Complex<f32>],
  fft: &Arc<dyn Fft<f32>>,
  inv_fft: &Arc<dyn Fft<f32>>,
  result: &mut [f32],
) {
  copy_real_to_complex(signal, signal_complex);
  fft.process_with_scratch(signal_complex, scratch_complex);
  modulus_squared(signal_complex);
  inv_fft.process_with_scratch(signal_complex, scratch_complex);
  copy_complex_to_real(signal_complex, result);
}

fn pitch_from_peaks(input: &[f32], sample_rate: f32, clarity_threshold: f32, pick_threshold: f32) -> Option<f32> {
  let peaks: Vec<(usize, f32)> = detect_peaks(input).collect();
  let thresh = match peaks
    .iter()
    .max_by(|x, y| x.1.partial_cmp(&y.1).unwrap_or(Ordering::Equal))
  {
    None => 0.0,
    Some(peak) => peak.1 * pick_threshold,
  };
  choose_peak(peaks, thresh, clarity_threshold)
    .map(|peak| correct_peak(peak, input))
    .map(|peak| sample_rate / peak.0)
}

fn m_of_tau(signal: &[f32], start: f32, result: &mut [f32]) {
  result[0] = start;
  let last = result[1..].iter_mut().zip(signal).fold(start, |old, (r, &s)| {
    *r = old - s * s;
    *r
  });
  result[signal.len()..].iter_mut().for_each(|r| *r = last);
}

fn normalized_square_difference(
  signal: &[f32],
  signal_complex: &mut [Complex<f32>],
  scratch: &mut [f32],
  scratch_complex: &mut [Complex<f32>],
  fft: &Arc<dyn Fft<f32>>,
  inv_fft: &Arc<dyn Fft<f32>>,
  result: &mut [f32],
) {
  autocorrelation(signal, signal_complex, scratch_complex, fft, inv_fft, result);
  m_of_tau(signal, 2.0 * result[0], scratch);
  result.iter_mut().zip(scratch).for_each(|(r, s)| *r = 2.0 * *r / *s);
}

pub struct PitchDetector {
  signal_complex: Vec<Complex<f32>>,
  scratch: Vec<f32>,
  scratch_complex: Vec<Complex<f32>>,
  fft: Arc<dyn Fft<f32>>,
  inv_fft: Arc<dyn Fft<f32>>,
  result: Vec<f32>,
}

impl PitchDetector {
  pub fn new(size: usize, padding: usize) -> Self {
    let mut planner = FftPlanner::new();
    Self {
      signal_complex: vec![Complex::zero(); size + padding],
      scratch: vec![f32::zero(); size + padding],
      scratch_complex: vec![Complex::zero(); size + padding],
      fft: planner.plan_fft_forward(size + padding),
      inv_fft: planner.plan_fft_inverse(size + padding),
      result: vec![f32::zero(); size + padding],
    }
  }

  pub fn get_pitch(
    &mut self,
    signal: &[f32],
    sample_rate: f32,
    power_threshold: f32,
    confidence_percent_threshold: f32,
    pick_threshold: f32,
  ) -> Option<f32> {
    if square_sum(signal) < power_threshold {
      None
    } else {
      normalized_square_difference(
        signal,
        &mut self.signal_complex,
        &mut self.scratch,
        &mut self.scratch_complex,
        &self.fft,
        &self.inv_fft,
        &mut self.result,
      );
      pitch_from_peaks(&self.result, sample_rate, confidence_percent_threshold, pick_threshold)
    }
  }
}
