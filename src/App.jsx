import React from "react";
import PropTypes from 'prop-types';
import { setupAudio } from "./setupAudio";
import "./App.css";

function PitchReadout({ running, latestPitch }) {
  return (
    <div className="Pitch-readout">
      {
        latestPitch
           ? `Latest pitch: ${latestPitch.toFixed(1)} Hz`
           : running ? "Listening..." : "Paused"
      }
    </div>
  );
}

PitchReadout.propTypes = {
  running: PropTypes.bool.isRequired,
  latestPitch: PropTypes.number
};

function AudioRecorderControl() {
  // Retrieve latest app states
  const [audio, setAudio] = React.useState(undefined);
  const [running, setRunning] = React.useState(false);
  const [latestPitch, setLatestPitch] = React.useState(undefined);

  // Initialize the Web Audio API one-time only
  if (!audio) {
    return (
      <button
        onClick={async () => {
          setAudio(await setupAudio(setLatestPitch));
          setRunning(true);
        }}
      >
        Start listening
      </button>
    );
  }

  // Suspend or resume pitch detection based on the current state
  const { context } = audio;
  return (
    <div>
      <button
        onClick={async () => {
          if (running) {
            await context.suspend();
          } else {
            await context.resume();
          }
          setRunning(context.state === "running");
        }}
        disabled={context.state !== "running" && context.state !== "suspended"}
      >
        {running ? "Pause" : "Resume"}
      </button>
      <PitchReadout running={running} latestPitch={latestPitch} />
    </div>
  );
}

function App() {
  return (
    <div className="App">
      <header className="App-header">
        Wasm Audio Tutorial
      </header>
      <div className="App-content">
        <AudioRecorderControl />
      </div>
    </div>
  );
}

export default App;
