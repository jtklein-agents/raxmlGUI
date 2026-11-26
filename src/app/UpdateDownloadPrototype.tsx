// PROTOTYPE, throwaway: "What the download progress looks like" (wayfinder ticket 390).
// Three variants of the in-page update download progress, switchable via `?variant=A|B|C`
// on the existing page. Progress is faked in the page; nothing touches electron-updater.
import React, { useEffect, useState } from 'react';
import Backdrop from '@mui/material/Backdrop';
import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import Dialog from '@mui/material/Dialog';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import LinearProgress from '@mui/material/LinearProgress';
import Paper from '@mui/material/Paper';
import Step from '@mui/material/Step';
import StepLabel from '@mui/material/StepLabel';
import Stepper from '@mui/material/Stepper';
import Typography from '@mui/material/Typography';

type Scenario = 'normal' | 'fallback' | 'instant';
// percent is null before the first download-progress event
interface Progress { percent: number | null; done: boolean; restarted: boolean }

const SCENARIOS: Scenario[] = ['normal', 'fallback', 'instant'];
const VARIANTS = [
  { key: 'A', name: 'Dialog with bar' },
  { key: 'B', name: 'Ring over dimmed app' },
  { key: 'C', name: 'Bottom sheet with steps' },
];

// Fake event stream, roughly one event a second like electron-updater (sped up 3x).
function scriptFor( scenario: Scenario ): number[] {
  if ( scenario === 'instant' ) return [100];
  if ( scenario === 'fallback' ) return [8, 19, 31, 40, -1, 0, 12, 27, 45, 63, 81, 96, 100];
  return [6, 14, 23, 35, 48, 59, 71, 84, 93, 100];
}

function useFakeProgress( scenario: Scenario, run: number ): Progress {
  const [p, setP] = useState<Progress>( { percent: null, done: false, restarted: false } );
  useEffect( () => {
    const steps = scriptFor( scenario );
    let i = 0;
    let restarted = false;
    let timer: ReturnType<typeof setInterval> | undefined;
    const reset = setTimeout( () => setP( { percent: null, done: false, restarted: false } ), 0 );
    // first event after a gap: the "connecting" state
    const start = setTimeout( () => {
      timer = setInterval( () => {
        const v = steps[i++];
        if ( v === undefined ) { clearInterval( timer ); return; }
        if ( v === -1 ) { restarted = true; return; }
        setP( { percent: v, done: v >= 100, restarted } );
      }, 350 );
    }, 1500 );
    return () => { clearTimeout( reset ); clearTimeout( start ); clearInterval( timer ); };
  }, [scenario, run] );
  return p;
}

const percentText = ( p: Progress ): string => p.percent === null
  ? 'Starting…'
  : `${Math.round( p.percent )}%`;
const statusText = ( p: Progress ): string => {
  if ( p.done ) return 'Download complete. Preparing to install…';
  if ( p.percent === null ) return 'Connecting to the update server…';
  if ( p.restarted ) return 'Retrying with the full download…';
  return 'RAxML-GUI will quit and install when the download finishes.';
};

function VariantA( { p }: { p: Progress } ): React.JSX.Element {
  return (
    <Dialog open fullWidth maxWidth="xs" disableEscapeKeyDown>
      <DialogTitle>Downloading update</DialogTitle>
      <DialogContent>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mt: 1 }}>
          <LinearProgress
            sx={{ flex: 1, height: 8, borderRadius: 4 }}
            variant={p.percent === null
              ? 'indeterminate'
              : 'determinate'}
            value={p.percent ?? 0}
          />
          <Typography variant="body2" sx={{ minWidth: 64, textAlign: 'right' }}>{percentText( p )}</Typography>
        </Box>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>{statusText( p )}</Typography>
      </DialogContent>
    </Dialog>
  );
}

