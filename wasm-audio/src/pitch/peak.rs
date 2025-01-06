use alloc::vec::Vec;
use rustfft::num_traits::FromPrimitive;

struct PeaksIter<'a> {
  index: usize,
  data: &'a [f32],
}

impl<'a> PeaksIter<'a> {
  fn new(arr: &'a [f32]) -> Self {
    Self { data: arr, index: 0 }
  }
}

impl Iterator for PeaksIter<'_> {
  type Item = (usize, f32);

  fn next(&mut self) -> Option<(usize, f32)> {
    let mut idx = self.index;
    let mut max = -f32::INFINITY;
    let mut max_index = idx;

    // Skip over all positive values if first iteration
    if idx == 0 {
      idx += self.data.iter().take_while(|val| !val.is_sign_negative()).count();
    } else if idx >= self.data.len() {
      return None;
    }

    // Skip over all negative values until a positive value is found
    idx += self.data[idx..].iter().take_while(|val| val.is_sign_negative()).count();

    // Record the local max and max_index for the next stretch of positive values.
    for val in self.data[idx..].iter().take_while(|val| !val.is_sign_negative()) {
      if *val > max {
        max = *val;
        max_index = idx;
      }
      idx += 1;
    }
    self.index = idx;

    // Return the peak if it is not the first or last value
    if max == -f32::INFINITY || idx == self.data.len() {
      None
    } else {
      Some((max_index, max))
    }
  }
}

// Find `(index, value)` of positive peaks in `arr`. Every positive peak is preceded and succeeded
// by negative values, so any initial positive segment of `arr` does not produce a peak.
pub fn detect_peaks(arr: &[f32]) -> impl Iterator<Item = (usize, f32)> + '_ {
  PeaksIter::new(arr)
}

pub fn choose_peak(peaks: Vec<(usize, f32)>, threshold: f32, threshold2: f32) -> Option<(usize, f32)> {
  peaks.into_iter().find(|p| p.1 > threshold && p.1 > threshold2)
}

pub fn correct_peak(peak: (usize, f32), data: &[f32]) -> (f32, f32) {
  let idx = peak.0;
  let (x_offset, y_max) = find_quadratic_peak(data[idx - 1], data[idx], data[idx + 1]);
  (x_offset + f32::from_usize(idx).unwrap(), y_max)
}

// Quadratic interpolation to find the maximum of a parabola passing through `(-1, y0)`, `(0, y1)`, `(1, y2)`
fn find_quadratic_peak(y0: f32, y1: f32, y2: f32) -> (f32, f32) {
  let a = 0.5 * (y0 + y2) - y1;
  let b = 0.5 * (y2 - y0);
  let c = y1;

  // If concave up, the maximum is at one of the end points
  if a > 0.0 {
    if y0 > y2 {
      (-1.0, y0)
    } else {
      (1.0, y2)
    }
  } else {
    (-b / (2.0 * a), -b * b / (4.0 * a) + c)
  }
}
