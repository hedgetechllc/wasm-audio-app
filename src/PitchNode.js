export default class PitchNode extends AudioWorkletNode {

  init(wasmBytes, onPitchDetectedCallback, numAudioSamplesPerAnalysis) {
    this.onPitchDetectedCallback = onPitchDetectedCallback;
    this.port.onmessage = (event) => this.onmessage(event.data);
    this.port.postMessage({
      type: "send-wasm-and-init",
      wasmBytes: wasmBytes,
      sampleRate: this.context.sampleRate,
      numAudioSamplesPerAnalysis: numAudioSamplesPerAnalysis
    });
  }

  onprocessorerror(err) {
    console.log(`An error from PitchProcessor.process() occurred: ${err}`);
  };

  onmessage(event) {
    if (event.type === "pitch") {
      this.onPitchDetectedCallback(event.pitch);
    }
  }
}
