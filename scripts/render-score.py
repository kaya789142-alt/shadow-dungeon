#!/usr/bin/env python3
# SPDX-License-Identifier: GPL-2.0-only
"""Render the original Shadow Dungeon 2.1 score using TimGM6mb and FluidSynth."""
import ctypes as ct
from ctypes.util import find_library
from pathlib import Path
import random
import subprocess
import sys
import tempfile
import wave

RATE = 32000
ROOT = Path(__file__).resolve().parents[1]
SOUNDFONT = Path(sys.argv[1] if len(sys.argv) > 1 else '/usr/share/sounds/sf2/TimGM6mb.sf2')
# BPM, number of four-beat bars, tonic, chord roots in semitones, GM instrumentation.
SCORE = {
    'title': (102, 56, 50, [0, 3, 10, 5, 0, 8, 3, 7], [48, 60, 52, 46, 71]),
    'village': (88, 48, 55, [0, 7, 9, 5, 0, 2, 5, 7], [48, 46, 0, 25, 73]),
    'forest': (84, 48, 57, [0, 5, 8, 10, 0, 7, 5, 3], [44, 46, 89, 14, 79]),
    'graveyard': (72, 40, 50, [0, 1, 8, 5, 0, 6, 3, 7], [42, 47, 52, 14, 71]),
    'dungeon': (81, 44, 45, [0, 1, 3, 6, 0, 8, 10, 7], [44, 47, 54, 14, 69]),
    'battle': (122, 64, 50, [0, 3, 8, 7, 0, 5, 1, 7], [49, 61, 57, 45, 60]),
    'boss': (116, 64, 48, [0, 1, 8, 5, 0, 6, 3, 7], [49, 61, 52, 47, 60]),
}
lib = ct.CDLL(find_library('fluidsynth'))

def bind(name, result, *parameters):
    fn = getattr(lib, name)
    fn.restype, fn.argtypes = result, parameters
    return fn

pointer, integer, string = ct.c_void_p, ct.c_int, ct.c_char_p
new_settings = bind('new_fluid_settings', pointer)
set_num = bind('fluid_settings_setnum', integer, pointer, string, ct.c_double)
new_synth = bind('new_fluid_synth', pointer, pointer)
load_font = bind('fluid_synth_sfload', integer, pointer, string, integer)
program = bind('fluid_synth_program_change', integer, pointer, integer, integer)
note_on = bind('fluid_synth_noteon', integer, pointer, integer, integer, integer)
note_off = bind('fluid_synth_noteoff', integer, pointer, integer, integer)
control = bind('fluid_synth_cc', integer, pointer, integer, integer, integer)
render = bind('fluid_synth_write_s16', integer, pointer, integer, pointer, integer, integer, pointer, integer, integer)
free_synth = bind('delete_fluid_synth', None, pointer)
free_settings = bind('delete_fluid_settings', None, pointer)

