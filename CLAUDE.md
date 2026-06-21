We are going to make a virtual postcard / digital photo gallery for Father's day. 

It will be in 2D, animated, and in React (you'll have to install it). 

Important note: This site will have a mobile first design, as the target user will most likely be viewing it on an iPhone browser.

Animation Sequence:
1. Blue background to represent a blue sky. A cursive tracing of "Happy Father's Day" will be traced out by a plane icon to make it look as if the text is being drawn out in the sky by a plane's trail.
2. As that part is almost finished, (to not make the sequence feel slow) we'll start the next step. We'll have a 2D envelope. It will slide up from the bottom, but only so high such that the top quarter to top half (we'll half to adjust visually) pops out from the bottom. Some faint text will appear that says the user has to swipe up on the envelope for it to open.
3. The envelope will be animated so that it opens and a stack of postcards will slide out on top over the envelope. So we'll have a stack that'll consist of postcards and then at the bottom, the envelope
    * Each postcard will be a collage of photos, except for the last one will be a written message. Each of these collage postcards will represent a year. The user will be able to tap on a photo, and it will zoom in without breaking the illusion that its a postcard.
    * To navigate through the stack 
