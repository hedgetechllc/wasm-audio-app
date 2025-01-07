import "./TextEncoder.js";
import init, { WasmPitchDetector } from "./wasm-audio/wasm_audio.js";

class PitchProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.detector = null;
    this.totalSamples = 0;
    this.samples = new Float32Array(256);
    this.port.onmessage = (event) => this.onmessage(event.data);
  }

  onmessage(event) {
    if (event.type === "send-wasm-and-init") {
      const { wasmBytes, sampleRate, numAudioSamplesPerAnalysis } = event;
      init(WebAssembly.compile(wasmBytes)).then(() => {
        this.totalSamples = 0;
        this.samples = new Float32Array(numAudioSamplesPerAnalysis);
        this.detector = WasmPitchDetector.new(sampleRate, numAudioSamplesPerAnalysis);
      });
    }
  };

  process(inputs, _outputs) {
    // Only process the first input channel
    const inputChannels = inputs[0];
    const inputSamples = inputChannels[0];
    if (!inputChannels || !inputSamples)
      return true;

    // Fill the audio buffer with new samples
    if (this.totalSamples + inputSamples.length <= this.samples.length) {
      this.samples.set(inputSamples, this.totalSamples);
      this.totalSamples += inputSamples.length;
    }
    else {
      this.samples.copyWithin(0, inputSamples.length);
      this.samples.set(inputSamples, this.samples.length - inputSamples.length);
      this.totalSamples = this.samples.length;
    }

    // If enough samples exist, detect the pitch
    if (this.detector && this.totalSamples == this.samples.length) {
      const pitch_hz = this.detector.detect_pitch(this.samples);
      if (pitch_hz > 1.0)
        this.port.postMessage({ type: "pitch", pitch: pitch_hz });
    }
    return true;
  }
}

registerProcessor("PitchProcessor", PitchProcessor);
