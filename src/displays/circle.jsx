import React from "react";
import PropTypes from 'prop-types';

const NOTE_SYMBOLS_FLAT = {
  C: 'C',
  Db: 'D♭',
  D: 'D',
  Eb: 'E♭',
  E: 'E',
  F: 'F',
  Gb: 'G♭',
  G: 'G',
  Ab: 'A♭',
  A: 'A',
  Bb: 'B♭',
  B: 'B',
};

export function drawCircleChartBackground(ctx, [w, h], options = {}) {
  const offsetAngle = 0;
  const [cX, cY] = [w / 2, h / 2];
  const outerR = options.outerR ?? Math.min(w, h) / 3;
  const innerR = options.innerR ?? outerR * 0.6;

  const ring = new Path2D();
  ring.arc(cX, cY, outerR, 0, 2 * Math.PI);
  // If we don't move to the start of the next arc, there
  // will be a line connecting them.
  ring.moveTo(cX + innerR, cY);
  ring.arc(cX, cY, innerR, 0, 2 * Math.PI);
  ctx.fillStyle = 'rgb(204,204,240)';
  ctx.fill(ring, 'evenodd');

  ctx.strokeStyle = 'rgb(110,102,102)';

  // draw some ticks
  const ticks = new Path2D();
  for (let i = 0; i < 5 * 12; i++) {
    const angle = (i / (5 * 12)) * 2 * Math.PI - offsetAngle;
    let tickLen = 0.5;
    if (i % 5 === 0) {
      // Every fifth tick is long
      tickLen = 1.0;
    }
    const vecX = Math.cos(angle);
    const vecY = Math.sin(angle);
    ticks.moveTo(vecX * outerR + cX, vecY * outerR + cY);
    ticks.lineTo(
      vecX * (1 - 0.08 * tickLen) * outerR + cX,
      vecY * (1 - 0.08 * tickLen) * outerR + cY
    );
  }
  ctx.lineWidth = 2;
  ctx.stroke(ticks);

  ctx.lineWidth = 1;
  ctx.stroke(ring);

  return { innerR, outerR };
}

export function freqToNote(freq) {
  const notes = Object.keys(NOTE_SYMBOLS_FLAT);
  const logNote = Math.log2(freq) - LOG_A;
  // LOG_A is the log of A_4
  const octave = Math.floor(logNote) + 4;
  const rot = (((logNote - 0.25) % 1) + 1) % 1;
  for (let i = 0; i < 12; i++) {
    const low = i / 12 - 1 / 24;
    const hi = i / 12 + 1 / 24;
    if (rot > low && rot <= hi) {
      return { note: notes[i], octave };
    }
  }
  return { note: 'C', octave };
}

const LOG_A = Math.log2(440);

export function freqToAngle(freq) {
  // We subtract 0.5, because A is halfway around the circle chart from 0 deg.
  return ((((Math.log2(freq) - LOG_A - 0.5) % 1) + 1) % 1) * Math.PI * 2;
}

export function computeInnerAndOuterRadius(w, h) {
  const outerR = Math.min(w, h) / 3;
  const innerR = outerR * 0.6;
  return { innerR, outerR };
}

