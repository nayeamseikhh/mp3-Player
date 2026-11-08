import { lazy, Suspense, useState } from 'react';
import { usePlayerStore } from '@store/store';
import Slider from '@components/common/Slider';
import Button from '@components/common/Button';
import Card from '@components/common/Card';

const BANDS = [
  { id: 0, label: '32 Hz', centerFreq: 32 },
  { id: 1, label: '64 Hz', centerFreq: 64 },
  { id: 2, label: '125 Hz', centerFreq: 125 },
  { id: 3, label: '250 Hz', centerFreq: 250 },
  { id: 4, label: '500 Hz', centerFreq: 500 },
  { id: 5, label: '1 kHz', centerFreq: 1000 },
  { id: 6, label: '2 kHz', centerFreq: 2000 },
  { id: 7, label: '4 kHz', centerFreq: 4000 },
  { id: 8, label: '8 kHz', centerFreq: 8000 },
  { id: 9, label: '16 kHz', centerFreq: 16000 },
];

const PRESETS = [
  { name: 'Flat', bands: [0,0,0,0,0,0,0,0,0,0] },
  { name: 'Rock', bands: [5,3,-2,-2,-2,2,3,5,3,0] },
  { name: 'Pop', bands: [3,2,0,-2,-4,-2,0,3,5,2] },
  { name: 'Jazz', bands: [5,3,0,-2,-2,0,3,5,3,0] },
  { name: 'Classical', bands: [2,4,3,1,-2,-1,-1,-1,0,2] },
  { name: 'Acoustic', bands: [1,2,3,2,0,-2,-4,-2,0,1] },
  { name: 'Electronic', bands: [4,2,0,-2,-4,-2,0,3,5,4] },
];

const Visualization = lazy(() => import('@components/music/Visualization'));
const LyricsDisplay = lazy(() => import('@components/music/LyricsDisplay'));

export default function Equalizer() {
  const {
    equalizerBands,
    setEqualizerBands,
    setEqualizerPreset,
    equalizerPreset,
    bassBoost,
    setBassBoost,
    trebleBoost,
    setTrebleBoost,
    balance,
    setBalance,
    currentTrack,
  } = usePlayerStore();
  const [activeBand, setActiveBand] = useState(null);

  const handleBandChange = (index, value) => {
    const newBands = [...equalizerBands];
    newBands[index] = value;
    setEqualizerBands(newBands);
    setActiveBand(index);
  };

  const applyPreset = (preset) => {
    setEqualizerBands(preset.bands);
    setEqualizerPreset(preset.name);
  };

  const formatFreq = (freq) => {
    if (freq >= 1000) return `${freq / 1000} kHz`;
    return `${freq} Hz`;
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 animate-fade-in max-w-4xl mx-auto">
      <h2 className="text-2xl font-bold text-text-primary mb-6 sm:mb-8 sm:text-3xl">Equalizer</h2>
      <div className="space-y-8">
        {/* Presets Section */}
        <Card className="p-4 mb-8">
          <h3 className="font-semibold text-text-primary mb-4">Presets</h3>
          <div className="flex gap-2 overflow-x-auto pb-2">
            {PRESETS.map((preset) => (
              <button
                key={preset.name}
                onClick={() => applyPreset(preset)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                  equalizerPreset === preset.name
                    ? 'bg-accent text-accent-foreground'
                    : 'bg-bg-tertiary text-text-secondary hover:bg-accent/10 border border-border-default'
                }`}
              >
                {preset.name}
              </button>
            ))}
          </div>
        </Card>

        {/* Equalizer Bands */}
        <Card className="p-6 mb-8">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-semibold text-text-primary mb-1">Frequency Bands</h3>
            <p className="text-xs text-text-secondary">Adjust frequency response</p>
          </div>
          <div className="grid grid-cols-5 sm:grid-cols-10 gap-2">
            {BANDS.map((band) => (
              <div key={band.id} className="flex flex-col items-center justify-center gap-2 h-full">
                <div className="w-8 h-12 bg-bg-tertiary border border-border-default rounded-t-lg flex flex-col items-center justify-end p-1">
                  <span className="text-[10px] text-text-secondary">{activeBand === band.id ? equalizerBands[band.id] : ''}</span>
                </div>
                <div className="relative h-48 w-full flex items-end gap-1">
                  <div className="absolute bottom-0 w-full bg-accent/20 rounded-full h-1"></div>
                  <div className="relative h-32 w-full bg-accent rounded-full h-full flex flex-col items-center justify-end z-10 cursor-pointer">
                    <div className="h-[calc(var(--band-height,100%) - 16px)] w-full bg-accent flex items-end justify-center cursor-pointer" style={{ flexBasis: `calc(50% + ${equalizerBands[band.id]} * 20%)` }}>
                      <Slider
                        value={equalizerBands[band.id] + 100}
                        min={0}
                        max={200}
                        onChange={(v) => handleBandChange(band.id, v - 100)}
                        className={`h-[calc(100% + 16px)] bg-transparent rounded-none -translate-y-8`}
                      />
                    </div>
                    <div className="absolute bottom-[16px] w-full text-[10px] text-text-secondary">
                      {formatFreq(band.centerFreq)}
                    </div>
                  </div>
                </div>
                <span className="text-xs text-text-secondary">{band.label}</span>
              </div>
            ))}
          </div>
        </Card>

        {/* Bass / Treble / Balance */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="p-4">
            <h4 className="font-medium text-text-primary mb-3">Bass Boost</h4>
            <div className="flex items-center gap-2">
              <span className="text-xs text-text-secondary">-100%</span>
              <Slider value={bassBoost + 100} min={0} max={200} onChange={(v) => setBassBoost(v - 100)} />
              <span className="text-xs text-text-secondary">+100%</span>
            </div>
          </Card>
          <Card className="p-4">
            <h4 className="font-medium text-text-primary mb-3">Treble Boost</h4>
            <div className="flex items-center gap-2">
              <span className="text-xs text-text-secondary">-100%</span>
              <Slider value={trebleBoost + 100} min={0} max={200} onChange={(v) => setTrebleBoost(v - 100)} />
              <span className="text-xs text-text-secondary">+100%</span>
            </div>
          </Card>
          <Card className="p-4">
            <h4 className="font-medium text-text-primary mb-3">Balance</h4>
            <div className="flex items-center gap-2">
              <span className="text-xs text-text-secondary">Left</span>
              <Slider value={(balance + 1) * 50} min={0} max={100} onChange={(v) => setBalance(v / 50 - 1)} />
              <span className="text-xs text-text-secondary">Right</span>
            </div>
          </Card>
        </div>

        {/* Visualization and Lyrics Components */}
        <div className="space-y-8">
          <Suspense fallback={<div className="p-4 sm:p-6 lg:p-8 text-center text-text-secondary">Loading visualization...</div>}>
            <Visualization />
          </Suspense>
          <Suspense fallback={<div className="p-4 sm:p-6 lg:p-8 text-center text-text-secondary">Loading lyrics...</div>}>
            <LyricsDisplay lrcContent={currentTrack?.lyrics} />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
