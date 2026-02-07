## Famous Games 3D

A vibe-coding experiment with Claude Code

Steve Mycynek 2026

A few years ago, I created a site to replay famous chess games
at https://stevenvictor.net/famousgames3d. (This is the old site -- the new one is below)

I wrote manually it with Angular, ThreeJs, TweenJs, and a pgn game notation parser.
I managed all the animation and chess moves myself.  The result was decent,
but there were some async issues with the animation and syncing it with
the piece location data, so I was never fully happy with it.  I put it aside
for a while.

I recently decided that it was the perfect opportunity to try out Claude Code to pick up where I left off. I used the pieces I modeled in Onshape, and after a few false starts, I got something working.


## Building and running

`bun install`

`bun run build`

`bun run dev`


## Live demo
https://stevenvictor.net/famousgames3d-v4



