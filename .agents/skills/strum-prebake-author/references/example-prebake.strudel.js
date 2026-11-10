// Example custom prebake script for Strum
samples('github:tidalcycles/dirt-samples')
aliasBank('https://raw.githubusercontent.com/todepond/samples/main/strudel.json')

register('acid', (x, pat) => pat.lpf(x).lpq(12).s('sawtooth'))
setcps(0.5)
