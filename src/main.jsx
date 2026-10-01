import React, { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { ReactCompareSlider } from 'react-compare-slider';
import datasets from './datasets.json';
import './styles.css';

const methods = { bc1: 'BC1', neural: 'TSNC L1', neural_mse: 'TSNC MSE', uncompressed: 'Uncompressed' };
const asset = path => `${import.meta.env.BASE_URL}${path}`;
const clock = time => `${Math.floor(time / 60)}:${String(Math.floor(time % 60)).padStart(2, '0')}`;

function Icon({ name, ...props }) {
  const paths = { play: <path d="m9 5 11 7-11 7Z" />, pause: <><path d="M8 5v14M16 5v14" /></>, swap: <><path d="M4 8h16m-4-4 4 4-4 4M20 16H4m4-4-4 4 4 4" /></>, expand: <path d="M9 4H4v5m11-5h5v5M4 15v5h5m11-5v5h-5" />, previous: <path d="m15 5-7 7 7 7" />, next: <path d="m9 5 7 7-7 7" /> };
  return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>{paths[name]}</svg>;
}

function Comparison({ dataset, left, right }) {
  const leftVideo = useRef(null);
  const rightVideo = useRef(null);
  const container = useRef(null);
  const [playing, setPlaying] = useState(false);
  const [ready, setReady] = useState(false);
  const [time, setTime] = useState(0);
  const [error, setError] = useState('');
  const [position, setPosition] = useState(50);
  const [speed, setSpeed] = useState(1);
  const wantsPlayback = useRef(false);
  const videos = () => [leftVideo.current, rightVideo.current].filter(Boolean);

  useEffect(() => {
    const pair = videos();
    let disposed = false;
    let animation;
    const pause = () => { wantsPlayback.current = false; pair.forEach(v => v.pause()); setPlaying(false); };
    const tick = () => {
      if (disposed) return;
      const [a, b] = pair;
      if (!a.paused && !b.paused) {
        if (Math.abs(a.currentTime - b.currentTime) > 1 / dataset.fps) b.currentTime = a.currentTime;
        setTime(a.currentTime);
      }
      animation = requestAnimationFrame(tick);
    };
    const canPlay = () => {
      if (pair.every(v => v.readyState >= 3 && !v.seeking)) {
        setReady(true);
        if (wantsPlayback.current) Promise.all(pair.map(v => v.play())).catch(err => {
          if (!disposed && err.name !== 'AbortError') { pause(); setError('Playback was interrupted. Press play to try again.'); }
        });
      }
    };
    const ended = () => { pause(); pair.forEach(v => { v.currentTime = 0; }); setTime(0); };
    const failed = () => { pause(); setError('This video could not be loaded. Check that the media files are available, then try another dataset.'); };
    const waiting = () => { pair.forEach(v => v.pause()); setReady(false); };
    pair.forEach(v => { v.addEventListener('canplay', canPlay); v.addEventListener('seeked', canPlay); v.addEventListener('ended', ended); v.addEventListener('error', failed); v.addEventListener('waiting', waiting); });
    canPlay();
    animation = requestAnimationFrame(tick);
    return () => {
      disposed = true;
      cancelAnimationFrame(animation);
      wantsPlayback.current = false;
      pair.forEach(v => { v.pause(); v.removeEventListener('canplay', canPlay); v.removeEventListener('seeked', canPlay); v.removeEventListener('ended', ended); v.removeEventListener('error', failed); v.removeEventListener('waiting', waiting); });
    };
  }, [dataset]);

  async function toggle() {
    if (playing) { wantsPlayback.current = false; videos().forEach(v => v.pause()); setPlaying(false); return; }
    setError('');
    wantsPlayback.current = true;
    setPlaying(true);
    try {
      videos().forEach(v => { v.playbackRate = speed; });
      await Promise.all(videos().map(v => v.play()));
      setPlaying(true);
    } catch (err) { if (err.name !== 'AbortError') { wantsPlayback.current = false; videos().forEach(v => v.pause()); setPlaying(false); setError('Playback was interrupted. Press play to try again.'); } }
  }
  function seek(value) {
    const target = Math.min(Number(value), dataset.duration - 1 / dataset.fps);
    setReady(false);
    videos().forEach(v => { v.pause(); v.currentTime = target; });
    setTime(target);
  }
  function changeSpeed(value) { setSpeed(Number(value)); videos().forEach(v => { v.playbackRate = Number(value); }); }
  const video = (ref, method) => <video ref={ref} src={asset(dataset.videos[method])} poster={asset(dataset.poster)} muted playsInline preload="auto" aria-label={`${dataset.name} — ${methods[method]}`} className="comparison-video" />;

  return <div className="player" ref={container}>
    <div className="video-stage">
      <ReactCompareSlider className="compare-slider" itemOne={video(leftVideo, left)} itemTwo={video(rightVideo, right)} defaultPosition={50} onPositionChange={setPosition} onlyHandleDraggable keyboardIncrement="1%" />
      <span className="video-label label-left">{methods[left]}</span><span className="video-label label-right">{methods[right]}</span>
      {!ready && !error && <div className="loading" role="status">Loading comparison…</div>}
    </div>
    <div className="transport">
      <button className="play-button" onClick={toggle} disabled={!ready && !playing} aria-label={playing ? 'Pause videos' : 'Play videos'}><Icon name={playing ? 'pause' : 'play'} /></button>
      <span className="time">{clock(time)} <span>/ {clock(dataset.duration)}</span></span>
      <input className="timeline" type="range" min="0" max={dataset.duration} step={1 / dataset.fps} value={time} disabled={!ready} onChange={e => seek(e.target.value)} aria-label="Video timeline" />
      <select className="speed" aria-label="Playback speed" value={speed} onChange={e => changeSpeed(e.target.value)}><option value="0.5">0.5×</option><option value="1">1×</option><option value="2">2×</option></select>
      <button className="icon-button" aria-label="Fullscreen comparison" onClick={() => { const action = document.fullscreenElement ? document.exitFullscreen() : container.current.requestFullscreen?.(); action?.catch(() => setError('Fullscreen is unavailable in this browser.')); }}><Icon name="expand" /></button>
    </div>
    <div className="compare-help"><span><span className="green-dot" />Synchronized playback</span><span>Drag the divider to compare · {Math.round(position)} / {100 - Math.round(position)}</span></div>
    {error && <p className="error" role="alert">{error}</p>}
  </div>;
}

function App() {
  const initial = new URLSearchParams(location.search);
  const [index, setIndex] = useState(Math.max(0, datasets.findIndex(d => d.id === initial.get('dataset'))));
  const [left, setLeft] = useState(Object.hasOwn(methods, initial.get('left')) ? initial.get('left') : 'neural');
  const [right, setRight] = useState(Object.hasOwn(methods, initial.get('right')) ? initial.get('right') : 'uncompressed');
  const dataset = datasets[index];
  const activeCard = useRef(null);
  const datasetStrip = useRef(null);
  useEffect(() => {
    const url = new URL(location.href);
    url.searchParams.set('dataset', dataset.id); url.searchParams.set('left', left); url.searchParams.set('right', right);
    history.replaceState(null, '', url);
    if (activeCard.current && datasetStrip.current) {
      const card = activeCard.current.getBoundingClientRect();
      const strip = datasetStrip.current.getBoundingClientRect();
      const offset = card.left < strip.left ? card.left - strip.left : card.right > strip.right ? card.right - strip.right : 0;
      datasetStrip.current.scrollBy({ left: offset, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' });
    }
  }, [dataset, left, right]);
  const selector = (side, value, change) => <label className="method-select"><span>{side} VIEW</span><select aria-label={`${side === 'LEFT' ? 'Left' : 'Right'} method`} value={value} onChange={e => change(e.target.value)}>{Object.entries(methods).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label>;

  return <div className="site-shell">
    <header className="site-header"><a className="brand" href={import.meta.env.BASE_URL} aria-label="TSNC home"><span className="brand-mark">▥</span> TSNC<span className="brand-divider" /><span className="brand-description">Texture Set Neural Compression</span></a><span className="header-tag"><span className="green-dot" /> Interactive comparison</span></header>
    <main>
      <div className="intro"><p className="eyebrow">THE DETAILS MAKE THE DIFFERENCE</p><h1>Less data. <span>Same detail.</span></h1><p className="intro-copy">Explore texture compression, side by side.<br className="mobile-break" /> Ten datasets. Four methods. Your perspective.</p></div>
      <section className="workspace" aria-label="Dataset video comparison">
        <div className="workspace-top"><div className="dataset-heading"><span className="eyebrow">DATASET {String(index + 1).padStart(2, '0')} / {datasets.length}</span><h2>{dataset.name}</h2></div><div className="method-controls">{selector('LEFT', left, setLeft)}<button className="swap-button" aria-label="Swap comparison sides" onClick={() => { setLeft(right); setRight(left); }}><Icon name="swap" /></button>{selector('RIGHT', right, setRight)}</div></div>
        <Comparison key={`${dataset.id}-${left}-${right}`} dataset={dataset} left={left} right={right} />
        <div className="dataset-meta"><span>{dataset.width} × {dataset.height}<i />{dataset.fps} FPS<i />360° orbit</span><span>Rendered captures · {dataset.duration}s</span></div>
      </section>
      <section className="dataset-library" aria-label="Choose a dataset"><div className="library-heading"><div><h2>Explore the datasets <span>{datasets.length}</span></h2><p>Select a scene to take a closer look.</p></div><div className="dataset-navigation"><button className="icon-button" aria-label="Previous dataset" disabled={index === 0} onClick={() => setIndex(index - 1)}><Icon name="previous" /></button><button className="icon-button" aria-label="Next dataset" disabled={index === datasets.length - 1} onClick={() => setIndex(index + 1)}><Icon name="next" /></button></div></div>
        <div className="dataset-strip" ref={datasetStrip}>{datasets.map((d, i) => <button key={d.id} ref={i === index ? activeCard : null} className={`dataset-card ${i === index ? 'active' : ''}`} aria-pressed={i === index} onClick={() => setIndex(i)}><div className="thumbnail"><img src={asset(d.poster)} alt="" loading="lazy" /><span className="card-index">{String(i + 1).padStart(2, '0')}</span>{i === index && <span className="selected-dot" />}</div><span className="card-name">{d.name}</span></button>)}</div>
      </section>
    </main>
    <footer><span><strong>TSNC</strong> · Texture Set Neural Compression</span><span>Built for a closer look.</span></footer>
  </div>;
}

createRoot(document.getElementById('root')).render(<App />);
