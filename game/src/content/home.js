// Everything specific to this scene that is not artwork or code: where things are in the room,
// which line Amma says when, and how patient she is. Change the experience here first.

export const room = {
  // painted layers, back to front (names match the baked files)
  layers: [["out", 0], ["far", 1], ["wall", 3], ["floor", 4], ["furniture", 5], ["swing", 6], ["fg", 12], ["shafts", 13]],
  anchors: {
    start: { x: 1196, y: 972 },   // inside the inner room
    home: { x: 1200, y: 1390 },   // where she stands, in front of the child
    stool: { x: 1490, y: 925 },   // the handles of the bag as it sits on the stool
    threshold: 1016,              // past this line she is in the living room, in front of the wall
  },
  // her size at each depth on the floor
  scaleAt: (y) => 0.62 + (y - 1010) * (0.52 / 380),
  camera: { x: 1200, y: 792, z: 1.035 },
};

// Spoken lines, by moment. Ids refer to the recorded files in assets/voices.json.
export const lines = {
  greet: "greet",         // வணக்கம் செல்லம்!  Hello, darling!
  whereBag: "whereBag",   // என் பை எங்கே?  Where is my bag?
  there: "there",         // அதோ!  There it is!
  thanks: "thanks",       // நன்றி செல்லம்!  Thank you, darling!
  list: "ithanai",        // இத்தனை ஆப்பிள் வேண்டும்!  We need this many apples!  (never the number itself)
  empty: "empty",         // பை காலியா இருக்கு!  The bag is empty!
  what: "enna",           // என்ன செல்லம்?  What is it, darling?
  letsGo: "main",         // வா செல்லம், கடைக்குப் போகலாம்!  Come, darling, let's go to the shop!
};

// Seconds. How long Amma waits before helping, and how often she invites the child onward.
export const timing = {
  bagHintAfter: 4.5,      // no tap on the bag yet: she points at it
  bagHintEvery: 5.5,
  bagHintsBeforeFetching: 3,  // then she fetches it herself, so no child is ever stuck
  inviteAfterQuiet: 9,    // nothing tapped for a while: "let's go to the shop"
  inviteEvery: 24,
  tapCooldown: 0.12,      // a second tap on the same thing within this is the same tap
};