def arrange(name):
    bpm, bars, tonic, roots, instruments = SCORE.get(name, (120, 2, 55, [0, 5], [48, 60, 52, 46, 73]))
    seconds = 60 / bpm
    events = []
    randomizer = random.Random('shadow-dungeon-'+name)

    def add(at, length, channel, pitch, volume):
        start, end = round(at*seconds*RATE), round((at+length)*seconds*RATE)
        events.extend([(start, 1, channel, pitch, volume), (end, 0, channel, pitch, 0)])

    energetic = name in {'battle', 'boss'}
    major = name in {'village', 'victory'}
    themes = [(0, 2, 3, 6, 4, 2), (4, 3, 1, 0, 2, 4), (0, 4, 6, 7, 6, 3), (5, 3, 2, 1, 0, 2)]
    for bar in range(bars):
        at = bar*4
        section = bar//8
        degree = roots[bar%len(roots)] if bar != bars-1 else roots[-1]
        root = tonic+degree
        third = 4 if (major and degree in (0, 5, 7) or not major and degree in (3, 8, 10)) else 3
        chord = [root, root+third, root+7, root+12]
        dynamic = [0, 7, 13, 3, 15, 6, 12, 4][section%8]
        for i, pitch in enumerate(chord[:3]):
            add(at+.05*i, 3.72-.04*i, 0, pitch, 42+dynamic+i*2)
        add(at, 2.8, 2, root-12, 49+dynamic)
        if section%3 != 0 or energetic or name=='victory':
            add(at+.04, 3.34, 1, chord[2], 49+dynamic)
            add(at+2, 1.62, 1, chord[1]+12, 43+dynamic)
        if name not in {'graveyard', 'dungeon'} or bar%2 == 0:
            rhythm = [0, .5, 1.5, 2, 2.5, 3.5] if energetic else [0, .75, 1.5, 2.25, 3]
            for idx, beat in enumerate(rhythm):
                add(at+beat, .38, 3, chord[(idx+section)%4]+(12 if idx%3==2 else 0), 39+dynamic+randomizer.randint(0,9))
        if bar%8 not in (5, 7) or name=='victory':
            pattern = themes[(section+bar//2)%len(themes)]
            times = [0, .75, 1.5, 2.25, 3, 3.5] if energetic else [0, .75, 1.25, 2, 2.5, 3.25]
            scale = [0, 2, third, 5, 7, 9 if major else 8, 10, 12]
            for i, beat in enumerate(times):
                duration = (times[i+1] if i+1<len(times) else 3.88)-beat
                add(at+beat, duration*.87, 4, root+12+scale[pattern[i]], 58+dynamic+randomizer.randint(-4,5))
        if energetic or name=='title' and section%2==0:
            for beat in ([0, 1.5, 2, 3.25] if energetic else [0, 2.5]):
                add(at+beat, .16, 9, 35 if beat%2==0 else 41, 65+dynamic)
            if bar%4==0:add(at, .34, 9, 49, 49+dynamic)
        if name=='boss':
            for pitch in chord[1:]:add(at+.19, 3.55, 5, pitch, 57+dynamic)
        if name in {'graveyard','dungeon'} and bar%4==0:add(at+.1, 3.5, 5, root+12, 40+dynamic)
    return instruments, sorted(events), round(bars*4*seconds*RATE)

def make_track(name):
    instruments, events, length = arrange(name)
    settings = new_settings()
    for key, value in [(b'synth.sample-rate', RATE), (b'synth.gain', .41), (b'synth.reverb.room-size', .71), (b'synth.reverb.level', .36)]:
        set_num(settings, key, value)
    synth = new_synth(settings)
    try:
        if load_font(synth, str(SOUNDFONT).encode(), 1)<0:raise RuntimeError('SoundFont failed to load')
        for channel, instrument in enumerate(instruments+[52]):
            program(synth, channel, instrument)
            control(synth, channel, 10, [49, 82, 63, 36, 69, 77][channel])
            control(synth, channel, 91, 35 if channel==3 else 53)
        size = 8192
        buffer = (ct.c_short*(size*2))()
        raw = tempfile.NamedTemporaryFile(suffix='.wav')
        with wave.open(raw.name,'wb') as output:
            output.setparams((2,2,RATE,0,'NONE','not compressed'))
            cursor = 0
            for offset, action, channel, pitch, volume in events+[(length, 0, 15, 0, 0)]:
                while cursor<offset:
                    count = min(size,offset-cursor)
                    render(synth,count,buffer,0,2,buffer,1,2)
                    output.writeframesraw(ct.string_at(buffer,count*4))
                    cursor += count
                if action:note_on(synth,channel,pitch,volume)
                else:note_off(synth,channel,pitch)
        # The score returns to the tonic on loop. Short edge envelopes suppress decoder clicks.
        duration=length/RATE
        envelope=f'afade=t=in:d=0.09,afade=t=out:st={duration-.26:.4f}:d=0.26'
        subprocess.run(['ffmpeg','-hide_banner','-loglevel','error','-y','-i',raw.name,'-af',
                        'highpass=f=38,acompressor=threshold=0.19:ratio=2.1:attack=18:release=180,volume=2.1,'+envelope,
                        '-c:a','aac','-b:a','80k','-movflags','+faststart',str(ROOT/'public'/'score'/f'{name}.m4a')],
                       check=True)
        raw.close()
    finally:
        free_synth(synth)
        free_settings(settings)

if __name__=='__main__':
    for track in [*SCORE,'victory']:
        make_track(track)
        print(track,flush=True)
