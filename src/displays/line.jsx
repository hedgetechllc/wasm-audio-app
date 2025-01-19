import React from "react";
import PropTypes from 'prop-types';
import { scaleLinear } from 'd3-scale';
import init, { WasmPitchDetector } from "../../public/wasm-audio/wasm_audio.js";

const NOTE_STRINGS = ["C", "D♭", "D", "E♭", "E", "F", "G♭", "G", "A♭", "A", "B♭", "B"];

const OCTAVE_COLORS = [
  [121, 85, 72],
  [158, 158, 158],
  [96, 125, 139],
  [76, 175, 80],
  [244, 67, 54],
  [33, 150, 243],
  [0, 150, 136],
  [255, 235, 59],
  [0, 188, 212],
];

function colorFromMidiNote(note) {
  const octave = Math.floor(note / 12) - 1;
  const idx = Math.max(0, Math.min(octave, OCTAVE_COLORS.length - 1));
  return OCTAVE_COLORS[idx];
}

class PitchDisplay {
  
  loadWasm() {
    fetch('wasm-audio/wasm_audio_bg.wasm')
      .then(response => response.arrayBuffer())
      .then(bytes => init(WebAssembly.compile(bytes)))
      .then(() => {
        this.wasm = WasmPitchDetector;
      });
  }

  constructor(container) {
    this.wasm = null;
    this.container = container;
    this.frequencies = [];
    this.background = '#f5f5f5';
    this.highlight = '#888888';
    this.lastRender = 0;

    const canvasStyle = "position: absolute; width: 100%; height: 100%; top: 0; left: 0;";
    this.bgCanvas = document.createElement("canvas");
    this.bgCanvas.setAttribute("style", canvasStyle);
    this.bgContext = this.bgCanvas.getContext('2d');

    this.noteCanvas = document.createElement("canvas");
    this.noteCanvas.setAttribute("style", canvasStyle);
    this.noteContext = this.noteCanvas.getContext('2d');
    
    this.container.appendChild(this.bgCanvas);
    this.container.appendChild(this.noteCanvas);

    this.timeSpan = 6000;
    this.timeOffset = 5000;

    this.loadWasm();
    this.resize();
  }

  resize() {
    let w = this.container.clientWidth;
    let h = this.container.clientHeight;

    this.bgCanvas.width = w;
    this.bgCanvas.height = h;
    this.noteCanvas.width = w;
    this.noteCanvas.height = h;

    this.scaleX = scaleLinear()
      .domain([-this.timeOffset, -this.timeOffset + this.timeSpan])
      .range([0, w]);

    let margin = h / (NOTE_STRINGS.length + 1);
    this.scaleY = scaleLinear()
      .domain([0, NOTE_STRINGS.length - 1])
      .range([h - margin, margin]);

    this.render();
  }

  pushFrequency(frequency) {
    this.frequencies.push(frequency);
  }

  cleanupFrequencies() {
    this.frequencies = this.frequencies.filter((val) => this.now - val.time < this.timeOffset);
  }

  render(full = true) {
    this.now = (new Date()).getTime();
    this.cleanupFrequencies();
    if (full)
      this.drawBackground();
    this.drawNotes();
  }

  drawBackground() {
    let w = this.bgCanvas.width;
    let h = this.bgCanvas.height;
    this.bgContext.fillStyle = this.background;
    this.bgContext.clearRect(0, 0, w, h);
    this.bgContext.fillRect(0, 0, w, h);

    for (let i = 0; i < NOTE_STRINGS.length; ++i) {
      let y = this.scaleY(i);
      this.bgContext.fillStyle = this.highlight + '55';
      this.bgContext.fillRect(0, y, w, 1);
      this.bgContext.fillStyle = this.highlight;
      this.bgContext.font = '14px Sans'
      this.bgContext.fillText(NOTE_STRINGS[i], this.scaleX(0) + 20, y - 2);
      this.bgContext.fillText(NOTE_STRINGS[i], 20, y - 2);
    }

    this.bgContext.fillStyle = this.highlight + '55';
    this.bgContext.fillRect(this.scaleX(0), 0, 1, h);
  }

  drawNotes() {
    let w = this.noteCanvas.width;
    let h = this.noteCanvas.height;
    
    this.noteContext.clearRect(0, 0, w, h);
    this.noteContext.beginPath();
    this.noteContext.strokeStyle = 'rgba(0, 0, 0, 0.1)';

    // Calculate notes and colors from frequencies
    const notes = [];
    for (let frequency of this.frequencies) {
      let t = frequency.time;
      let f = frequency.frequency;
      let c = frequency.clarity;
      let note = this.wasm ? this.wasm.pitch_to_midi_note(f) : 0;
      let centsOff = this.wasm ? this.wasm.cents_from_correct_pitch(f, note) : 0;
      let x = this.scaleX(t - this.now);
      let y = this.scaleY(note % 12 + centsOff / 100);
      let color = colorFromMidiNote(note);
      notes.push({
        time: t,
        x,
        y,
        clarity: c,
        color
      })
    }

    // Draw lines
    const timeCutoff = 500;
    this.noteContext.beginPath();
    for (let i = 1; i < notes.length; ++i) {
      const {x, y, time} = notes[i];
      const prevTime = notes[i - 1].time;
      if (time - prevTime > timeCutoff) {
        this.noteContext.stroke();
        this.noteContext.beginPath();
        this.noteContext.moveTo(x, y);
      } else {
        this.noteContext.lineTo(x, y);
      }
    }
    this.noteContext.stroke();

    // Draw circles
    for (let note of notes) {
      const {x, y, clarity, color} = note;
      this.noteContext.fillStyle = `rgba(${color[0]}, ${color[1]}, ${color[2]}, ${clarity * 0.5})`;
      this.noteContext.beginPath();
      this.noteContext.arc(x, y, 3, 0, Math.PI * 2);
      this.noteContext.fill();
    }
  }

  updatePitch(latestPitch) {
    const time = new Date().getTime();
    if (time - this.lastRender < 17)
      return;
    if (latestPitch && latestPitch > 0) {// && (this.frequencies.length === 0 || this.frequencies.at(-1).frequency != latestPitch)) {
      this.pushFrequency({
        frequency: latestPitch,
        clarity: 1.0,
        time,
      });
    }
    this.lastRender = time;
    this.render(false);
  }
}

LinearChart.propTypes = {
  latestPitch: PropTypes.number.isRequired,
};

let display = null;
export function LinearChart({ latestPitch }) {
  const surroundingDivRef = React.useRef();

  React.useEffect(() => {
    if (!display)
      display = new PitchDisplay(surroundingDivRef.current);
    window.addEventListener('resize', display.resize.bind(display));
    return () => {
      window.removeEventListener('resize', display.resize.bind(display));
    };
  }, [surroundingDivRef]);

  React.useEffect(() => {
    const escape = { cancelRender: false };
    function renderFrame() {
      if (!escape.cancelRender) {
        requestAnimationFrame(renderFrame);
        display.updatePitch(latestPitch);
      }
    }
    renderFrame();
    return () => { escape.cancelRender = true; };
  }, [display, latestPitch]);

  return (
    <div ref={surroundingDivRef} className="full" style={{position: "relative"}} />
  );
}
