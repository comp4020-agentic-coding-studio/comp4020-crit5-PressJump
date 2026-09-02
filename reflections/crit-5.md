# Crit 5 reflection

## What was the breakthrough that moved the work forward?

My game is called Ink and the whole thing is one idea, which is that a ball
falls and you draw lines for it to land on, except every line costs ink by how
long it is so you cannot scribble your way across. I picked drawing because the
brief bans instructions of any kind and the gesture is the same with a mouse
and with a thumb.

The hard part was never the physics, it was the opening screen. My first
version was a spout, a cup in the far corner and nothing in between, and I
thought that was obvious because I already knew what I had built. The
breakthrough was a pretty small decision in the end, which was to put a line on
the board that the player did not draw. Board one opens with a slope already
running into the cup, and that slope does all of the teaching on its own,
because it is the same kind of mark you can make yourself and you can see that
it is the reason a ball reaching it goes in.

![Board one, with the slope that does the teaching](../docs/opening.png)

Playing it then showed I had put the difficulty in the wrong place. The obvious
first stroke cleared board one and nothing else and every miss cost half the
meter, so the game was hard because landing the ball was fiddly rather than
because the route took thinking. Every cup sits in a shallow bowl now.

## What did this work change about who I want to be as a software developer?

Every real problem I hit this week was sitting behind a green check. The ball
went straight through hand drawn lines my tests swore were solid, because the
tests drew one tidy segment while a finger draws thirty. So the habit I am
taking from this one is to stop reading a passing suite as a report on the
game, since it is only ever a report on what I remembered to ask it. I had a
really good time building this and I hope whoever plays it works it out without
me saying a word.
