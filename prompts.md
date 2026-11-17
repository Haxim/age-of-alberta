[Image] Growing up I loved Age of Empires, and I want to build a game for my 8 year old daughter to help her with learning, specifically with spelling, reading, and math. I want to create a game just like age of empires, but which has her finding axolotls and working in a cool world with a team of different workers, explorers, scientists, and depending on the different role of the worker, they find different things, and she has to solve spelling tests, reading, quizzes, and math problems (addition, multiplication, subtraction for double digit numbers). It should be just like the Age of Empires map, but called the Age of Axolotls. I have something interesting though to give you; I have a database key for the entire Alberta curriculum so I want to use this to embed the curriculum into the learning platform so each lesson is generated with grade appropriate outcomes. This platform should not have her chatting with AI, but AI can work in the background to generate the challenges for each level (I can give you an OpenAI API key or you can create one if you can). The game buildings, nature, and tree should map that isometric view, and she should be able to play different levels. She's only 8 so she needs a place to be able to interact and type in her answers easily as well. As she answers different questions her villagers can grow and build more buildings, so instead of mining gold and fighting armies, she can answer questions to unlock the score and grow, upgrade her buildings, upgrade her walls, her creatures. We need sprites and 3D environment, and it needs to be performant. Don't modify any of the content of this database, but add a new schema called age-of-axolotls and build what tables you need to track the assets, the gameplay, the progress, and her scores on a range of different things, as well as all the pre-generated content for the quizzes, the sprites, the levels, and anything else. I need to be able to deploy this in the end as a Render.com Vue.js and Node.js application optimally, but if you cant do the backend, then just make it frontend and use localStorage or IndexedDB to save progress and we can make it fully browser based. [Redacted DB Connection String] I've attached a splash image for Age of Alberta. We need to make this work in 20 minutes, so it needs to be fast, useable, and 3D using Threejs if need be, or sprite generated otherwise.

And we need to rename it to Age of Alberta.

We only have 20 minutes, so accelerate this ot be browser only that can be hosted in Perplexity instead of render

OK a couple of things. First, we need to be able to place the buildings. And learn and earn I need to be able to skip messages. And I want the graphics to be a lot sharper. I also want you to use the splash image I provided. Its not loading. The button on the main window for start adventure is hard to read. I want real workers running around doing work, gardening and such. The learn and earn window features are too big, I need to scroll to click the button at the bottom.

We gotta wrap this up, times up. Fix bugs and wrap it up.


I also need to zoom, pan and scroll, and I want a world I can explore by sending my workers out. We've abandon the Axolotly theme, so get real workers. Make it more Alberta themed. Can we apply textures

Where can I see and play this game to begin testing it

OK its working. A couple of things. I want to be able ot upgrade buildings. I would also like to be able to give tasks to the workers instead of having them move randomly. I like explore, but let's send them afield. I also want to be able to discover things "You've found an oil field, drop in a well and earn points". Also I need to be able to pick a spelling question vs. math, and activate the keyboard so I can type numbers or word answers. Visually this is great. Can we have an upgrade so I cna upgrade my town hall into a legislature. Can we add extra sprites to have horse and wagon, then combine, and then in the future drone, moving through the ages.

The sprites need to go slower, and they are too layered over each other, we need a sense of depth and occlusion so the worker and combines go behind the buildings. We also need a high tech era with AI data centres.

Make a cheat code for "[redacted for fun - I'm sure you can figure it out]" case insensitive which automatically unlocks a data centre in any era.

add an input when I click the town hall and have the upgrade popup to enter the cheat code there. I don't have a keyboard popup on mobile otherwise


the start adventure button is not centered

where do I type the cheat codes

add an input when I click the town hall and have the upgrade popup to enter the cheat code there. I don't have a keyboard popup on mobile otherwise

can we make the textbox have the outline like the quiz box

okay I really like this game. I want to get it expanded with more geography. I want to be able to direct the workers and move them different places. I want them to move a little slower still. how do we 10x the experience, better curriculum aligned content, more diverse game play. I also want mountains, wheat fields and the townhall to grow to the real Alberta legislature, and for roads and rail lines to get built, with train sprites moving back and forth between industries. my son loves trains so add train stations and different trains moving on tracks too. allow for screen shots and clicking on a sprite of also like to load a heroic image of each building and character for a short story about them. plan this and build it

give me the link

So there are a few issues with the train tracks. Uh, first of all, the sprite only has one view of it, so as the train goes around in different directions, the sprite doesn't change appropriately, and all of the train cars now need to have the sprite rendered out with different views of the same sprite of the train but facing in different directions as though it was going in different areas. Second thing is, um, for some reason, the occlusion is not being well thought out, and the train state as it goes, uh, past the train station, it goes behind the train station even though it's supposed to go in front of the train station. Um, so for these more complex things like the trains, for all the train cars, they're going to need the exon or the isometric view of the trains from all of the different angles, and so you're going to need to redgennerteeadditional sprite images forr andthen track the directionn ofthe movement so that all of that happens, uh, all of that aligns correctly as the, uh, trains go around the different tracks. So let's think about the logic on how to do that. When something is in front of a train, uh, a building or behind a building, I think the easiest thing is even though the building itself is a sprite, the building should take up a square and then the track will either go behind the building or in front of the building. Um, the other thing is that the sprite for the train is floating above the track and it's not really on the ground, so it looks like it's a flying train. So these are all things that need to

also what image generation process are you using for the sprites. openAI image generator does a significantly better job with greater consistency but I don't know how youre getting the transparency

when the train is going to top right, the grain car is perpendicular. what image model is being used? can you evaluate and refine the train layout better for greater consistency?

do you have gpt image 2?

how you more deeply integrate the curriculum learning in addition to the games and challenges? can you generate home work sheets like the k12 app?

a couple issues. the buttons for the worksheet generator don't have their text centred within them. and the worksheets generate blank white pages

can you provide me a downloadable zip I could deploy now to render.com as a static app?

I need you to make a markdown of EVERY single prompt I gave you from the start to the end. I dont need time stamps for this, just the full collective of everything I sent. and when I sent images, just put a little tag to say [Image] for that