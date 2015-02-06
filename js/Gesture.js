/**
 * A gesture is a hand-drawn shape on a touch screen. It can have one or multiple strokes.
 * Each stroke is a sequence of timed points. A user-defined gesture can be recognized by 
 * a GestureLibrary. 
 */
function Gesture(strokes) {
  this.mBoundingBox = new RectF();
  this.mGestureID = Gesture.GESTURE_ID_BASE + (++Gesture.GESTURE_COUNT);
  this.mStrokes = [];
  if (!strokes) return;
  for (var i=0; i<strokes.length; ++i) {
    this.addStroke(strokes[i]);
  }
}

Gesture.GESTURE_ID_BASE = Date.now();

Gesture.GESTURE_COUNT = 0;

Gesture.prototype.clone = function() {
  var gesture = new Gesture();
  gesture.mBoundingBox.set(
    this.mBoundingBox.left,
    this.mBoundingBox.top,
    this.mBoundingBox.right,
    this.mBoundingBox.bottom
  );
  var count = this.mStrokes.length;
  for (var i=0; i<count; ++i) {
    var stroke = this.mStrokes[i];
    gesture.mStrokes.push(stroke.clone());
  }
  return gesture;
};

/**
 * @return all the strokes of the gesture
 */
Gesture.prototype.getStrokes = function() {
  return this.mStrokes;
};

/**
 * @return the number of strokes included by this gesture
 */
Gesture.prototype.getStrokesCount = function() {
  return this.mStrokes.length;
};

/**
 * Adds a stroke to the gesture.
 * 
 * @param stroke
 */
Gesture.prototype.addStroke = function(stroke) {
  this.mStrokes.push(stroke);
  this.mBoundingBox.union(stroke.boundingBox);
};

/**
 * Calculates the total length of the gesture. When there are multiple strokes in
 * the gesture, this returns the sum of the lengths of all the strokes.
 * 
 * @return the length of the gesture
 */
Gesture.prototype.getLength = function() {
  var len = 0;
  var strokes = this.mStrokes;
  var count = strokes.length;
  
  for (var i=0; i<count; ++i) {
    len += strokes[i].length;
  }

  return len;
};

/**
 * @return the bounding box of the gesture
 */
Gesture.prototype.getBoundingBox = function() {
  return this.mBoundingBox;
};

/**
 * Sets the id of the gesture.
 * 
 * @param id
 */
Gesture.prototype.setID = function(id) {
  this.mGestureID = id;
};

/**
 * @return the id of the gesture
 */
Gesture.prototype.getID = function() {
  return this.mGestureID;
};

// ---

Gesture.prototype.toJSON = function() {
  var strokes = [];
  var count = this.mStrokes.length;
  for (var i=0; i<count; ++i) {
    strokes.push(this.mStrokes[i].toJSON());
  }
  return strokes;
};

Gesture.fromJSON = function(json) {
  var gesture = new Gesture();
  for (var i=0; i<json.length; ++i) {
    gesture.addStroke(GestureStroke.fromJSON(json[i]));
  }
  return gesture;
};