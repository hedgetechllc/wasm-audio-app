import PitchNode from "./PitchNode";

async function getWebAudioMediaStream() {
  if (!window.navigator.mediaDevices) {
    throw new Error("This browser does not support web audio or it is not enabled.");
  }

  try {
    return await window.navigator.mediaDevices.getUserMedia({ audio: true, video: false });
  }
  catch (e) {
    switch (e.name) {
      case "NotAllowedError":
        throw new Error("A recording device was found but has been disallowed for this application. Enable the device in the browser settings.");
      case "NotFoundError":
        throw new Error("No recording device was found. Please attach a microphone and click Retry.");
      default:
        throw e;
    }
  }
}

export async function setupAudio(onPitchDetectedCallback) {
  // Request access to the microphone audio stream
  const mediaStream = await getWebAudioMediaStream();
  const context = new window.AudioContext();
  const audioSource = context.createMediaStreamSource(mediaStream);

  // Add the WebAssembly module for pitch detection to the current audio worklet
  const response = await window.fetch("wasm-audio/wasm_audio_bg.wasm");
  const wasmBytes = await response.arrayBuffer();
  await context.audioWorklet.addModule("PitchProcessor.js");

  // Create an AudioWorkletNode to allow the main JavaScript thread to communicate with the audio processor
  const numAudioSamplesPerAnalysis = 1024;
  let pitchNode = new PitchNode(context, "PitchProcessor");
  pitchNode.init(wasmBytes, onPitchDetectedCallback, numAudioSamplesPerAnalysis);

  // Connect the audio source to the pitch detection node and then to the output
  audioSource.connect(pitchNode);
  pitchNode.connect(context.destination);
  return { context, pitchNode };
}