function VariantB( { p }: { p: Progress } ): React.JSX.Element {
  return (
    <Backdrop open sx={{ zIndex: 1300, color: '#fff', bgcolor: 'rgba(0,0,0,0.8)', flexDirection: 'column', gap: 3 }}>
      <Box sx={{ position: 'relative', display: 'inline-flex' }}>
        <CircularProgress
          variant="determinate"
          value={100}
          size={140}
          thickness={3}
          sx={{ position: 'absolute', color: 'rgba(255,255,255,0.2)' }}
        />
        <CircularProgress
          color="inherit"
          size={140}
          thickness={3}
          variant={p.percent === null
            ? 'indeterminate'
            : 'determinate'}
          value={p.percent ?? 0}
        />
        <Box sx={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Typography variant="h5">{p.percent === null
            ? ''
            : percentText( p )}</Typography>
        </Box>
      </Box>
      <Typography variant="h6">Updating RAxML-GUI</Typography>
      <Typography variant="body2">{statusText( p )}</Typography>
    </Backdrop>
  );
}

function VariantC( { p }: { p: Progress } ): React.JSX.Element {
  const active = p.done
    ? 1
    : 0;
  return (
    <Backdrop open sx={{ zIndex: 1300, alignItems: 'flex-end' }}>
      <Paper square elevation={8} sx={{ width: '100%', px: 4, pt: 3, pb: 10 }}>
        <Stepper activeStep={active} sx={{ mb: 2 }}>
          <Step><StepLabel>Download</StepLabel></Step>
          <Step><StepLabel>Quit and install</StepLabel></Step>
          <Step><StepLabel>Restart</StepLabel></Step>
        </Stepper>
        <LinearProgress
          variant={p.percent === null
            ? 'indeterminate'
            : 'determinate'}
          value={p.percent ?? 0}
        />
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
          <Typography variant="body2" color="text.secondary">{statusText( p )}</Typography>
          <Typography variant="body2">{percentText( p )}</Typography>
        </Box>
      </Paper>
    </Backdrop>
  );
}

const pill = {
  position: 'fixed', bottom: 16, left: '50%', transform: 'translateX(-50%)', zIndex: 2000,
  display: 'flex', alignItems: 'center', gap: 1.5, px: 2, py: 1, borderRadius: 999,
  bgcolor: '#111', color: '#fff', boxShadow: 6, fontFamily: 'monospace', fontSize: 13,
} as const;
const btn = { background: 'none', border: '1px solid #555', color: '#fff', borderRadius: 6, cursor: 'pointer', padding: '2px 8px' };

export default function UpdateDownloadPrototype(): React.JSX.Element | null {
  const params = new URLSearchParams( window.location.search );
  const [variant, setVariant] = useState( params.get( 'variant' ) ?? 'A' );
  const [scenario, setScenario] = useState<Scenario>( ( params.get( 'scenario' ) as Scenario ) ?? 'normal' );
  const [run, setRun] = useState( 0 );
  const p = useFakeProgress( scenario, run );

  const go = ( key: string, sc: Scenario = scenario ): void => {
    const next = new URLSearchParams( window.location.search );
    next.set( 'variant', key );
    next.set( 'scenario', sc );
    window.history.replaceState( null, '', `${window.location.pathname}?${next}` );
    setVariant( key );
    setScenario( sc );
    setRun( ( r ) => r + 1 );
  };
  const idx = Math.max( 0, VARIANTS.findIndex( ( v ) => v.key === variant ) );
  const cycle = ( d: number ): void => go( VARIANTS[( idx + d + VARIANTS.length ) % VARIANTS.length].key );

  useEffect( () => {
    const onKey = ( e: KeyboardEvent ): void => {
      const t = e.target as HTMLElement;
      if ( t.closest( 'input, textarea, [contenteditable]' ) ) return;
      if ( e.key === 'ArrowLeft' ) cycle( -1 );
      if ( e.key === 'ArrowRight' ) cycle( 1 );
    };
    window.addEventListener( 'keydown', onKey );
    return () => window.removeEventListener( 'keydown', onKey );
  } );

  if ( process.env.NODE_ENV === 'production' ) return null;
  return (
    <>
      {variant === 'A' && <VariantA p={p} />}
      {variant === 'B' && <VariantB p={p} />}
      {variant === 'C' && <VariantC p={p} />}
      <Box sx={pill}>
        <button style={btn} onClick={() => cycle( -1 )}>←</button>
        <span>{VARIANTS[idx].key} ({VARIANTS[idx].name})</span>
        <button style={btn} onClick={() => cycle( 1 )}>→</button>
        <select
          value={scenario}
          onChange={( e ) => go( variant, e.target.value as Scenario )}
          style={{ ...btn, background: '#111' }}
        >
          {SCENARIOS.map( ( s ) => <option key={s} value={s}>{s}</option> )}
        </select>
        <button style={btn} onClick={() => setRun( ( r ) => r + 1 )}>replay</button>
        <span style={{ opacity: 0.7 }}>{JSON.stringify( p )}{p.done
          ? ' → native Install Updates'
          : ''}</span>
      </Box>
    </>
  );
}
