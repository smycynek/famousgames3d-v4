## Famous Games 3D

Copyright Steve Mycynek 2026

A few years ago, I created a site to replay famous chess games
at https://stevenvictor.net/famousgames3d. (This is the old site -- the new one is below)

I wrote manually it with Angular, ThreeJs, TweenJs, and a pgn game notation parser.
I managed all the animation and chess moves myself.  The result was decent,
but there were some async issues with the animation and syncing it with
the piece location data, so I was never fully happy with it.  I put it aside
for a while.

I recently decided that it was the perfect opportunity to try out Claude Code to pick up where I left off. I used the pieces I modeled in [Onshape](https://cad.onshape.com/documents/1ac43c0042a8a0544e84feed/w/276b025152b1f726b298cef5/e/c3193025dfaf1a651f190a93), and after a few false starts, I got something working.

## Use

Select a game, hit play, and watch the action!  Got a PGN file of a famous game you'd like to see? Upload it and
play it back!

### Looking for PGN files to upload?

https://www.pgnmentor.com/files.html

https://www.uschess.org/index.php/Chess-Life-Magazine-pgn-game-files/

https://theweekinchess.com/twic

https://www.chessgames.com/


## Building and running

`bun install`

`bun run build`

`bun run dev`


## Live demo
https://stevenvictor.net/famousgames3d-v4



