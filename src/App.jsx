import React, { useState } from "react";
import { setupAudio, stopAudio } from "./setupAudio";
import { CircleChart } from './displays/circle';
import { LinearChart } from "./displays/line";
import "./App.css";

function App() {
  const [content, setContent] = useState(undefined);
  const [audio, setAudio] = useState(undefined);
  const [running, setRunning] = useState(false);
  const [latestPitch, setLatestPitch] = useState(440);

  React.useEffect(() => {
    if (running)
      setupAudio(setLatestPitch).then(setAudio);
    else
      stopAudio(audio).then(setAudio);
  }, [running]);

  return (
    <div className="App">
      <div className="App-nav">
        <div className="App-header">
          Interface Options
        </div>
        <div className="App-controls">
          <button onClick={() => {setContent('circular');}}>
            Circular Visualizer
          </button>
          <button onClick={() => {setContent('linear');}}>
            Line Visualizer
          </button>
          <button onClick={() => {setContent('note');}}>
            Note Detector
          </button>
        </div>
        <div className="Audio-controls">
          <button className="play" onClick={() => {setRunning(!running);}}>
            {running ? 'Stop' : 'Start'}
          </button>
        </div>
      </div>
      <div className="App-content">
        {(() => {
          switch (content) {
            case 'circular':
              return <CircleChart latestPitch={latestPitch} />;
            case 'linear':
              return <LinearChart latestPitch={latestPitch} />;
            case 'note':
              return <span className="instruction">Not yet implemented...</span>;
            default:
              return <span className="instruction">Select a demo interface from the left...</span>;
          }
        })()}
      </div>
    </div>
  );
}

export default App;