export function radialBoxLayoutOffsets(angle, r, w, h) {
  let [outx, outy] = [0, 0];
  angle = ((angle % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
  if (r === 0)
    return [outx, outy];

  const criticalrange1 = Math.atan(w / 2.0 / (r + h / 2.0));
  const criticalrange2 = Math.atan(w / 2.0 / (r + h / 2.0));

  // Edge is touching
  if (angle < 0 + criticalrange1 || angle > 2 * Math.PI - criticalrange1) {
    outx = r;
    outy = -(r + w / 2) * Math.tan(angle) - h / 2.0;
  } else if (angle > Math.PI - criticalrange1 && angle < Math.PI + criticalrange1) {
    outx = -r - w;
    outy = -(r + w / 2) * Math.tan(Math.PI - angle) - h / 2.0;
  } else if (angle > Math.PI / 2 - criticalrange2 && angle < Math.PI / 2 + criticalrange2) {
    outx =
      Math.sqrt((w * w) / 4.0 + (r + h / 2.0) * (r + h / 2.0)) *
      Math.sin(Math.PI / 2.0 - angle) -
      w / 2.0;
    outy = -(r + h);
  } else if (angle > (Math.PI * 3) / 2 - criticalrange2 && angle < (Math.PI * 3) / 2 + criticalrange2) {
    outx =
      Math.sqrt((w * w) / 4.0 + (r + h / 2.0) * (r + h / 2.0)) *
      Math.sin(Math.PI / 2 - angle) -
      w / 2;
    outy = r;
  }
  // Corner is touching
  else if (angle >= 0 + criticalrange1 && angle <= Math.PI / 2 - criticalrange2) {
    const a = Math.sqrt((w * w) / 4.0 + (h * h) / 4.0);
    const b = r;
    const B = angle - Math.atan(h / w);
    const c = Math.sqrt(b * b + (Math.cos(B) * Math.cos(B) - 1) * a * a) + Math.cos(B) * a;
    outx = c * Math.cos(angle) - w / 2.0;
    outy = -(c * Math.sin(angle) + h / 2.0);
  } else if (angle >= Math.PI / 2 + criticalrange2 && angle <= Math.PI - criticalrange1) {
    //adjust angle so we can pretend we're in the first quadrant
    angle = Math.PI - angle;
    const a = Math.sqrt((w * w) / 4.0 + (h * h) / 4.0);
    const b = r;
    const B = angle - Math.atan(h / w);
    const c = Math.sqrt(b * b + (Math.cos(B) * Math.cos(B) - 1) * a * a) + Math.cos(B) * a;
    outx = -(c * Math.cos(angle) - w / 2) - w;
    outy = -(c * Math.sin(angle) + h / 2);
  } else if (angle >= Math.PI + criticalrange1 && angle <= (Math.PI * 3) / 2 - criticalrange2) {
    // adjust angle so we can pretend we're in the first quadrant
    angle -= Math.PI;
    const a = Math.sqrt((w * w) / 4 + (h * h) / 4);
    const b = r;
    const B = angle - Math.atan(h / w);
    const c = Math.sqrt(b * b + (Math.cos(B) * Math.cos(B) - 1) * a * a) + Math.cos(B) * a;
    outx = -c * Math.cos(angle) - w / 2;
    outy = c * Math.sin(angle) - h / 2;
  } else if (angle >= (Math.PI * 3) / 2 + criticalrange2 && angle <= 2 * Math.PI - criticalrange1) {
    // adjust angle so we can pretend we're in the first quadrant
    angle = 2 * Math.PI - angle;
    const a = Math.sqrt((w * w) / 4 + (h * h) / 4);
    const b = r;
    const B = angle - Math.atan(h / w);
    const c = Math.sqrt(b * b + (Math.cos(B) * Math.cos(B) - 1) * a * a) + Math.cos(B) * a;
    outx = c * Math.cos(angle) - w / 2;
    outy = c * Math.sin(angle) - h / 2;
  }
  return [outx, outy];
}

function drawCircleChartArrow(ctx, [w, h], options) {
  const { angle, opacity, innerR, outerR } = options;
  const [vec_x, vec_y] = [Math.cos(angle), Math.sin(angle)];
  // Compute the normal vector
  const [nvec_x, nvec_y] = [-vec_y, vec_x];

  ctx.moveTo(
    vec_x * innerR + 3 * nvec_x + w / 2,
    -(vec_y * innerR + 3 * nvec_y) + h / 2
  );
  ctx.lineTo(
    vec_x * innerR - 3 * nvec_x + w / 2,
    -(vec_y * innerR - 3 * nvec_y) + h / 2
  );
  ctx.lineTo(vec_x * outerR + w / 2, -(vec_y * outerR) + h / 2);

  ctx.fillStyle = `rgba(0,128,204,${opacity})`;
  ctx.fill();
  ctx.strokeStyle = `rgba(0,77,204,${opacity})`;
  ctx.lineJoin = 'bevel';
  ctx.stroke();
}

function Frequency({hz}) {
  const noteSymbols = NOTE_SYMBOLS_FLAT;
  const { note, octave } = freqToNote(hz);
  return (
    <div className="freq-container">
      <span className="freq-note">
        {noteSymbols[note]}
        <span className="freq-octave">{octave}</span>
      </span>
      <span className="freq-hz">{Math.round(hz)} Hz</span>
    </div>
  );
}

Frequency.propTypes = {
  hz: PropTypes.number.isRequired,
};

const CircleChartBackground = React.memo(function CircleChartBackground({w, h}) {
  const canvas = React.useRef();
  // The note labels are rendered in divs so we can use CSS to style them.
  // We need to store refs to all these divs so we can dynamically compute their
  // sizes.
  const noteRefs = React.useRef([
    { current: null },
    { current: null },
    { current: null },
    { current: null },
    { current: null },
    { current: null },
    { current: null },
    { current: null },
    { current: null },
    { current: null },
    { current: null },
    { current: null },
  ]);
  const offsetAngle = 0;
  const [cX, cY] = [w / 2, h / 2];
  const outerR = Math.min(w, h) / 3;
  const innerR = outerR * 0.6;

  const noteSymbols =  NOTE_SYMBOLS_FLAT;
  const notes = Object.keys(noteSymbols);

  React.useEffect(() => {
    const ctx = canvas.current?.getContext('2d');
    if (!ctx)
      return;

    drawCircleChartBackground(ctx, [w, h], { innerR, outerR });
    // Position all the labels
    for (let i = 0; i < 12; i++) {
      const angle = (-i / 12.0) * 2 * Math.PI + Math.PI / 2 + offsetAngle;
      const ref = noteRefs.current[i];
      if (!ref.current) {
        continue;
      }
      const div = ref.current;
      const { width: divW, height: divH } = div.getBoundingClientRect();
      const [ox, oy] = radialBoxLayoutOffsets(angle, outerR + 4, divW, divH);
      div.style.left = `${ox + cX}px`;
      div.style.top = `${oy + cY}px`;
    }
  }, [w, h, cX, cY, innerR, outerR, offsetAngle]);

  return (
    <React.Fragment>
      <canvas width={w} height={h} ref={canvas} className="freq-background" style={{width: '100%'}} />
      {noteRefs.current.map((ref, i) => (
        <div key={i} ref={ref} className="freq-note-label">
          {noteSymbols[notes[i]]}
        </div>
      ))}
    </React.Fragment>
  );
});

CircleChartBackground.propTypes = {
  w: PropTypes.number.isRequired,
  h: PropTypes.number.isRequired,
};

CircleChart.propTypes = {
  latestPitch: PropTypes.number.isRequired,
};

export function CircleChart({ latestPitch }) {
  const angle = freqToAngle(latestPitch);
  const [w, setW] = React.useState(400);
  const [h, setH] = React.useState(400);
  const canvasPointerRef = React.useRef();
  const surroundingDivRef = React.useRef();
  const { innerR, outerR } = computeInnerAndOuterRadius(w, h);

  React.useLayoutEffect(() => {
    function handleResize() {
      const { width, height } = surroundingDivRef.current.getBoundingClientRect();
      setW(width);
      setH(height);
    }

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [surroundingDivRef]);

  React.useEffect(() => {
    if (canvasPointerRef.current) {
      const pointerContext = canvasPointerRef.current.getContext('2d');
      if (pointerContext) {
        drawCircleChartArrow(pointerContext, [w, h], {
          angle: 0,
          opacity: 0.8,
          innerR,
          outerR,
        });
      }
    }
  }, [w, h, innerR, outerR]);

  return (
    <div ref={surroundingDivRef} className="freq-surround">
      <CircleChartBackground w={w} h={h} />
      {<Frequency hz={latestPitch} />}
      <canvas
        className="freq-pointer"
        width={w}
        height={h}
        ref={canvasPointerRef}
        style={{
          transformOrigin: 'center',
          transform: `rotate(${angle}rad)`,
          visibility: 'visible',
        }}
      />
    </div>
  );
}
