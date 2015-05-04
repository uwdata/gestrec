(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}g.gestrec = f()}})(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
module.exports = {
  Constants:           require('./Constants'),
  Gesture:             require('./Gesture'),
  GestureStore:        require('./GestureStore'),
  Instance:            require('./Instance'),
  InstanceLearner:     require('./InstanceLearner'),
  Learner:             require('./Learner'),
  OrientedBoundingBox: require('./OrientedBoundingBox'),
  Point:               require('./Point'),
  Prediction:          require('./Prediction'),
  Rect:                require('./Rect'),
  Stroke:              require('./Stroke'),
  Utils:               require('./Utils')
};
},{"./Constants":2,"./Gesture":3,"./GestureStore":4,"./Instance":5,"./InstanceLearner":6,"./Learner":7,"./OrientedBoundingBox":8,"./Point":9,"./Prediction":10,"./Rect":11,"./Stroke":12,"./Utils":13}],2:[function(require,module,exports){
/**
 * Constants.
 */
module.exports = {
  // ignore sequence information
  SEQUENCE_INVARIANT: 1,
  // when SEQUENCE_SENSITIVE is used, only single stroke gestures are currently allowed
  SEQUENCE_SENSITIVE: 2,

  // ORIENTATION_SENSITIVE and ORIENTATION_INVARIANT are only for SEQUENCE_SENSITIVE gestures
  ORIENTATION_INVARIANT: 1,
  // at most 2 directions can be recognized
  ORIENTATION_SENSITIVE: 2,
  // at most 4 directions can be recognized
  ORIENTATION_SENSITIVE_4: 4,
  // at most 8 directions can be recognized
  ORIENTATION_SENSITIVE_8: 8,

  SEQUENCE_SAMPLE_SIZE: 16,

  PATCH_SAMPLE_SIZE: 16,

  ORIENTATIONS: [
    0,
    (Math.PI / 4),
    (Math.PI / 2),
    (Math.PI * 3 / 4),
    Math.PI,
    -0,
    (-Math.PI / 4),
    (-Math.PI / 2),
    (-Math.PI * 3 / 4),
    -Math.PI
  ]
};
},{}],3:[function(require,module,exports){
var Rect = require('./Rect');
var Stroke = require('./Stroke');

/**
 * A gesture is a hand-drawn shape on a touch screen. It can have one or multiple strokes.
 * Each stroke is a sequence of timed points. A user-defined gesture can be recognized by 
 * a GestureLibrary. 
 */
function Gesture(strokes) {
  this.mBoundingBox = new Rect();
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
    gesture.addStroke(Stroke.fromJSON(json[i]));
  }
  return gesture;
};

module.exports = Gesture;

},{"./Rect":11,"./Stroke":12}],4:[function(require,module,exports){
var Constants = require('./Constants');
var Gesture = require('./Gesture');
var Instance = require('./Instance');
var InstanceLearner = require('./InstanceLearner');

/**
 * GestureStore maintains gesture examples and makes predictions on a new
 * gesture.
 */
function GestureStore() {
  this.mSequenceType = Constants.SEQUENCE_SENSITIVE;
  this.mOrientationStyle = Constants.ORIENTATION_SENSITIVE_4;
  this.mClassifier = new InstanceLearner();
  this.mChanged = false;
  this.mNamedGestures = {};
}

/**
 * Specify how the gesture library will handle orientation. 
 * Use ORIENTATION_INVARIANT or ORIENTATION_SENSITIVE
 * 
 * @param style
 */
GestureStore.prototype.setOrientationStyle = function(style) {
  this.mOrientationStyle = style;
};

GestureStore.prototype.getOrientationStyle = function() {
  return this.mOrientationStyle;
};

/**
 * @param type SEQUENCE_INVARIANT or SEQUENCE_SENSITIVE
 */
GestureStore.prototype.setSequenceType = function(type) {
  this.mSequenceType = type;
};

/**
 * @return SEQUENCE_INVARIANT or SEQUENCE_SENSITIVE
 */
GestureStore.prototype.getSequenceType = function() {
  return this.mSequenceType;
};

/**
 * Get all the gesture entry names in the library
 * 
 * @return a set of strings
 */
GestureStore.prototype.getGestureEntries = function() {
  var names = [];
  for (var name in this.mNamedGestures) {
    names.push(name);
  }
  return names;
};

/**
 * Recognize a gesture
 * 
 * @param gesture the query
 * @return a list of predictions of possible entries for a given gesture
 */
GestureStore.prototype.recognize = function(gesture) {
  var instance = Instance.createInstance(
      this.mSequenceType, this.mOrientationStyle, gesture, null);
  return this.mClassifier.classify(
      this.mSequenceType, this.mOrientationStyle, instance.vector);
};

/**
 * Add a gesture for the entry
 * 
 * @param entryName entry name
 * @param gesture
 */
GestureStore.prototype.addGesture = function(entryName, gesture) {
  if (entryName == null || entryName.length === 0) {
    return;
  }
  gestures = this.mNamedGestures[entryName];
  if (gestures == null) {
    gestures = [];
    this.mNamedGestures[entryName] = gestures;
  }
  gestures.push(gesture);
  this.mClassifier.addInstance(Instance.createInstance(
    this.mSequenceType, this.mOrientationStyle, gesture, entryName
  ));
  this.mChanged = true;
};

/**
 * Remove a gesture from the library. If there are no more gestures for the
 * given entry, the gesture entry will be removed.
 * 
 * @param entryName entry name
 * @param gesture
 */
GestureStore.prototype.removeGesture = function(entryName, gesture) {
  var gestures = this.mNamedGestures[entryName];
  if (gestures == null) {
    return;
  }

  var index = gestures.indexOf(gesture);
  gestures.splice(index, 1);

  // if there are no more samples, remove the entry automatically
  if (gestures.length === 0) {
    delete this.mNamedGestures[entryName];
  }

  this.mClassifier.removeInstance(gesture.getID());

  this.mChanged = true;
};

/**
 * Remove an entry of gestures
 * 
 * @param entryName the entry name
 */
GestureStore.prototype.removeEntry = function(entryName) {
  delete this.mNamedGestures[entryName];
  this.mClassifier.removeInstances(entryName);
  this.mChanged = true;
};

/**
 * Get all the gestures of an entry
 * 
 * @param entryName
 * @return the list of gestures that is under this name
 */
GestureStore.prototype.getGestures = function(entryName) {
  var gestures = this.mNamedGestures[entryName];
  if (gestures != null) {
    return gestures.slice();
  } else {
    return [];
  }
};

GestureStore.prototype.hasChanged = function() {
  return this.mChanged;
};

GestureStore.prototype.getLearner = function() {
  return this.mClassifier;
};

// ---

GestureStore.prototype.toJSON = function() {
  var o = {};
  o.sequence = this.mSequenceType;
  o.orientation = this.mOrientationStyle;
  o.gestures = {};
  for (var name in this.mNamedGestures) {
    var gestures = this.mNamedGestures[name];
    o.gestures[name] = gestures.map(function(g) { return g.toJSON(); });
  }
  return o;
};

GestureStore.fromJSON = function(json) {
  var gs = new GestureStore();
  gs.setSequenceType(json.sequence);
  gs.setOrientationStyle(json.orientation);
  for (var name in json.gestures) {
    var gestures = json.gestures[name];
    gestures.forEach(function(g) {
      gs.addGesture(name, Gesture.fromJSON(g));
    });
  }
  return gs;
};

module.exports = GestureStore;

},{"./Constants":2,"./Gesture":3,"./Instance":5,"./InstanceLearner":6}],5:[function(require,module,exports){
var Constants = require('./Constants');
var Utils = require('./Utils');

/**
 * An instance represents a sample if the label is available or a query if the
 * label is null.
 */
function Instance(id, sample, sampleName) {
  this.id = id;
  this.vector = sample;
  this.label = sampleName;
}

Instance.prototype.normalize = function() {
  var sample = this.vector;
  var sum = 0;

  var size = sample.length;
  for (var i = 0; i < size; i++) {
    sum += sample[i] * sample[i];
  }

  var magnitude = Math.sqrt(sum);
  for (var i = 0; i < size; i++) {
    sample[i] /= magnitude;
  }
};

/**
 * create a learning instance for a single stroke gesture
 * 
 * @param gesture
 * @param label
 * @return the instance
 */
Instance.createInstance = function(sequenceType, orientationType, gesture, label) {
  var pts;
  var instance;
  if (sequenceType === Constants.SEQUENCE_SENSITIVE) {
    pts = Instance.temporalSampler(orientationType, gesture);
    instance = new Instance(gesture.getID(), pts, label);
    instance.normalize();
  } else {
    pts = Instance.spatialSampler(gesture);
    instance = new Instance(gesture.getID(), pts, label);
  }
  return instance;
};

Instance.spatialSampler = function(gesture) {
  return Utils.spatialSampling(gesture, Constants.PATCH_SAMPLE_SIZE, false);
};

Instance.temporalSampler = function(orientationType, gesture) {
  var pts = Utils.temporalSampling(gesture.getStrokes()[0],
          Constants.SEQUENCE_SAMPLE_SIZE);
  var center = Utils.computeCentroid(pts);
  var orientation = Math.atan2(pts[1] - center[1], pts[0] - center[0]);

  var adjustment = -orientation;
  if (orientationType != Constants.ORIENTATION_INVARIANT) {
    var count = Constants.ORIENTATIONS.length;
    for (var i = 0; i < count; i++) {
      var delta = Constants.ORIENTATIONS[i] - orientation;
      if (Math.abs(delta) < Math.abs(adjustment)) {
        adjustment = delta;
      }
    }
  }

  Utils.translate(pts, -center[0], -center[1]);
  Utils.rotate(pts, adjustment);

  return pts;
};

module.exports = Instance;
},{"./Constants":2,"./Utils":13}],6:[function(require,module,exports){
var Prediction = require('./Prediction');
var Constants = require('./Constants');
var Learner = require('./Learner');
var Utils = require('./Utils');

/**
 * An implementation of an instance-based learner
 */
function InstanceLearner() {
  Learner.call(this);
}

InstanceLearner.prototype = new Learner();

InstanceLearner.compare = function(object1, object2) {
  var score1 = object1.score;
  var score2 = object2.score;
  if (score1 > score2) {
    return -1;
  } else if (score1 < score2) {
    return 1;
  } else {
    return 0;
  }
};

InstanceLearner.prototype.classify = function(sequenceType, orientationType, vector) {
  var predictions = [];
  var instances = this.getInstances();
  var count = instances.length;
  var label2score = {};

  for (var i=0; i<count; ++i) {
    var sample = instances[i];
    if (sample.vector.length != vector.length) {
      continue;
    }
    var distance;
    if (sequenceType == Constants.SEQUENCE_SENSITIVE) {
      distance = Utils.minimumCosineDistance(sample.vector, vector, orientationType);
    } else {
      distance = Utils.squaredEuclideanDistance(sample.vector, vector);
    }
    var weight;
    if (distance == 0) {
      weight = Number.MAX_VALUE;
    } else {
      weight = 1 / distance;
    }
    var score = label2score[sample.label];
    if (score == null || weight > score) {
      label2score[sample.label] = weight;
    }
  }

  for (var name in label2score) {
    var score = label2score[name];
    predictions.push(new Prediction(name, score));
  }

  return predictions.sort(InstanceLearner.compare);
};

module.exports = InstanceLearner;

},{"./Constants":2,"./Learner":7,"./Prediction":10,"./Utils":13}],7:[function(require,module,exports){
/**
 * The abstract class of a gesture learner
 */
function Learner() {
  this.mInstances = [];
}

/**
 * Add an instance to the learner
 * 
 * @param instance
 */
Learner.prototype.addInstance = function(instance) {
  this.mInstances.push(instance);
};

/**
 * Retrieve all the instances
 * 
 * @return instances
 */
Learner.prototype.getInstances = function() {
  return this.mInstances;
};

/**
 * Remove an instance based on its id
 * 
 * @param id
 */
Learner.prototype.removeInstance = function(id) {
  instances = this.mInstances;
  var count = instances.length;
  for (var i = 0; i < count; i++) {
    var instance = instances[i];
    if (id === instance.id) {
      instances.splice(i, 1);
      return;
    }
  }
};

/**
 * Remove all the instances of a category
 * 
 * @param name the category name
 */
Learner.prototype.removeInstances = function(name) {
  var toDelete = [];
  var instances = this.mInstances;
  var count = instances.length;
  for (var i = 0; i < count; ++i) {
    var instance = instances[i];
    // the label can be null, as specified in Instance
    if ((instance.label == null && name == null)
          || (instance.label != null && instance.label === name)) {
      toDelete.push(i);
    }
  }
  for (i=toDelete.length-1; i>=0; --i) {
    instances.splice(toDelete[i], 1);
  }
};

Learner.prototype.classify = function(sequenceType, orientationType, vector) {
};

module.exports = Learner;
},{}],8:[function(require,module,exports){
/**
 * An oriented bounding box
 */
module.exports = function OrientedBoundingBox(angle, cx, cy, w, h) {
  this.orientation = angle;
  this.width = w;
  this.height = h;
  this.centerX = cx;
  this.centerY = cy;
  var ratio = w / h;
  this.squareness = ratio > 1 ? (1/ratio) : ratio;
};
},{}],9:[function(require,module,exports){
/**
 * A timed point of a gesture stroke. Multiple points form a stroke.
 */
module.exports = function Point(x, y, t) {
  if (x instanceof Object) {
    var o = x;
    this.x = o.x;
    this.y = o.y;
    this.timestamp = o.t;
  } else {
    this.x = x;
    this.y = y;
    this.timestamp = t;
  }
};

},{}],10:[function(require,module,exports){
function Prediction(label, predictionScore) {
  this.name = label;
  this.score = predictionScore;
}

Prediction.prototype.toString = function() {
  return this.name;
};

module.exports = Prediction;

},{}],11:[function(require,module,exports){
/**
 * Rectangle object.
 */
function Rect(l, t, r, b) {
  this.set(l, t, r, b);
}

Rect.prototype.clone = function() {
  return new Rect(this.left, this.top, this.right, this.bottom);
};

Rect.prototype.centerX = function() {
  return (this.left + this.right) / 2;
};

Rect.prototype.centerY = function() {
  return (this.top + this.bottom) / 2;
};

Rect.prototype.width = function() {
  return this.right - this.left;
};

Rect.prototype.height = function() {
  return this.bottom - this.top;
};

Rect.prototype.set = function(l, t, r, b) {
  this.top = t;
  this.left = l;
  this.bottom = b;
  this.right = r;
};

Rect.prototype.unionPoint = function(x, y) {
  if (x < this.left) this.left = x;
  if (x > this.right) this.right = x;
  if (y < this.top) this.top = y;
  if (y > this.bottom) this.bottom = y;
};

Rect.prototype.union = function(r) {
  if (r.left < this.left) this.left = r.left;
  if (r.right > this.right) this.right = r.right;
  if (r.top < this.top) this.top = r.top;
  if (r.bottom > this.bottom) this.bottom = r.bottom;
};

module.exports = Rect;

},{}],12:[function(require,module,exports){
var Rect = require('./Rect');
var Point = require('./Point');

/**
 * A gesture stroke started on a touch down and ended on a touch up. A stroke
 * consists of a sequence of timed points. One or multiple strokes form a gesture.
 */
function Stroke(points) {
  if (points == null) return;

  var count = points.length;
  var tmpPoints = Array(count*2);
  var times = Array(count);
  var bx = null;
  var len = 0;
  var index = 0;
  
  for (var i=0; i<count; ++i) {
    var p = points[i];
    tmpPoints[i*2] = p.x;
    tmpPoints[i*2+1] = p.y;
    times[index] = p.timestamp;

    if (bx == null) {
      bx = new Rect(p.x, p.y, p.x, p.y);
      len = 0;
    } else {
      var dx = p.x - tmpPoints[(i - 1) * 2];
      var dy = p.y - tmpPoints[(i -1) * 2 + 1];
      len += Math.sqrt(dx*dx + dy*dy);
      bx.unionPoint(p.x, p.y);
    }
    index++;
  }
    
  this.timestamps = times;
  this.points = tmpPoints;
  this.boundingBox = bx;
  this.length = len;
}

Stroke.prototype.clone = function() {
  var stroke = new Stroke();
  stroke.boundingBox = this.boundingBox.clone();
  stroke.length = this.length;
  stroke.points = this.points.slice();
  stroke.timestamps = this.timestamps.slice();
  return stroke;
};

// ---

Stroke.prototype.toJSON = function() {
  var points = [];
  var count = this.points.length;
  for (var i=0; i<count; i+=2) {
    points.push({
      x: this.points[i],
      y: this.points[i+1],
      t: this.timestamps[i>>1]
    });
  }
  return points;
};

Stroke.fromJSON = function(json) {
  var points = [];
  for (var i=0; i<json.length; ++i) {
    points.push(new Point(json[i]));
  }
  return new Stroke(points);
};

module.exports = Stroke;

},{"./Point":9,"./Rect":11}],13:[function(require,module,exports){
var OrientedBoundingBox = require('./OrientedBoundingBox');

/**
 * Utility functions for gesture processing & analysis, including methods for:
 * <ul> 
 * <li>feature extraction (e.g., samplers and those for calculating bounding
 * boxes and gesture path lengths);
 * <li>geometric transformation (e.g., translation, rotation and scaling);
 * <li>gesture similarity comparison (e.g., calculating Euclidean or Cosine
 * distances between two gestures).
 * </ul>
 */
var Utils = {};

Utils.SCALING_THRESHOLD = 0.26;
Utils.NONUNIFORM_SCALE = Math.sqrt(2);

Utils.zeroes = function(n) {
  var array = Array(n);
  for (var i=0; i<n; ++i) array[i] = 0;
  return array;
}

/**
 * Samples the gesture spatially by rendering the gesture into a 2D 
 * grayscale bitmap. Scales the gesture to fit the size of the bitmap. 
 * 
 * @param gesture the gesture to be sampled
 * @param bitmapSize the size of the bitmap
 * @param keepAspectRatio if the scaling should keep the gesture's 
 *        aspect ratio
 * 
 * @return a bitmapSize x bitmapSize grayscale bitmap that is represented 
 *         as a 1D array. The float at index i represents the grayscale 
 *         value at pixel [i%bitmapSize, i/bitmapSize] 
 */
Utils.spatialSampling = function(gesture, bitmapSize, keepAspectRatio) {
  var targetPatchSize = bitmapSize - 1;
  var sample = Utils.zeroes(bitmapSize * bitmapSize);
  var rect = gesture.getBoundingBox();
  var gestureWidth = rect.width();
  var gestureHeight = rect.height();
  var sx = targetPatchSize / gestureWidth;
  var sy = targetPatchSize / gestureHeight;
  var scale;

  if (keepAspectRatio) {
    scale = sx < sy ? sx : sy;
    sx = scale;
    sy = scale;
  } else {
    var aspectRatio = gestureWidth / gestureHeight;
    if (aspectRatio > 1) {
      aspectRation = 1 / aspectRatio;
    }
    if (aspectRatio < Utils.SCALING_THRESHOLD) {
      scale = sx < sy ? sx : sy;
      sx = scale;
      sy = scale;
    } else {
      if (sx > sy) {
        scale = sy * Utils.NONUNIFORM_SCALE;
        if (scale < sx) { sx = scale; }
      } else {
        scale = sx * Utils.NONUNIFORM_SCALE; 
        if (scale < sy) { sy = scale; }
      }
    }
  }

  var preDx = -rect.centerX();
  var preDy = -rect.centerY();
  var postDx = targetPatchSize / 2;
  var postDy = targetPatchSize / 2;
  var strokes = gesture.getStrokes();
  var count = strokes.length;
  var size; // int
  var xpos;
  var ypos;

  for (var index=0; index < count; index++) {
    var stroke = strokes[index];
    var strokepoints = stroke.points;
    size = strokepoints.length;
    var pts = Array(size);
    for (var i=0; i < size; i += 2) {
      pts[i] = (strokepoints[i] + preDx) * sx + postDx;
      pts[i + 1] = (strokepoints[i + 1] + preDy) * sy + postDy;
    }
    var segmentEndX = -1;
    var segmentEndY = -1;
    for (var i=0; i < size; i += 2) {
      var segmentStartX = pts[i] < 0 ? 0 : pts[i];
      var segmentStartY = pts[i + 1] < 0 ? 0 : pts[i + 1];
      if (segmentStartX > targetPatchSize) {
        segmentStartX = targetPatchSize;
      } 
      if (segmentStartY > targetPatchSize) {
        segmentStartY = targetPatchSize;
      }
      Utils.plot(segmentStartX, segmentStartY, sample, bitmapSize);
      if (segmentEndX != -1) {
        // Evaluate horizontally
        if (segmentEndX > segmentStartX) {
          xpos = Math.ceil(segmentStartX);
          var slope = (segmentEndY - segmentStartY) / (segmentEndX - segmentStartX);
          while (xpos < segmentEndX) {
            ypos = slope * (xpos - segmentStartX) + segmentStartY;
            plot(xpos, ypos, sample, bitmapSize); 
            xpos++;
          }
        } else if (segmentEndX < segmentStartX) {
          xpos = Math.ceil(segmentEndX);
          var slope = (segmentEndY - segmentStartY) / (segmentEndX - segmentStartX);
          while (xpos < segmentStartX) {
              ypos = slope * (xpos - segmentStartX) + segmentStartY;
              plot(xpos, ypos, sample, bitmapSize); 
              xpos++;
          }
        }
        // Evaluate vertically
        if (segmentEndY > segmentStartY) {
          ypos = Math.ceil(segmentStartY);
          var invertSlope = (segmentEndX - segmentStartX) / (segmentEndY - segmentStartY);
          while (ypos < segmentEndY) {
              xpos = invertSlope * (ypos - segmentStartY) + segmentStartX;
              plot(xpos, ypos, sample, bitmapSize); 
              ypos++;
          }
        } else if (segmentEndY < segmentStartY) {
          ypos = Math.ceil(segmentEndY);
          var invertSlope = (segmentEndX - segmentStartX) / (segmentEndY - segmentStartY);
          while (ypos < segmentStartY) {
            xpos = invertSlope * (ypos - segmentStartY) + segmentStartX; 
            plot(xpos, ypos, sample, bitmapSize); 
            ypos++;
          }
        }
      }
      segmentEndX = segmentStartX;
      segmentEndY = segmentStartY;
    }
  }
  return sample;
};

Utils.plot = function(x, y, sample, sampleSize) {
  x = x < 0 ? 0 : x;
  y = y < 0 ? 0 : y;
  var xFloor = Math.floor(x);
  var xCeiling = Math.ceil(x);
  var yFloor = Math.floor(y);
  var yCeiling = Math.ceil(y);
  
  // if it's an integer
  if (x === xFloor && y === yFloor) {
    var index = yCeiling * sampleSize + xCeiling;
    if (sample[index] < 1) {
      sample[index] = 1;
    }
  } else {
    var xFloorSq = Math.pow(xFloor - x, 2);
    var yFloorSq = Math.pow(yFloor - y, 2);
    var xCeilingSq = Math.pow(xCeiling - x, 2);
    var yCeilingSq = Math.pow(yCeiling - y, 2);
    var topLeft = Math.sqrt(xFloorSq + yFloorSq);
    var topRight = Math.sqrt(xCeilingSq + yFloorSq);
    var btmLeft = Math.sqrt(xFloorSq + yCeilingSq);
    var btmRight = Math.sqrt(xCeilingSq + yCeilingSq);
    var sum = topLeft + topRight + btmLeft + btmRight;
    
    var value = topLeft / sum;
    var index = yFloor * sampleSize + xFloor;
    if (value > sample[index]) {
      sample[index] = value;
    }
    
    value = topRight / sum;
    index = yFloor * sampleSize + xCeiling;
    if (value > sample[index]) {
      sample[index] = value;
    }
    
    value = btmLeft / sum;
    index = yCeiling * sampleSize + xFloor;
    if (value > sample[index]) {
      sample[index] = value;
    }
    
    value = btmRight / sum;
    index = yCeiling * sampleSize + xCeiling;
    if (value > sample[index]) {
      sample[index] = value;
    }
  }
};

/**
 * Samples a stroke temporally into a given number of evenly-distributed 
 * points.
 * 
 * @param stroke the gesture stroke to be sampled
 * @param numPoints the number of points
 * @return the sampled points in the form of [x1, y1, x2, y2, ..., xn, yn]
 */
Utils.temporalSampling = function(stroke, numPoints) {
  var increment = stroke.length / (numPoints - 1);
  var vectorLength = numPoints * 2;
  var vector = Array(vectorLength);
  var distanceSoFar = 0;
  var pts = stroke.points;
  var lstPointX = pts[0];
  var lstPointY = pts[1];
  var index = 0;
  var currentPointX = Number.MIN_VALUE;
  var currentPointY = Number.MIN_VALUE;
  vector[index] = lstPointX;
  index++;
  vector[index] = lstPointY;
  index++;
  var i = 0;
  var count = pts.length / 2;
  while (i < count) {
    if (currentPointX == Number.MIN_VALUE) {
      i++;
      if (i >= count) {
        break;
      }
      currentPointX = pts[i * 2];
      currentPointY = pts[i * 2 + 1];
    }
    var deltaX = currentPointX - lstPointX;
    var deltaY = currentPointY - lstPointY;
    var distance = Math.sqrt(deltaX*deltaX + deltaY*deltaY);
    if (distanceSoFar + distance >= increment) {
      var ratio = (increment - distanceSoFar) / distance;
      var nx = lstPointX + ratio * deltaX;
      var ny = lstPointY + ratio * deltaY;
      vector[index] = nx;
      index++;
      vector[index] = ny;
      index++;
      lstPointX = nx;
      lstPointY = ny;
      distanceSoFar = 0;
    } else {
      lstPointX = currentPointX;
      lstPointY = currentPointY;
      currentPointX = Number.MIN_VALUE;
      currentPointY = Number.MIN_VALUE;
      distanceSoFar += distance;
    }
  }

  for (i = index; i < vectorLength; i += 2) {
    vector[i] = lstPointX;
    vector[i + 1] = lstPointY;
  }
  return vector;
};

/**
 * Calculates the centroid of a set of points.
 * 
 * @param points the points in the form of [x1, y1, x2, y2, ..., xn, yn]
 * @return the centroid
 */
Utils.computeCentroid = function(points) {
  var centerX = 0;
  var centerY = 0;
  var count = points.length;
  for (var i=0; i<count; ++i) {
    centerX += points[i];
    i++;
    centerY += points[i];
  }
  return [
    2 * centerX / count,
    2 * centerY / count
  ];
};

/**
 * Calculates the variance-covariance matrix of a set of points.
 * 
 * @param points the points in the form of [x1, y1, x2, y2, ..., xn, yn]
 * @return the variance-covariance matrix
 */
Utils.computeCoVariance = function(points) {
  var array = [[0,0], [0,0]];
  var count = points.length;
  for (var i=0; i<count; ++i) {
    var x = points[i];
    i++;
    var y = points[i];
    array[0][0] += x * x;
    array[0][1] += x * y;
    array[1][0] = array[0][1];
    array[1][1] += y * y;
  }
  array[0][0] /= (count / 2);
  array[0][1] /= (count / 2);
  array[1][0] /= (count / 2);
  array[1][1] /= (count / 2);
  return array;
};

Utils.computeTotalLength = function(points) {
  var sum = 0;
  var count = points.length - 4;
  for (var i=0; i<count; i+=2) {
      var dx = points[i + 2] - points[i];
      var dy = points[i + 3] - points[i + 1];
      sum += Math.sqrt(dx*dx + dy*dy);
  }
  return sum;
};

Utils.computeStraightness = function(points) {
  var totalLen = Utils.computeTotalLength(points);
  var dx = points[2] - points[0];
  var dy = points[3] - points[1];
  return Math.sqrt(dx*dx + dy*dy) / totalLen;
};

Utils.computeStraightness = function(points, totalLen) {
  var dx = points[2] - points[0];
  var dy = points[3] - points[1];
  return Math.sqrt(dx*dx + dy*dy) / totalLen;
};

/**
 * Calculates the squared Euclidean distance between two vectors.
 * 
 * @param vector1
 * @param vector2
 * @return the distance
 */
Utils.squaredEuclideanDistance = function(vector1, vector2) {
  var squaredDistance = 0;
  var size = vector1.length;
  for (var i=0; i<size; ++i) {
    var difference = vector1[i] - vector2[i];
    squaredDistance += difference * difference;
  }
  return squaredDistance / size;
};

/**
 * Calculates the cosine distance between two instances.
 * 
 * @param vector1
 * @param vector2
 * @return the distance between 0 and Math.PI
 */
Utils.cosineDistance = function(vector1, vector2) {
  var sum = 0;
  var len = vector1.length;
  for (var i=0; i<len; ++i) {
    sum += vector1[i] * vector2[i];
  }
  return Math.acos(sum);
};

/**
 * Calculates the "minimum" cosine distance between two instances.
 * 
 * @param vector1
 * @param vector2
 * @param numOrientations the maximum number of orientation allowed
 * @return the distance between the two instances (between 0 and Math.PI)
 */
Utils.minimumCosineDistance = function(vector1, vector2, numOrientations) {
  var len = vector1.length;
  var a = 0;
  var b = 0;
  for (var i = 0; i < len; i += 2) {
    a += vector1[i] * vector2[i] + vector1[i + 1] * vector2[i + 1];
    b += vector1[i] * vector2[i + 1] - vector1[i + 1] * vector2[i];
  }
  if (a != 0) {
    var tan = b/a;
    var angle = Math.atan(tan);
    if (numOrientations > 2 && Math.abs(angle) >= Math.PI / numOrientations) {
      return Math.acos(a);
    } else {
      var cosine = Math.cos(angle);
      var sine = cosine * tan; 
      return Math.acos(a * cosine + b * sine);
    }
  } else {
    return Math.PI / 2;
  }
};

/**
 * Computes an oriented, minimum bounding box of a set of points.
 * 
 * @param originalPoints
 * @return an oriented bounding box
 */
Utils.computeOrientedBoundingBoxPoints = function(originalPoints) {
  var count = originalPoints.length;
  var points = Array(count * 2);
  for (var i = 0; i < count; i++) {
      var point = originalPoints[i];
      var index = i * 2;
      points[index] = point.x;
      points[index + 1] = point.y;
  }
  var meanVector = Utils.computeCentroid(points);
  return Utils.computeOrientedBoundingBoxFull(points, meanVector);
};

/**
 * Computes an oriented, minimum bounding box of a set of points.
 * 
 * @param originalPoints
 * @return an oriented bounding box
 */
Utils.computeOrientedBoundingBox = function(originalPoints) {
  var size = originalPoints.length;
  var points = Array(size);
  for (var i = 0; i < size; i++) {
    points[i] = originalPoints[i];
  }
  var meanVector = Utils.computeCentroid(points);
  return Utils.computeOrientedBoundingBoxFull(points, meanVector);
};

Utils.computeOrientedBoundingBoxFull = function(points, centroid) {
  Utils.translate(points, -centroid[0], -centroid[1]);

  var array = Utils.computeCoVariance(points);
  var targetVector = Utils.computeOrientation(array);

  var angle;
  if (targetVector[0] == 0 && targetVector[1] == 0) {
    angle = -Math.PI/2;
  } else { // -PI<alpha<PI
    angle = Math.atan2(targetVector[1], targetVector[0]);
    Utils.rotate(points, -angle);
  }

  var minx = Number.MAX_VALUE;
  var miny = Number.MAX_VALUE;
  var maxx = Number.MIN_VALUE;
  var maxy = Number.MIN_VALUE;
  var count = points.length;
  for (var i = 0; i < count; i++) {
    if (points[i] < minx) {
      minx = points[i];
    }
    if (points[i] > maxx) {
      maxx = points[i];
    }
    i++;
    if (points[i] < miny) {
      miny = points[i];
    }
    if (points[i] > maxy) {
      maxy = points[i];
    }
  }

  return new OrientedBoundingBox(
    (angle * 180 / Math.PI),
    centroid[0],
    centroid[1],
    maxx - minx,
    maxy - miny
  );
};

Utils.computeOrientation = function(covarianceMatrix) {
  var targetVector = [0, 0];
  if (covarianceMatrix[0][1] == 0 || covarianceMatrix[1][0] == 0) {
    targetVector[0] = 1;
    targetVector[1] = 0;
  }

  var a = -covarianceMatrix[0][0] - covarianceMatrix[1][1];
  var b = covarianceMatrix[0][0] * covarianceMatrix[1][1] - covarianceMatrix[0][1]
        * covarianceMatrix[1][0];
  var value = a / 2;
  var rightside = Math.sqrt(Math.pow(value, 2) - b);
  var lambda1 = -value + rightside;
  var lambda2 = -value - rightside;
  if (lambda1 == lambda2) {
    targetVector[0] = 0;
    targetVector[1] = 0;
  } else {
    var lambda = lambda1 > lambda2 ? lambda1 : lambda2;
    targetVector[0] = 1;
    targetVector[1] = (lambda - covarianceMatrix[0][0]) / covarianceMatrix[0][1];
  }
  return targetVector;
};

Utils.rotate = function(points, angle) {
  var cos = Math.cos(angle);
  var sin = Math.sin(angle);
  var size = points.length;
  for (var i = 0; i < size; i += 2) {
    var x = points[i] * cos - points[i + 1] * sin;
    var y = points[i] * sin + points[i + 1] * cos;
    points[i] = x;
    points[i + 1] = y;
  }
  return points;
};

Utils.translate = function(points, dx, dy) {
  var size = points.length;
  for (var i = 0; i < size; i += 2) {
    points[i] += dx;
    points[i + 1] += dy;
  }
  return points;
};

Utils.scale = function(points, sx, sy) {
  var size = points.length;
  for (var i = 0; i < size; i += 2) {
    points[i] *= sx;
    points[i + 1] *= sy;
  }
  return points;
};

module.exports = Utils;
},{"./OrientedBoundingBox":8}]},{},[1])(1)
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJzcmMiLCJzcmMvQ29uc3RhbnRzLmpzIiwic3JjL0dlc3R1cmUuanMiLCJzcmMvR2VzdHVyZVN0b3JlLmpzIiwic3JjL0luc3RhbmNlLmpzIiwic3JjL0luc3RhbmNlTGVhcm5lci5qcyIsInNyYy9MZWFybmVyLmpzIiwic3JjL09yaWVudGVkQm91bmRpbmdCb3guanMiLCJzcmMvUG9pbnQuanMiLCJzcmMvUHJlZGljdGlvbi5qcyIsInNyYy9SZWN0LmpzIiwic3JjL1N0cm9rZS5qcyIsInNyYy9VdGlscy5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDYkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNsQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDM0hBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDckxBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDNUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDaEVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbkVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNYQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNmQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ1ZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDakRBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMxRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3ZhciBmPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIik7dGhyb3cgZi5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGZ9dmFyIGw9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGwuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sbCxsLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsIm1vZHVsZS5leHBvcnRzID0ge1xuICBDb25zdGFudHM6ICAgICAgICAgICByZXF1aXJlKCcuL0NvbnN0YW50cycpLFxuICBHZXN0dXJlOiAgICAgICAgICAgICByZXF1aXJlKCcuL0dlc3R1cmUnKSxcbiAgR2VzdHVyZVN0b3JlOiAgICAgICAgcmVxdWlyZSgnLi9HZXN0dXJlU3RvcmUnKSxcbiAgSW5zdGFuY2U6ICAgICAgICAgICAgcmVxdWlyZSgnLi9JbnN0YW5jZScpLFxuICBJbnN0YW5jZUxlYXJuZXI6ICAgICByZXF1aXJlKCcuL0luc3RhbmNlTGVhcm5lcicpLFxuICBMZWFybmVyOiAgICAgICAgICAgICByZXF1aXJlKCcuL0xlYXJuZXInKSxcbiAgT3JpZW50ZWRCb3VuZGluZ0JveDogcmVxdWlyZSgnLi9PcmllbnRlZEJvdW5kaW5nQm94JyksXG4gIFBvaW50OiAgICAgICAgICAgICAgIHJlcXVpcmUoJy4vUG9pbnQnKSxcbiAgUHJlZGljdGlvbjogICAgICAgICAgcmVxdWlyZSgnLi9QcmVkaWN0aW9uJyksXG4gIFJlY3Q6ICAgICAgICAgICAgICAgIHJlcXVpcmUoJy4vUmVjdCcpLFxuICBTdHJva2U6ICAgICAgICAgICAgICByZXF1aXJlKCcuL1N0cm9rZScpLFxuICBVdGlsczogICAgICAgICAgICAgICByZXF1aXJlKCcuL1V0aWxzJylcbn07IiwiLyoqXG4gKiBDb25zdGFudHMuXG4gKi9cbm1vZHVsZS5leHBvcnRzID0ge1xuICAvLyBpZ25vcmUgc2VxdWVuY2UgaW5mb3JtYXRpb25cbiAgU0VRVUVOQ0VfSU5WQVJJQU5UOiAxLFxuICAvLyB3aGVuIFNFUVVFTkNFX1NFTlNJVElWRSBpcyB1c2VkLCBvbmx5IHNpbmdsZSBzdHJva2UgZ2VzdHVyZXMgYXJlIGN1cnJlbnRseSBhbGxvd2VkXG4gIFNFUVVFTkNFX1NFTlNJVElWRTogMixcblxuICAvLyBPUklFTlRBVElPTl9TRU5TSVRJVkUgYW5kIE9SSUVOVEFUSU9OX0lOVkFSSUFOVCBhcmUgb25seSBmb3IgU0VRVUVOQ0VfU0VOU0lUSVZFIGdlc3R1cmVzXG4gIE9SSUVOVEFUSU9OX0lOVkFSSUFOVDogMSxcbiAgLy8gYXQgbW9zdCAyIGRpcmVjdGlvbnMgY2FuIGJlIHJlY29nbml6ZWRcbiAgT1JJRU5UQVRJT05fU0VOU0lUSVZFOiAyLFxuICAvLyBhdCBtb3N0IDQgZGlyZWN0aW9ucyBjYW4gYmUgcmVjb2duaXplZFxuICBPUklFTlRBVElPTl9TRU5TSVRJVkVfNDogNCxcbiAgLy8gYXQgbW9zdCA4IGRpcmVjdGlvbnMgY2FuIGJlIHJlY29nbml6ZWRcbiAgT1JJRU5UQVRJT05fU0VOU0lUSVZFXzg6IDgsXG5cbiAgU0VRVUVOQ0VfU0FNUExFX1NJWkU6IDE2LFxuXG4gIFBBVENIX1NBTVBMRV9TSVpFOiAxNixcblxuICBPUklFTlRBVElPTlM6IFtcbiAgICAwLFxuICAgIChNYXRoLlBJIC8gNCksXG4gICAgKE1hdGguUEkgLyAyKSxcbiAgICAoTWF0aC5QSSAqIDMgLyA0KSxcbiAgICBNYXRoLlBJLFxuICAgIC0wLFxuICAgICgtTWF0aC5QSSAvIDQpLFxuICAgICgtTWF0aC5QSSAvIDIpLFxuICAgICgtTWF0aC5QSSAqIDMgLyA0KSxcbiAgICAtTWF0aC5QSVxuICBdXG59OyIsInZhciBSZWN0ID0gcmVxdWlyZSgnLi9SZWN0Jyk7XG52YXIgU3Ryb2tlID0gcmVxdWlyZSgnLi9TdHJva2UnKTtcblxuLyoqXG4gKiBBIGdlc3R1cmUgaXMgYSBoYW5kLWRyYXduIHNoYXBlIG9uIGEgdG91Y2ggc2NyZWVuLiBJdCBjYW4gaGF2ZSBvbmUgb3IgbXVsdGlwbGUgc3Ryb2tlcy5cbiAqIEVhY2ggc3Ryb2tlIGlzIGEgc2VxdWVuY2Ugb2YgdGltZWQgcG9pbnRzLiBBIHVzZXItZGVmaW5lZCBnZXN0dXJlIGNhbiBiZSByZWNvZ25pemVkIGJ5IFxuICogYSBHZXN0dXJlTGlicmFyeS4gXG4gKi9cbmZ1bmN0aW9uIEdlc3R1cmUoc3Ryb2tlcykge1xuICB0aGlzLm1Cb3VuZGluZ0JveCA9IG5ldyBSZWN0KCk7XG4gIHRoaXMubUdlc3R1cmVJRCA9IEdlc3R1cmUuR0VTVFVSRV9JRF9CQVNFICsgKCsrR2VzdHVyZS5HRVNUVVJFX0NPVU5UKTtcbiAgdGhpcy5tU3Ryb2tlcyA9IFtdO1xuICBpZiAoIXN0cm9rZXMpIHJldHVybjtcbiAgZm9yICh2YXIgaT0wOyBpPHN0cm9rZXMubGVuZ3RoOyArK2kpIHtcbiAgICB0aGlzLmFkZFN0cm9rZShzdHJva2VzW2ldKTtcbiAgfVxufVxuXG5HZXN0dXJlLkdFU1RVUkVfSURfQkFTRSA9IERhdGUubm93KCk7XG5cbkdlc3R1cmUuR0VTVFVSRV9DT1VOVCA9IDA7XG5cbkdlc3R1cmUucHJvdG90eXBlLmNsb25lID0gZnVuY3Rpb24oKSB7XG4gIHZhciBnZXN0dXJlID0gbmV3IEdlc3R1cmUoKTtcbiAgZ2VzdHVyZS5tQm91bmRpbmdCb3guc2V0KFxuICAgIHRoaXMubUJvdW5kaW5nQm94LmxlZnQsXG4gICAgdGhpcy5tQm91bmRpbmdCb3gudG9wLFxuICAgIHRoaXMubUJvdW5kaW5nQm94LnJpZ2h0LFxuICAgIHRoaXMubUJvdW5kaW5nQm94LmJvdHRvbVxuICApO1xuICB2YXIgY291bnQgPSB0aGlzLm1TdHJva2VzLmxlbmd0aDtcbiAgZm9yICh2YXIgaT0wOyBpPGNvdW50OyArK2kpIHtcbiAgICB2YXIgc3Ryb2tlID0gdGhpcy5tU3Ryb2tlc1tpXTtcbiAgICBnZXN0dXJlLm1TdHJva2VzLnB1c2goc3Ryb2tlLmNsb25lKCkpO1xuICB9XG4gIHJldHVybiBnZXN0dXJlO1xufTtcblxuLyoqXG4gKiBAcmV0dXJuIGFsbCB0aGUgc3Ryb2tlcyBvZiB0aGUgZ2VzdHVyZVxuICovXG5HZXN0dXJlLnByb3RvdHlwZS5nZXRTdHJva2VzID0gZnVuY3Rpb24oKSB7XG4gIHJldHVybiB0aGlzLm1TdHJva2VzO1xufTtcblxuLyoqXG4gKiBAcmV0dXJuIHRoZSBudW1iZXIgb2Ygc3Ryb2tlcyBpbmNsdWRlZCBieSB0aGlzIGdlc3R1cmVcbiAqL1xuR2VzdHVyZS5wcm90b3R5cGUuZ2V0U3Ryb2tlc0NvdW50ID0gZnVuY3Rpb24oKSB7XG4gIHJldHVybiB0aGlzLm1TdHJva2VzLmxlbmd0aDtcbn07XG5cbi8qKlxuICogQWRkcyBhIHN0cm9rZSB0byB0aGUgZ2VzdHVyZS5cbiAqIFxuICogQHBhcmFtIHN0cm9rZVxuICovXG5HZXN0dXJlLnByb3RvdHlwZS5hZGRTdHJva2UgPSBmdW5jdGlvbihzdHJva2UpIHtcbiAgdGhpcy5tU3Ryb2tlcy5wdXNoKHN0cm9rZSk7XG4gIHRoaXMubUJvdW5kaW5nQm94LnVuaW9uKHN0cm9rZS5ib3VuZGluZ0JveCk7XG59O1xuXG4vKipcbiAqIENhbGN1bGF0ZXMgdGhlIHRvdGFsIGxlbmd0aCBvZiB0aGUgZ2VzdHVyZS4gV2hlbiB0aGVyZSBhcmUgbXVsdGlwbGUgc3Ryb2tlcyBpblxuICogdGhlIGdlc3R1cmUsIHRoaXMgcmV0dXJucyB0aGUgc3VtIG9mIHRoZSBsZW5ndGhzIG9mIGFsbCB0aGUgc3Ryb2tlcy5cbiAqIFxuICogQHJldHVybiB0aGUgbGVuZ3RoIG9mIHRoZSBnZXN0dXJlXG4gKi9cbkdlc3R1cmUucHJvdG90eXBlLmdldExlbmd0aCA9IGZ1bmN0aW9uKCkge1xuICB2YXIgbGVuID0gMDtcbiAgdmFyIHN0cm9rZXMgPSB0aGlzLm1TdHJva2VzO1xuICB2YXIgY291bnQgPSBzdHJva2VzLmxlbmd0aDtcbiAgXG4gIGZvciAodmFyIGk9MDsgaTxjb3VudDsgKytpKSB7XG4gICAgbGVuICs9IHN0cm9rZXNbaV0ubGVuZ3RoO1xuICB9XG5cbiAgcmV0dXJuIGxlbjtcbn07XG5cbi8qKlxuICogQHJldHVybiB0aGUgYm91bmRpbmcgYm94IG9mIHRoZSBnZXN0dXJlXG4gKi9cbkdlc3R1cmUucHJvdG90eXBlLmdldEJvdW5kaW5nQm94ID0gZnVuY3Rpb24oKSB7XG4gIHJldHVybiB0aGlzLm1Cb3VuZGluZ0JveDtcbn07XG5cbi8qKlxuICogU2V0cyB0aGUgaWQgb2YgdGhlIGdlc3R1cmUuXG4gKiBcbiAqIEBwYXJhbSBpZFxuICovXG5HZXN0dXJlLnByb3RvdHlwZS5zZXRJRCA9IGZ1bmN0aW9uKGlkKSB7XG4gIHRoaXMubUdlc3R1cmVJRCA9IGlkO1xufTtcblxuLyoqXG4gKiBAcmV0dXJuIHRoZSBpZCBvZiB0aGUgZ2VzdHVyZVxuICovXG5HZXN0dXJlLnByb3RvdHlwZS5nZXRJRCA9IGZ1bmN0aW9uKCkge1xuICByZXR1cm4gdGhpcy5tR2VzdHVyZUlEO1xufTtcblxuLy8gLS0tXG5cbkdlc3R1cmUucHJvdG90eXBlLnRvSlNPTiA9IGZ1bmN0aW9uKCkge1xuICB2YXIgc3Ryb2tlcyA9IFtdO1xuICB2YXIgY291bnQgPSB0aGlzLm1TdHJva2VzLmxlbmd0aDtcbiAgZm9yICh2YXIgaT0wOyBpPGNvdW50OyArK2kpIHtcbiAgICBzdHJva2VzLnB1c2godGhpcy5tU3Ryb2tlc1tpXS50b0pTT04oKSk7XG4gIH1cbiAgcmV0dXJuIHN0cm9rZXM7XG59O1xuXG5HZXN0dXJlLmZyb21KU09OID0gZnVuY3Rpb24oanNvbikge1xuICB2YXIgZ2VzdHVyZSA9IG5ldyBHZXN0dXJlKCk7XG4gIGZvciAodmFyIGk9MDsgaTxqc29uLmxlbmd0aDsgKytpKSB7XG4gICAgZ2VzdHVyZS5hZGRTdHJva2UoU3Ryb2tlLmZyb21KU09OKGpzb25baV0pKTtcbiAgfVxuICByZXR1cm4gZ2VzdHVyZTtcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gR2VzdHVyZTtcbiIsInZhciBDb25zdGFudHMgPSByZXF1aXJlKCcuL0NvbnN0YW50cycpO1xudmFyIEdlc3R1cmUgPSByZXF1aXJlKCcuL0dlc3R1cmUnKTtcbnZhciBJbnN0YW5jZSA9IHJlcXVpcmUoJy4vSW5zdGFuY2UnKTtcbnZhciBJbnN0YW5jZUxlYXJuZXIgPSByZXF1aXJlKCcuL0luc3RhbmNlTGVhcm5lcicpO1xuXG4vKipcbiAqIEdlc3R1cmVTdG9yZSBtYWludGFpbnMgZ2VzdHVyZSBleGFtcGxlcyBhbmQgbWFrZXMgcHJlZGljdGlvbnMgb24gYSBuZXdcbiAqIGdlc3R1cmUuXG4gKi9cbmZ1bmN0aW9uIEdlc3R1cmVTdG9yZSgpIHtcbiAgdGhpcy5tU2VxdWVuY2VUeXBlID0gQ29uc3RhbnRzLlNFUVVFTkNFX1NFTlNJVElWRTtcbiAgdGhpcy5tT3JpZW50YXRpb25TdHlsZSA9IENvbnN0YW50cy5PUklFTlRBVElPTl9TRU5TSVRJVkVfNDtcbiAgdGhpcy5tQ2xhc3NpZmllciA9IG5ldyBJbnN0YW5jZUxlYXJuZXIoKTtcbiAgdGhpcy5tQ2hhbmdlZCA9IGZhbHNlO1xuICB0aGlzLm1OYW1lZEdlc3R1cmVzID0ge307XG59XG5cbi8qKlxuICogU3BlY2lmeSBob3cgdGhlIGdlc3R1cmUgbGlicmFyeSB3aWxsIGhhbmRsZSBvcmllbnRhdGlvbi4gXG4gKiBVc2UgT1JJRU5UQVRJT05fSU5WQVJJQU5UIG9yIE9SSUVOVEFUSU9OX1NFTlNJVElWRVxuICogXG4gKiBAcGFyYW0gc3R5bGVcbiAqL1xuR2VzdHVyZVN0b3JlLnByb3RvdHlwZS5zZXRPcmllbnRhdGlvblN0eWxlID0gZnVuY3Rpb24oc3R5bGUpIHtcbiAgdGhpcy5tT3JpZW50YXRpb25TdHlsZSA9IHN0eWxlO1xufTtcblxuR2VzdHVyZVN0b3JlLnByb3RvdHlwZS5nZXRPcmllbnRhdGlvblN0eWxlID0gZnVuY3Rpb24oKSB7XG4gIHJldHVybiB0aGlzLm1PcmllbnRhdGlvblN0eWxlO1xufTtcblxuLyoqXG4gKiBAcGFyYW0gdHlwZSBTRVFVRU5DRV9JTlZBUklBTlQgb3IgU0VRVUVOQ0VfU0VOU0lUSVZFXG4gKi9cbkdlc3R1cmVTdG9yZS5wcm90b3R5cGUuc2V0U2VxdWVuY2VUeXBlID0gZnVuY3Rpb24odHlwZSkge1xuICB0aGlzLm1TZXF1ZW5jZVR5cGUgPSB0eXBlO1xufTtcblxuLyoqXG4gKiBAcmV0dXJuIFNFUVVFTkNFX0lOVkFSSUFOVCBvciBTRVFVRU5DRV9TRU5TSVRJVkVcbiAqL1xuR2VzdHVyZVN0b3JlLnByb3RvdHlwZS5nZXRTZXF1ZW5jZVR5cGUgPSBmdW5jdGlvbigpIHtcbiAgcmV0dXJuIHRoaXMubVNlcXVlbmNlVHlwZTtcbn07XG5cbi8qKlxuICogR2V0IGFsbCB0aGUgZ2VzdHVyZSBlbnRyeSBuYW1lcyBpbiB0aGUgbGlicmFyeVxuICogXG4gKiBAcmV0dXJuIGEgc2V0IG9mIHN0cmluZ3NcbiAqL1xuR2VzdHVyZVN0b3JlLnByb3RvdHlwZS5nZXRHZXN0dXJlRW50cmllcyA9IGZ1bmN0aW9uKCkge1xuICB2YXIgbmFtZXMgPSBbXTtcbiAgZm9yICh2YXIgbmFtZSBpbiB0aGlzLm1OYW1lZEdlc3R1cmVzKSB7XG4gICAgbmFtZXMucHVzaChuYW1lKTtcbiAgfVxuICByZXR1cm4gbmFtZXM7XG59O1xuXG4vKipcbiAqIFJlY29nbml6ZSBhIGdlc3R1cmVcbiAqIFxuICogQHBhcmFtIGdlc3R1cmUgdGhlIHF1ZXJ5XG4gKiBAcmV0dXJuIGEgbGlzdCBvZiBwcmVkaWN0aW9ucyBvZiBwb3NzaWJsZSBlbnRyaWVzIGZvciBhIGdpdmVuIGdlc3R1cmVcbiAqL1xuR2VzdHVyZVN0b3JlLnByb3RvdHlwZS5yZWNvZ25pemUgPSBmdW5jdGlvbihnZXN0dXJlKSB7XG4gIHZhciBpbnN0YW5jZSA9IEluc3RhbmNlLmNyZWF0ZUluc3RhbmNlKFxuICAgICAgdGhpcy5tU2VxdWVuY2VUeXBlLCB0aGlzLm1PcmllbnRhdGlvblN0eWxlLCBnZXN0dXJlLCBudWxsKTtcbiAgcmV0dXJuIHRoaXMubUNsYXNzaWZpZXIuY2xhc3NpZnkoXG4gICAgICB0aGlzLm1TZXF1ZW5jZVR5cGUsIHRoaXMubU9yaWVudGF0aW9uU3R5bGUsIGluc3RhbmNlLnZlY3Rvcik7XG59O1xuXG4vKipcbiAqIEFkZCBhIGdlc3R1cmUgZm9yIHRoZSBlbnRyeVxuICogXG4gKiBAcGFyYW0gZW50cnlOYW1lIGVudHJ5IG5hbWVcbiAqIEBwYXJhbSBnZXN0dXJlXG4gKi9cbkdlc3R1cmVTdG9yZS5wcm90b3R5cGUuYWRkR2VzdHVyZSA9IGZ1bmN0aW9uKGVudHJ5TmFtZSwgZ2VzdHVyZSkge1xuICBpZiAoZW50cnlOYW1lID09IG51bGwgfHwgZW50cnlOYW1lLmxlbmd0aCA9PT0gMCkge1xuICAgIHJldHVybjtcbiAgfVxuICBnZXN0dXJlcyA9IHRoaXMubU5hbWVkR2VzdHVyZXNbZW50cnlOYW1lXTtcbiAgaWYgKGdlc3R1cmVzID09IG51bGwpIHtcbiAgICBnZXN0dXJlcyA9IFtdO1xuICAgIHRoaXMubU5hbWVkR2VzdHVyZXNbZW50cnlOYW1lXSA9IGdlc3R1cmVzO1xuICB9XG4gIGdlc3R1cmVzLnB1c2goZ2VzdHVyZSk7XG4gIHRoaXMubUNsYXNzaWZpZXIuYWRkSW5zdGFuY2UoSW5zdGFuY2UuY3JlYXRlSW5zdGFuY2UoXG4gICAgdGhpcy5tU2VxdWVuY2VUeXBlLCB0aGlzLm1PcmllbnRhdGlvblN0eWxlLCBnZXN0dXJlLCBlbnRyeU5hbWVcbiAgKSk7XG4gIHRoaXMubUNoYW5nZWQgPSB0cnVlO1xufTtcblxuLyoqXG4gKiBSZW1vdmUgYSBnZXN0dXJlIGZyb20gdGhlIGxpYnJhcnkuIElmIHRoZXJlIGFyZSBubyBtb3JlIGdlc3R1cmVzIGZvciB0aGVcbiAqIGdpdmVuIGVudHJ5LCB0aGUgZ2VzdHVyZSBlbnRyeSB3aWxsIGJlIHJlbW92ZWQuXG4gKiBcbiAqIEBwYXJhbSBlbnRyeU5hbWUgZW50cnkgbmFtZVxuICogQHBhcmFtIGdlc3R1cmVcbiAqL1xuR2VzdHVyZVN0b3JlLnByb3RvdHlwZS5yZW1vdmVHZXN0dXJlID0gZnVuY3Rpb24oZW50cnlOYW1lLCBnZXN0dXJlKSB7XG4gIHZhciBnZXN0dXJlcyA9IHRoaXMubU5hbWVkR2VzdHVyZXNbZW50cnlOYW1lXTtcbiAgaWYgKGdlc3R1cmVzID09IG51bGwpIHtcbiAgICByZXR1cm47XG4gIH1cblxuICB2YXIgaW5kZXggPSBnZXN0dXJlcy5pbmRleE9mKGdlc3R1cmUpO1xuICBnZXN0dXJlcy5zcGxpY2UoaW5kZXgsIDEpO1xuXG4gIC8vIGlmIHRoZXJlIGFyZSBubyBtb3JlIHNhbXBsZXMsIHJlbW92ZSB0aGUgZW50cnkgYXV0b21hdGljYWxseVxuICBpZiAoZ2VzdHVyZXMubGVuZ3RoID09PSAwKSB7XG4gICAgZGVsZXRlIHRoaXMubU5hbWVkR2VzdHVyZXNbZW50cnlOYW1lXTtcbiAgfVxuXG4gIHRoaXMubUNsYXNzaWZpZXIucmVtb3ZlSW5zdGFuY2UoZ2VzdHVyZS5nZXRJRCgpKTtcblxuICB0aGlzLm1DaGFuZ2VkID0gdHJ1ZTtcbn07XG5cbi8qKlxuICogUmVtb3ZlIGFuIGVudHJ5IG9mIGdlc3R1cmVzXG4gKiBcbiAqIEBwYXJhbSBlbnRyeU5hbWUgdGhlIGVudHJ5IG5hbWVcbiAqL1xuR2VzdHVyZVN0b3JlLnByb3RvdHlwZS5yZW1vdmVFbnRyeSA9IGZ1bmN0aW9uKGVudHJ5TmFtZSkge1xuICBkZWxldGUgdGhpcy5tTmFtZWRHZXN0dXJlc1tlbnRyeU5hbWVdO1xuICB0aGlzLm1DbGFzc2lmaWVyLnJlbW92ZUluc3RhbmNlcyhlbnRyeU5hbWUpO1xuICB0aGlzLm1DaGFuZ2VkID0gdHJ1ZTtcbn07XG5cbi8qKlxuICogR2V0IGFsbCB0aGUgZ2VzdHVyZXMgb2YgYW4gZW50cnlcbiAqIFxuICogQHBhcmFtIGVudHJ5TmFtZVxuICogQHJldHVybiB0aGUgbGlzdCBvZiBnZXN0dXJlcyB0aGF0IGlzIHVuZGVyIHRoaXMgbmFtZVxuICovXG5HZXN0dXJlU3RvcmUucHJvdG90eXBlLmdldEdlc3R1cmVzID0gZnVuY3Rpb24oZW50cnlOYW1lKSB7XG4gIHZhciBnZXN0dXJlcyA9IHRoaXMubU5hbWVkR2VzdHVyZXNbZW50cnlOYW1lXTtcbiAgaWYgKGdlc3R1cmVzICE9IG51bGwpIHtcbiAgICByZXR1cm4gZ2VzdHVyZXMuc2xpY2UoKTtcbiAgfSBlbHNlIHtcbiAgICByZXR1cm4gW107XG4gIH1cbn07XG5cbkdlc3R1cmVTdG9yZS5wcm90b3R5cGUuaGFzQ2hhbmdlZCA9IGZ1bmN0aW9uKCkge1xuICByZXR1cm4gdGhpcy5tQ2hhbmdlZDtcbn07XG5cbkdlc3R1cmVTdG9yZS5wcm90b3R5cGUuZ2V0TGVhcm5lciA9IGZ1bmN0aW9uKCkge1xuICByZXR1cm4gdGhpcy5tQ2xhc3NpZmllcjtcbn07XG5cbi8vIC0tLVxuXG5HZXN0dXJlU3RvcmUucHJvdG90eXBlLnRvSlNPTiA9IGZ1bmN0aW9uKCkge1xuICB2YXIgbyA9IHt9O1xuICBvLnNlcXVlbmNlID0gdGhpcy5tU2VxdWVuY2VUeXBlO1xuICBvLm9yaWVudGF0aW9uID0gdGhpcy5tT3JpZW50YXRpb25TdHlsZTtcbiAgby5nZXN0dXJlcyA9IHt9O1xuICBmb3IgKHZhciBuYW1lIGluIHRoaXMubU5hbWVkR2VzdHVyZXMpIHtcbiAgICB2YXIgZ2VzdHVyZXMgPSB0aGlzLm1OYW1lZEdlc3R1cmVzW25hbWVdO1xuICAgIG8uZ2VzdHVyZXNbbmFtZV0gPSBnZXN0dXJlcy5tYXAoZnVuY3Rpb24oZykgeyByZXR1cm4gZy50b0pTT04oKTsgfSk7XG4gIH1cbiAgcmV0dXJuIG87XG59O1xuXG5HZXN0dXJlU3RvcmUuZnJvbUpTT04gPSBmdW5jdGlvbihqc29uKSB7XG4gIHZhciBncyA9IG5ldyBHZXN0dXJlU3RvcmUoKTtcbiAgZ3Muc2V0U2VxdWVuY2VUeXBlKGpzb24uc2VxdWVuY2UpO1xuICBncy5zZXRPcmllbnRhdGlvblN0eWxlKGpzb24ub3JpZW50YXRpb24pO1xuICBmb3IgKHZhciBuYW1lIGluIGpzb24uZ2VzdHVyZXMpIHtcbiAgICB2YXIgZ2VzdHVyZXMgPSBqc29uLmdlc3R1cmVzW25hbWVdO1xuICAgIGdlc3R1cmVzLmZvckVhY2goZnVuY3Rpb24oZykge1xuICAgICAgZ3MuYWRkR2VzdHVyZShuYW1lLCBHZXN0dXJlLmZyb21KU09OKGcpKTtcbiAgICB9KTtcbiAgfVxuICByZXR1cm4gZ3M7XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IEdlc3R1cmVTdG9yZTtcbiIsInZhciBDb25zdGFudHMgPSByZXF1aXJlKCcuL0NvbnN0YW50cycpO1xudmFyIFV0aWxzID0gcmVxdWlyZSgnLi9VdGlscycpO1xuXG4vKipcbiAqIEFuIGluc3RhbmNlIHJlcHJlc2VudHMgYSBzYW1wbGUgaWYgdGhlIGxhYmVsIGlzIGF2YWlsYWJsZSBvciBhIHF1ZXJ5IGlmIHRoZVxuICogbGFiZWwgaXMgbnVsbC5cbiAqL1xuZnVuY3Rpb24gSW5zdGFuY2UoaWQsIHNhbXBsZSwgc2FtcGxlTmFtZSkge1xuICB0aGlzLmlkID0gaWQ7XG4gIHRoaXMudmVjdG9yID0gc2FtcGxlO1xuICB0aGlzLmxhYmVsID0gc2FtcGxlTmFtZTtcbn1cblxuSW5zdGFuY2UucHJvdG90eXBlLm5vcm1hbGl6ZSA9IGZ1bmN0aW9uKCkge1xuICB2YXIgc2FtcGxlID0gdGhpcy52ZWN0b3I7XG4gIHZhciBzdW0gPSAwO1xuXG4gIHZhciBzaXplID0gc2FtcGxlLmxlbmd0aDtcbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBzaXplOyBpKyspIHtcbiAgICBzdW0gKz0gc2FtcGxlW2ldICogc2FtcGxlW2ldO1xuICB9XG5cbiAgdmFyIG1hZ25pdHVkZSA9IE1hdGguc3FydChzdW0pO1xuICBmb3IgKHZhciBpID0gMDsgaSA8IHNpemU7IGkrKykge1xuICAgIHNhbXBsZVtpXSAvPSBtYWduaXR1ZGU7XG4gIH1cbn07XG5cbi8qKlxuICogY3JlYXRlIGEgbGVhcm5pbmcgaW5zdGFuY2UgZm9yIGEgc2luZ2xlIHN0cm9rZSBnZXN0dXJlXG4gKiBcbiAqIEBwYXJhbSBnZXN0dXJlXG4gKiBAcGFyYW0gbGFiZWxcbiAqIEByZXR1cm4gdGhlIGluc3RhbmNlXG4gKi9cbkluc3RhbmNlLmNyZWF0ZUluc3RhbmNlID0gZnVuY3Rpb24oc2VxdWVuY2VUeXBlLCBvcmllbnRhdGlvblR5cGUsIGdlc3R1cmUsIGxhYmVsKSB7XG4gIHZhciBwdHM7XG4gIHZhciBpbnN0YW5jZTtcbiAgaWYgKHNlcXVlbmNlVHlwZSA9PT0gQ29uc3RhbnRzLlNFUVVFTkNFX1NFTlNJVElWRSkge1xuICAgIHB0cyA9IEluc3RhbmNlLnRlbXBvcmFsU2FtcGxlcihvcmllbnRhdGlvblR5cGUsIGdlc3R1cmUpO1xuICAgIGluc3RhbmNlID0gbmV3IEluc3RhbmNlKGdlc3R1cmUuZ2V0SUQoKSwgcHRzLCBsYWJlbCk7XG4gICAgaW5zdGFuY2Uubm9ybWFsaXplKCk7XG4gIH0gZWxzZSB7XG4gICAgcHRzID0gSW5zdGFuY2Uuc3BhdGlhbFNhbXBsZXIoZ2VzdHVyZSk7XG4gICAgaW5zdGFuY2UgPSBuZXcgSW5zdGFuY2UoZ2VzdHVyZS5nZXRJRCgpLCBwdHMsIGxhYmVsKTtcbiAgfVxuICByZXR1cm4gaW5zdGFuY2U7XG59O1xuXG5JbnN0YW5jZS5zcGF0aWFsU2FtcGxlciA9IGZ1bmN0aW9uKGdlc3R1cmUpIHtcbiAgcmV0dXJuIFV0aWxzLnNwYXRpYWxTYW1wbGluZyhnZXN0dXJlLCBDb25zdGFudHMuUEFUQ0hfU0FNUExFX1NJWkUsIGZhbHNlKTtcbn07XG5cbkluc3RhbmNlLnRlbXBvcmFsU2FtcGxlciA9IGZ1bmN0aW9uKG9yaWVudGF0aW9uVHlwZSwgZ2VzdHVyZSkge1xuICB2YXIgcHRzID0gVXRpbHMudGVtcG9yYWxTYW1wbGluZyhnZXN0dXJlLmdldFN0cm9rZXMoKVswXSxcbiAgICAgICAgICBDb25zdGFudHMuU0VRVUVOQ0VfU0FNUExFX1NJWkUpO1xuICB2YXIgY2VudGVyID0gVXRpbHMuY29tcHV0ZUNlbnRyb2lkKHB0cyk7XG4gIHZhciBvcmllbnRhdGlvbiA9IE1hdGguYXRhbjIocHRzWzFdIC0gY2VudGVyWzFdLCBwdHNbMF0gLSBjZW50ZXJbMF0pO1xuXG4gIHZhciBhZGp1c3RtZW50ID0gLW9yaWVudGF0aW9uO1xuICBpZiAob3JpZW50YXRpb25UeXBlICE9IENvbnN0YW50cy5PUklFTlRBVElPTl9JTlZBUklBTlQpIHtcbiAgICB2YXIgY291bnQgPSBDb25zdGFudHMuT1JJRU5UQVRJT05TLmxlbmd0aDtcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IGNvdW50OyBpKyspIHtcbiAgICAgIHZhciBkZWx0YSA9IENvbnN0YW50cy5PUklFTlRBVElPTlNbaV0gLSBvcmllbnRhdGlvbjtcbiAgICAgIGlmIChNYXRoLmFicyhkZWx0YSkgPCBNYXRoLmFicyhhZGp1c3RtZW50KSkge1xuICAgICAgICBhZGp1c3RtZW50ID0gZGVsdGE7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgVXRpbHMudHJhbnNsYXRlKHB0cywgLWNlbnRlclswXSwgLWNlbnRlclsxXSk7XG4gIFV0aWxzLnJvdGF0ZShwdHMsIGFkanVzdG1lbnQpO1xuXG4gIHJldHVybiBwdHM7XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IEluc3RhbmNlOyIsInZhciBQcmVkaWN0aW9uID0gcmVxdWlyZSgnLi9QcmVkaWN0aW9uJyk7XG52YXIgQ29uc3RhbnRzID0gcmVxdWlyZSgnLi9Db25zdGFudHMnKTtcbnZhciBMZWFybmVyID0gcmVxdWlyZSgnLi9MZWFybmVyJyk7XG52YXIgVXRpbHMgPSByZXF1aXJlKCcuL1V0aWxzJyk7XG5cbi8qKlxuICogQW4gaW1wbGVtZW50YXRpb24gb2YgYW4gaW5zdGFuY2UtYmFzZWQgbGVhcm5lclxuICovXG5mdW5jdGlvbiBJbnN0YW5jZUxlYXJuZXIoKSB7XG4gIExlYXJuZXIuY2FsbCh0aGlzKTtcbn1cblxuSW5zdGFuY2VMZWFybmVyLnByb3RvdHlwZSA9IG5ldyBMZWFybmVyKCk7XG5cbkluc3RhbmNlTGVhcm5lci5jb21wYXJlID0gZnVuY3Rpb24ob2JqZWN0MSwgb2JqZWN0Mikge1xuICB2YXIgc2NvcmUxID0gb2JqZWN0MS5zY29yZTtcbiAgdmFyIHNjb3JlMiA9IG9iamVjdDIuc2NvcmU7XG4gIGlmIChzY29yZTEgPiBzY29yZTIpIHtcbiAgICByZXR1cm4gLTE7XG4gIH0gZWxzZSBpZiAoc2NvcmUxIDwgc2NvcmUyKSB7XG4gICAgcmV0dXJuIDE7XG4gIH0gZWxzZSB7XG4gICAgcmV0dXJuIDA7XG4gIH1cbn07XG5cbkluc3RhbmNlTGVhcm5lci5wcm90b3R5cGUuY2xhc3NpZnkgPSBmdW5jdGlvbihzZXF1ZW5jZVR5cGUsIG9yaWVudGF0aW9uVHlwZSwgdmVjdG9yKSB7XG4gIHZhciBwcmVkaWN0aW9ucyA9IFtdO1xuICB2YXIgaW5zdGFuY2VzID0gdGhpcy5nZXRJbnN0YW5jZXMoKTtcbiAgdmFyIGNvdW50ID0gaW5zdGFuY2VzLmxlbmd0aDtcbiAgdmFyIGxhYmVsMnNjb3JlID0ge307XG5cbiAgZm9yICh2YXIgaT0wOyBpPGNvdW50OyArK2kpIHtcbiAgICB2YXIgc2FtcGxlID0gaW5zdGFuY2VzW2ldO1xuICAgIGlmIChzYW1wbGUudmVjdG9yLmxlbmd0aCAhPSB2ZWN0b3IubGVuZ3RoKSB7XG4gICAgICBjb250aW51ZTtcbiAgICB9XG4gICAgdmFyIGRpc3RhbmNlO1xuICAgIGlmIChzZXF1ZW5jZVR5cGUgPT0gQ29uc3RhbnRzLlNFUVVFTkNFX1NFTlNJVElWRSkge1xuICAgICAgZGlzdGFuY2UgPSBVdGlscy5taW5pbXVtQ29zaW5lRGlzdGFuY2Uoc2FtcGxlLnZlY3RvciwgdmVjdG9yLCBvcmllbnRhdGlvblR5cGUpO1xuICAgIH0gZWxzZSB7XG4gICAgICBkaXN0YW5jZSA9IFV0aWxzLnNxdWFyZWRFdWNsaWRlYW5EaXN0YW5jZShzYW1wbGUudmVjdG9yLCB2ZWN0b3IpO1xuICAgIH1cbiAgICB2YXIgd2VpZ2h0O1xuICAgIGlmIChkaXN0YW5jZSA9PSAwKSB7XG4gICAgICB3ZWlnaHQgPSBOdW1iZXIuTUFYX1ZBTFVFO1xuICAgIH0gZWxzZSB7XG4gICAgICB3ZWlnaHQgPSAxIC8gZGlzdGFuY2U7XG4gICAgfVxuICAgIHZhciBzY29yZSA9IGxhYmVsMnNjb3JlW3NhbXBsZS5sYWJlbF07XG4gICAgaWYgKHNjb3JlID09IG51bGwgfHwgd2VpZ2h0ID4gc2NvcmUpIHtcbiAgICAgIGxhYmVsMnNjb3JlW3NhbXBsZS5sYWJlbF0gPSB3ZWlnaHQ7XG4gICAgfVxuICB9XG5cbiAgZm9yICh2YXIgbmFtZSBpbiBsYWJlbDJzY29yZSkge1xuICAgIHZhciBzY29yZSA9IGxhYmVsMnNjb3JlW25hbWVdO1xuICAgIHByZWRpY3Rpb25zLnB1c2gobmV3IFByZWRpY3Rpb24obmFtZSwgc2NvcmUpKTtcbiAgfVxuXG4gIHJldHVybiBwcmVkaWN0aW9ucy5zb3J0KEluc3RhbmNlTGVhcm5lci5jb21wYXJlKTtcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gSW5zdGFuY2VMZWFybmVyO1xuIiwiLyoqXG4gKiBUaGUgYWJzdHJhY3QgY2xhc3Mgb2YgYSBnZXN0dXJlIGxlYXJuZXJcbiAqL1xuZnVuY3Rpb24gTGVhcm5lcigpIHtcbiAgdGhpcy5tSW5zdGFuY2VzID0gW107XG59XG5cbi8qKlxuICogQWRkIGFuIGluc3RhbmNlIHRvIHRoZSBsZWFybmVyXG4gKiBcbiAqIEBwYXJhbSBpbnN0YW5jZVxuICovXG5MZWFybmVyLnByb3RvdHlwZS5hZGRJbnN0YW5jZSA9IGZ1bmN0aW9uKGluc3RhbmNlKSB7XG4gIHRoaXMubUluc3RhbmNlcy5wdXNoKGluc3RhbmNlKTtcbn07XG5cbi8qKlxuICogUmV0cmlldmUgYWxsIHRoZSBpbnN0YW5jZXNcbiAqIFxuICogQHJldHVybiBpbnN0YW5jZXNcbiAqL1xuTGVhcm5lci5wcm90b3R5cGUuZ2V0SW5zdGFuY2VzID0gZnVuY3Rpb24oKSB7XG4gIHJldHVybiB0aGlzLm1JbnN0YW5jZXM7XG59O1xuXG4vKipcbiAqIFJlbW92ZSBhbiBpbnN0YW5jZSBiYXNlZCBvbiBpdHMgaWRcbiAqIFxuICogQHBhcmFtIGlkXG4gKi9cbkxlYXJuZXIucHJvdG90eXBlLnJlbW92ZUluc3RhbmNlID0gZnVuY3Rpb24oaWQpIHtcbiAgaW5zdGFuY2VzID0gdGhpcy5tSW5zdGFuY2VzO1xuICB2YXIgY291bnQgPSBpbnN0YW5jZXMubGVuZ3RoO1xuICBmb3IgKHZhciBpID0gMDsgaSA8IGNvdW50OyBpKyspIHtcbiAgICB2YXIgaW5zdGFuY2UgPSBpbnN0YW5jZXNbaV07XG4gICAgaWYgKGlkID09PSBpbnN0YW5jZS5pZCkge1xuICAgICAgaW5zdGFuY2VzLnNwbGljZShpLCAxKTtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gIH1cbn07XG5cbi8qKlxuICogUmVtb3ZlIGFsbCB0aGUgaW5zdGFuY2VzIG9mIGEgY2F0ZWdvcnlcbiAqIFxuICogQHBhcmFtIG5hbWUgdGhlIGNhdGVnb3J5IG5hbWVcbiAqL1xuTGVhcm5lci5wcm90b3R5cGUucmVtb3ZlSW5zdGFuY2VzID0gZnVuY3Rpb24obmFtZSkge1xuICB2YXIgdG9EZWxldGUgPSBbXTtcbiAgdmFyIGluc3RhbmNlcyA9IHRoaXMubUluc3RhbmNlcztcbiAgdmFyIGNvdW50ID0gaW5zdGFuY2VzLmxlbmd0aDtcbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBjb3VudDsgKytpKSB7XG4gICAgdmFyIGluc3RhbmNlID0gaW5zdGFuY2VzW2ldO1xuICAgIC8vIHRoZSBsYWJlbCBjYW4gYmUgbnVsbCwgYXMgc3BlY2lmaWVkIGluIEluc3RhbmNlXG4gICAgaWYgKChpbnN0YW5jZS5sYWJlbCA9PSBudWxsICYmIG5hbWUgPT0gbnVsbClcbiAgICAgICAgICB8fCAoaW5zdGFuY2UubGFiZWwgIT0gbnVsbCAmJiBpbnN0YW5jZS5sYWJlbCA9PT0gbmFtZSkpIHtcbiAgICAgIHRvRGVsZXRlLnB1c2goaSk7XG4gICAgfVxuICB9XG4gIGZvciAoaT10b0RlbGV0ZS5sZW5ndGgtMTsgaT49MDsgLS1pKSB7XG4gICAgaW5zdGFuY2VzLnNwbGljZSh0b0RlbGV0ZVtpXSwgMSk7XG4gIH1cbn07XG5cbkxlYXJuZXIucHJvdG90eXBlLmNsYXNzaWZ5ID0gZnVuY3Rpb24oc2VxdWVuY2VUeXBlLCBvcmllbnRhdGlvblR5cGUsIHZlY3Rvcikge1xufTtcblxubW9kdWxlLmV4cG9ydHMgPSBMZWFybmVyOyIsIi8qKlxuICogQW4gb3JpZW50ZWQgYm91bmRpbmcgYm94XG4gKi9cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gT3JpZW50ZWRCb3VuZGluZ0JveChhbmdsZSwgY3gsIGN5LCB3LCBoKSB7XG4gIHRoaXMub3JpZW50YXRpb24gPSBhbmdsZTtcbiAgdGhpcy53aWR0aCA9IHc7XG4gIHRoaXMuaGVpZ2h0ID0gaDtcbiAgdGhpcy5jZW50ZXJYID0gY3g7XG4gIHRoaXMuY2VudGVyWSA9IGN5O1xuICB2YXIgcmF0aW8gPSB3IC8gaDtcbiAgdGhpcy5zcXVhcmVuZXNzID0gcmF0aW8gPiAxID8gKDEvcmF0aW8pIDogcmF0aW87XG59OyIsIi8qKlxuICogQSB0aW1lZCBwb2ludCBvZiBhIGdlc3R1cmUgc3Ryb2tlLiBNdWx0aXBsZSBwb2ludHMgZm9ybSBhIHN0cm9rZS5cbiAqL1xubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiBQb2ludCh4LCB5LCB0KSB7XG4gIGlmICh4IGluc3RhbmNlb2YgT2JqZWN0KSB7XG4gICAgdmFyIG8gPSB4O1xuICAgIHRoaXMueCA9IG8ueDtcbiAgICB0aGlzLnkgPSBvLnk7XG4gICAgdGhpcy50aW1lc3RhbXAgPSBvLnQ7XG4gIH0gZWxzZSB7XG4gICAgdGhpcy54ID0geDtcbiAgICB0aGlzLnkgPSB5O1xuICAgIHRoaXMudGltZXN0YW1wID0gdDtcbiAgfVxufTtcbiIsImZ1bmN0aW9uIFByZWRpY3Rpb24obGFiZWwsIHByZWRpY3Rpb25TY29yZSkge1xuICB0aGlzLm5hbWUgPSBsYWJlbDtcbiAgdGhpcy5zY29yZSA9IHByZWRpY3Rpb25TY29yZTtcbn1cblxuUHJlZGljdGlvbi5wcm90b3R5cGUudG9TdHJpbmcgPSBmdW5jdGlvbigpIHtcbiAgcmV0dXJuIHRoaXMubmFtZTtcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gUHJlZGljdGlvbjtcbiIsIi8qKlxuICogUmVjdGFuZ2xlIG9iamVjdC5cbiAqL1xuZnVuY3Rpb24gUmVjdChsLCB0LCByLCBiKSB7XG4gIHRoaXMuc2V0KGwsIHQsIHIsIGIpO1xufVxuXG5SZWN0LnByb3RvdHlwZS5jbG9uZSA9IGZ1bmN0aW9uKCkge1xuICByZXR1cm4gbmV3IFJlY3QodGhpcy5sZWZ0LCB0aGlzLnRvcCwgdGhpcy5yaWdodCwgdGhpcy5ib3R0b20pO1xufTtcblxuUmVjdC5wcm90b3R5cGUuY2VudGVyWCA9IGZ1bmN0aW9uKCkge1xuICByZXR1cm4gKHRoaXMubGVmdCArIHRoaXMucmlnaHQpIC8gMjtcbn07XG5cblJlY3QucHJvdG90eXBlLmNlbnRlclkgPSBmdW5jdGlvbigpIHtcbiAgcmV0dXJuICh0aGlzLnRvcCArIHRoaXMuYm90dG9tKSAvIDI7XG59O1xuXG5SZWN0LnByb3RvdHlwZS53aWR0aCA9IGZ1bmN0aW9uKCkge1xuICByZXR1cm4gdGhpcy5yaWdodCAtIHRoaXMubGVmdDtcbn07XG5cblJlY3QucHJvdG90eXBlLmhlaWdodCA9IGZ1bmN0aW9uKCkge1xuICByZXR1cm4gdGhpcy5ib3R0b20gLSB0aGlzLnRvcDtcbn07XG5cblJlY3QucHJvdG90eXBlLnNldCA9IGZ1bmN0aW9uKGwsIHQsIHIsIGIpIHtcbiAgdGhpcy50b3AgPSB0O1xuICB0aGlzLmxlZnQgPSBsO1xuICB0aGlzLmJvdHRvbSA9IGI7XG4gIHRoaXMucmlnaHQgPSByO1xufTtcblxuUmVjdC5wcm90b3R5cGUudW5pb25Qb2ludCA9IGZ1bmN0aW9uKHgsIHkpIHtcbiAgaWYgKHggPCB0aGlzLmxlZnQpIHRoaXMubGVmdCA9IHg7XG4gIGlmICh4ID4gdGhpcy5yaWdodCkgdGhpcy5yaWdodCA9IHg7XG4gIGlmICh5IDwgdGhpcy50b3ApIHRoaXMudG9wID0geTtcbiAgaWYgKHkgPiB0aGlzLmJvdHRvbSkgdGhpcy5ib3R0b20gPSB5O1xufTtcblxuUmVjdC5wcm90b3R5cGUudW5pb24gPSBmdW5jdGlvbihyKSB7XG4gIGlmIChyLmxlZnQgPCB0aGlzLmxlZnQpIHRoaXMubGVmdCA9IHIubGVmdDtcbiAgaWYgKHIucmlnaHQgPiB0aGlzLnJpZ2h0KSB0aGlzLnJpZ2h0ID0gci5yaWdodDtcbiAgaWYgKHIudG9wIDwgdGhpcy50b3ApIHRoaXMudG9wID0gci50b3A7XG4gIGlmIChyLmJvdHRvbSA+IHRoaXMuYm90dG9tKSB0aGlzLmJvdHRvbSA9IHIuYm90dG9tO1xufTtcblxubW9kdWxlLmV4cG9ydHMgPSBSZWN0O1xuIiwidmFyIFJlY3QgPSByZXF1aXJlKCcuL1JlY3QnKTtcbnZhciBQb2ludCA9IHJlcXVpcmUoJy4vUG9pbnQnKTtcblxuLyoqXG4gKiBBIGdlc3R1cmUgc3Ryb2tlIHN0YXJ0ZWQgb24gYSB0b3VjaCBkb3duIGFuZCBlbmRlZCBvbiBhIHRvdWNoIHVwLiBBIHN0cm9rZVxuICogY29uc2lzdHMgb2YgYSBzZXF1ZW5jZSBvZiB0aW1lZCBwb2ludHMuIE9uZSBvciBtdWx0aXBsZSBzdHJva2VzIGZvcm0gYSBnZXN0dXJlLlxuICovXG5mdW5jdGlvbiBTdHJva2UocG9pbnRzKSB7XG4gIGlmIChwb2ludHMgPT0gbnVsbCkgcmV0dXJuO1xuXG4gIHZhciBjb3VudCA9IHBvaW50cy5sZW5ndGg7XG4gIHZhciB0bXBQb2ludHMgPSBBcnJheShjb3VudCoyKTtcbiAgdmFyIHRpbWVzID0gQXJyYXkoY291bnQpO1xuICB2YXIgYnggPSBudWxsO1xuICB2YXIgbGVuID0gMDtcbiAgdmFyIGluZGV4ID0gMDtcbiAgXG4gIGZvciAodmFyIGk9MDsgaTxjb3VudDsgKytpKSB7XG4gICAgdmFyIHAgPSBwb2ludHNbaV07XG4gICAgdG1wUG9pbnRzW2kqMl0gPSBwLng7XG4gICAgdG1wUG9pbnRzW2kqMisxXSA9IHAueTtcbiAgICB0aW1lc1tpbmRleF0gPSBwLnRpbWVzdGFtcDtcblxuICAgIGlmIChieCA9PSBudWxsKSB7XG4gICAgICBieCA9IG5ldyBSZWN0KHAueCwgcC55LCBwLngsIHAueSk7XG4gICAgICBsZW4gPSAwO1xuICAgIH0gZWxzZSB7XG4gICAgICB2YXIgZHggPSBwLnggLSB0bXBQb2ludHNbKGkgLSAxKSAqIDJdO1xuICAgICAgdmFyIGR5ID0gcC55IC0gdG1wUG9pbnRzWyhpIC0xKSAqIDIgKyAxXTtcbiAgICAgIGxlbiArPSBNYXRoLnNxcnQoZHgqZHggKyBkeSpkeSk7XG4gICAgICBieC51bmlvblBvaW50KHAueCwgcC55KTtcbiAgICB9XG4gICAgaW5kZXgrKztcbiAgfVxuICAgIFxuICB0aGlzLnRpbWVzdGFtcHMgPSB0aW1lcztcbiAgdGhpcy5wb2ludHMgPSB0bXBQb2ludHM7XG4gIHRoaXMuYm91bmRpbmdCb3ggPSBieDtcbiAgdGhpcy5sZW5ndGggPSBsZW47XG59XG5cblN0cm9rZS5wcm90b3R5cGUuY2xvbmUgPSBmdW5jdGlvbigpIHtcbiAgdmFyIHN0cm9rZSA9IG5ldyBTdHJva2UoKTtcbiAgc3Ryb2tlLmJvdW5kaW5nQm94ID0gdGhpcy5ib3VuZGluZ0JveC5jbG9uZSgpO1xuICBzdHJva2UubGVuZ3RoID0gdGhpcy5sZW5ndGg7XG4gIHN0cm9rZS5wb2ludHMgPSB0aGlzLnBvaW50cy5zbGljZSgpO1xuICBzdHJva2UudGltZXN0YW1wcyA9IHRoaXMudGltZXN0YW1wcy5zbGljZSgpO1xuICByZXR1cm4gc3Ryb2tlO1xufTtcblxuLy8gLS0tXG5cblN0cm9rZS5wcm90b3R5cGUudG9KU09OID0gZnVuY3Rpb24oKSB7XG4gIHZhciBwb2ludHMgPSBbXTtcbiAgdmFyIGNvdW50ID0gdGhpcy5wb2ludHMubGVuZ3RoO1xuICBmb3IgKHZhciBpPTA7IGk8Y291bnQ7IGkrPTIpIHtcbiAgICBwb2ludHMucHVzaCh7XG4gICAgICB4OiB0aGlzLnBvaW50c1tpXSxcbiAgICAgIHk6IHRoaXMucG9pbnRzW2krMV0sXG4gICAgICB0OiB0aGlzLnRpbWVzdGFtcHNbaT4+MV1cbiAgICB9KTtcbiAgfVxuICByZXR1cm4gcG9pbnRzO1xufTtcblxuU3Ryb2tlLmZyb21KU09OID0gZnVuY3Rpb24oanNvbikge1xuICB2YXIgcG9pbnRzID0gW107XG4gIGZvciAodmFyIGk9MDsgaTxqc29uLmxlbmd0aDsgKytpKSB7XG4gICAgcG9pbnRzLnB1c2gobmV3IFBvaW50KGpzb25baV0pKTtcbiAgfVxuICByZXR1cm4gbmV3IFN0cm9rZShwb2ludHMpO1xufTtcblxubW9kdWxlLmV4cG9ydHMgPSBTdHJva2U7XG4iLCJ2YXIgT3JpZW50ZWRCb3VuZGluZ0JveCA9IHJlcXVpcmUoJy4vT3JpZW50ZWRCb3VuZGluZ0JveCcpO1xuXG4vKipcbiAqIFV0aWxpdHkgZnVuY3Rpb25zIGZvciBnZXN0dXJlIHByb2Nlc3NpbmcgJiBhbmFseXNpcywgaW5jbHVkaW5nIG1ldGhvZHMgZm9yOlxuICogPHVsPiBcbiAqIDxsaT5mZWF0dXJlIGV4dHJhY3Rpb24gKGUuZy4sIHNhbXBsZXJzIGFuZCB0aG9zZSBmb3IgY2FsY3VsYXRpbmcgYm91bmRpbmdcbiAqIGJveGVzIGFuZCBnZXN0dXJlIHBhdGggbGVuZ3Rocyk7XG4gKiA8bGk+Z2VvbWV0cmljIHRyYW5zZm9ybWF0aW9uIChlLmcuLCB0cmFuc2xhdGlvbiwgcm90YXRpb24gYW5kIHNjYWxpbmcpO1xuICogPGxpPmdlc3R1cmUgc2ltaWxhcml0eSBjb21wYXJpc29uIChlLmcuLCBjYWxjdWxhdGluZyBFdWNsaWRlYW4gb3IgQ29zaW5lXG4gKiBkaXN0YW5jZXMgYmV0d2VlbiB0d28gZ2VzdHVyZXMpLlxuICogPC91bD5cbiAqL1xudmFyIFV0aWxzID0ge307XG5cblV0aWxzLlNDQUxJTkdfVEhSRVNIT0xEID0gMC4yNjtcblV0aWxzLk5PTlVOSUZPUk1fU0NBTEUgPSBNYXRoLnNxcnQoMik7XG5cblV0aWxzLnplcm9lcyA9IGZ1bmN0aW9uKG4pIHtcbiAgdmFyIGFycmF5ID0gQXJyYXkobik7XG4gIGZvciAodmFyIGk9MDsgaTxuOyArK2kpIGFycmF5W2ldID0gMDtcbiAgcmV0dXJuIGFycmF5O1xufVxuXG4vKipcbiAqIFNhbXBsZXMgdGhlIGdlc3R1cmUgc3BhdGlhbGx5IGJ5IHJlbmRlcmluZyB0aGUgZ2VzdHVyZSBpbnRvIGEgMkQgXG4gKiBncmF5c2NhbGUgYml0bWFwLiBTY2FsZXMgdGhlIGdlc3R1cmUgdG8gZml0IHRoZSBzaXplIG9mIHRoZSBiaXRtYXAuIFxuICogXG4gKiBAcGFyYW0gZ2VzdHVyZSB0aGUgZ2VzdHVyZSB0byBiZSBzYW1wbGVkXG4gKiBAcGFyYW0gYml0bWFwU2l6ZSB0aGUgc2l6ZSBvZiB0aGUgYml0bWFwXG4gKiBAcGFyYW0ga2VlcEFzcGVjdFJhdGlvIGlmIHRoZSBzY2FsaW5nIHNob3VsZCBrZWVwIHRoZSBnZXN0dXJlJ3MgXG4gKiAgICAgICAgYXNwZWN0IHJhdGlvXG4gKiBcbiAqIEByZXR1cm4gYSBiaXRtYXBTaXplIHggYml0bWFwU2l6ZSBncmF5c2NhbGUgYml0bWFwIHRoYXQgaXMgcmVwcmVzZW50ZWQgXG4gKiAgICAgICAgIGFzIGEgMUQgYXJyYXkuIFRoZSBmbG9hdCBhdCBpbmRleCBpIHJlcHJlc2VudHMgdGhlIGdyYXlzY2FsZSBcbiAqICAgICAgICAgdmFsdWUgYXQgcGl4ZWwgW2klYml0bWFwU2l6ZSwgaS9iaXRtYXBTaXplXSBcbiAqL1xuVXRpbHMuc3BhdGlhbFNhbXBsaW5nID0gZnVuY3Rpb24oZ2VzdHVyZSwgYml0bWFwU2l6ZSwga2VlcEFzcGVjdFJhdGlvKSB7XG4gIHZhciB0YXJnZXRQYXRjaFNpemUgPSBiaXRtYXBTaXplIC0gMTtcbiAgdmFyIHNhbXBsZSA9IFV0aWxzLnplcm9lcyhiaXRtYXBTaXplICogYml0bWFwU2l6ZSk7XG4gIHZhciByZWN0ID0gZ2VzdHVyZS5nZXRCb3VuZGluZ0JveCgpO1xuICB2YXIgZ2VzdHVyZVdpZHRoID0gcmVjdC53aWR0aCgpO1xuICB2YXIgZ2VzdHVyZUhlaWdodCA9IHJlY3QuaGVpZ2h0KCk7XG4gIHZhciBzeCA9IHRhcmdldFBhdGNoU2l6ZSAvIGdlc3R1cmVXaWR0aDtcbiAgdmFyIHN5ID0gdGFyZ2V0UGF0Y2hTaXplIC8gZ2VzdHVyZUhlaWdodDtcbiAgdmFyIHNjYWxlO1xuXG4gIGlmIChrZWVwQXNwZWN0UmF0aW8pIHtcbiAgICBzY2FsZSA9IHN4IDwgc3kgPyBzeCA6IHN5O1xuICAgIHN4ID0gc2NhbGU7XG4gICAgc3kgPSBzY2FsZTtcbiAgfSBlbHNlIHtcbiAgICB2YXIgYXNwZWN0UmF0aW8gPSBnZXN0dXJlV2lkdGggLyBnZXN0dXJlSGVpZ2h0O1xuICAgIGlmIChhc3BlY3RSYXRpbyA+IDEpIHtcbiAgICAgIGFzcGVjdFJhdGlvbiA9IDEgLyBhc3BlY3RSYXRpbztcbiAgICB9XG4gICAgaWYgKGFzcGVjdFJhdGlvIDwgVXRpbHMuU0NBTElOR19USFJFU0hPTEQpIHtcbiAgICAgIHNjYWxlID0gc3ggPCBzeSA/IHN4IDogc3k7XG4gICAgICBzeCA9IHNjYWxlO1xuICAgICAgc3kgPSBzY2FsZTtcbiAgICB9IGVsc2Uge1xuICAgICAgaWYgKHN4ID4gc3kpIHtcbiAgICAgICAgc2NhbGUgPSBzeSAqIFV0aWxzLk5PTlVOSUZPUk1fU0NBTEU7XG4gICAgICAgIGlmIChzY2FsZSA8IHN4KSB7IHN4ID0gc2NhbGU7IH1cbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHNjYWxlID0gc3ggKiBVdGlscy5OT05VTklGT1JNX1NDQUxFOyBcbiAgICAgICAgaWYgKHNjYWxlIDwgc3kpIHsgc3kgPSBzY2FsZTsgfVxuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIHZhciBwcmVEeCA9IC1yZWN0LmNlbnRlclgoKTtcbiAgdmFyIHByZUR5ID0gLXJlY3QuY2VudGVyWSgpO1xuICB2YXIgcG9zdER4ID0gdGFyZ2V0UGF0Y2hTaXplIC8gMjtcbiAgdmFyIHBvc3REeSA9IHRhcmdldFBhdGNoU2l6ZSAvIDI7XG4gIHZhciBzdHJva2VzID0gZ2VzdHVyZS5nZXRTdHJva2VzKCk7XG4gIHZhciBjb3VudCA9IHN0cm9rZXMubGVuZ3RoO1xuICB2YXIgc2l6ZTsgLy8gaW50XG4gIHZhciB4cG9zO1xuICB2YXIgeXBvcztcblxuICBmb3IgKHZhciBpbmRleD0wOyBpbmRleCA8IGNvdW50OyBpbmRleCsrKSB7XG4gICAgdmFyIHN0cm9rZSA9IHN0cm9rZXNbaW5kZXhdO1xuICAgIHZhciBzdHJva2Vwb2ludHMgPSBzdHJva2UucG9pbnRzO1xuICAgIHNpemUgPSBzdHJva2Vwb2ludHMubGVuZ3RoO1xuICAgIHZhciBwdHMgPSBBcnJheShzaXplKTtcbiAgICBmb3IgKHZhciBpPTA7IGkgPCBzaXplOyBpICs9IDIpIHtcbiAgICAgIHB0c1tpXSA9IChzdHJva2Vwb2ludHNbaV0gKyBwcmVEeCkgKiBzeCArIHBvc3REeDtcbiAgICAgIHB0c1tpICsgMV0gPSAoc3Ryb2tlcG9pbnRzW2kgKyAxXSArIHByZUR5KSAqIHN5ICsgcG9zdER5O1xuICAgIH1cbiAgICB2YXIgc2VnbWVudEVuZFggPSAtMTtcbiAgICB2YXIgc2VnbWVudEVuZFkgPSAtMTtcbiAgICBmb3IgKHZhciBpPTA7IGkgPCBzaXplOyBpICs9IDIpIHtcbiAgICAgIHZhciBzZWdtZW50U3RhcnRYID0gcHRzW2ldIDwgMCA/IDAgOiBwdHNbaV07XG4gICAgICB2YXIgc2VnbWVudFN0YXJ0WSA9IHB0c1tpICsgMV0gPCAwID8gMCA6IHB0c1tpICsgMV07XG4gICAgICBpZiAoc2VnbWVudFN0YXJ0WCA+IHRhcmdldFBhdGNoU2l6ZSkge1xuICAgICAgICBzZWdtZW50U3RhcnRYID0gdGFyZ2V0UGF0Y2hTaXplO1xuICAgICAgfSBcbiAgICAgIGlmIChzZWdtZW50U3RhcnRZID4gdGFyZ2V0UGF0Y2hTaXplKSB7XG4gICAgICAgIHNlZ21lbnRTdGFydFkgPSB0YXJnZXRQYXRjaFNpemU7XG4gICAgICB9XG4gICAgICBVdGlscy5wbG90KHNlZ21lbnRTdGFydFgsIHNlZ21lbnRTdGFydFksIHNhbXBsZSwgYml0bWFwU2l6ZSk7XG4gICAgICBpZiAoc2VnbWVudEVuZFggIT0gLTEpIHtcbiAgICAgICAgLy8gRXZhbHVhdGUgaG9yaXpvbnRhbGx5XG4gICAgICAgIGlmIChzZWdtZW50RW5kWCA+IHNlZ21lbnRTdGFydFgpIHtcbiAgICAgICAgICB4cG9zID0gTWF0aC5jZWlsKHNlZ21lbnRTdGFydFgpO1xuICAgICAgICAgIHZhciBzbG9wZSA9IChzZWdtZW50RW5kWSAtIHNlZ21lbnRTdGFydFkpIC8gKHNlZ21lbnRFbmRYIC0gc2VnbWVudFN0YXJ0WCk7XG4gICAgICAgICAgd2hpbGUgKHhwb3MgPCBzZWdtZW50RW5kWCkge1xuICAgICAgICAgICAgeXBvcyA9IHNsb3BlICogKHhwb3MgLSBzZWdtZW50U3RhcnRYKSArIHNlZ21lbnRTdGFydFk7XG4gICAgICAgICAgICBwbG90KHhwb3MsIHlwb3MsIHNhbXBsZSwgYml0bWFwU2l6ZSk7IFxuICAgICAgICAgICAgeHBvcysrO1xuICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIGlmIChzZWdtZW50RW5kWCA8IHNlZ21lbnRTdGFydFgpIHtcbiAgICAgICAgICB4cG9zID0gTWF0aC5jZWlsKHNlZ21lbnRFbmRYKTtcbiAgICAgICAgICB2YXIgc2xvcGUgPSAoc2VnbWVudEVuZFkgLSBzZWdtZW50U3RhcnRZKSAvIChzZWdtZW50RW5kWCAtIHNlZ21lbnRTdGFydFgpO1xuICAgICAgICAgIHdoaWxlICh4cG9zIDwgc2VnbWVudFN0YXJ0WCkge1xuICAgICAgICAgICAgICB5cG9zID0gc2xvcGUgKiAoeHBvcyAtIHNlZ21lbnRTdGFydFgpICsgc2VnbWVudFN0YXJ0WTtcbiAgICAgICAgICAgICAgcGxvdCh4cG9zLCB5cG9zLCBzYW1wbGUsIGJpdG1hcFNpemUpOyBcbiAgICAgICAgICAgICAgeHBvcysrO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICAvLyBFdmFsdWF0ZSB2ZXJ0aWNhbGx5XG4gICAgICAgIGlmIChzZWdtZW50RW5kWSA+IHNlZ21lbnRTdGFydFkpIHtcbiAgICAgICAgICB5cG9zID0gTWF0aC5jZWlsKHNlZ21lbnRTdGFydFkpO1xuICAgICAgICAgIHZhciBpbnZlcnRTbG9wZSA9IChzZWdtZW50RW5kWCAtIHNlZ21lbnRTdGFydFgpIC8gKHNlZ21lbnRFbmRZIC0gc2VnbWVudFN0YXJ0WSk7XG4gICAgICAgICAgd2hpbGUgKHlwb3MgPCBzZWdtZW50RW5kWSkge1xuICAgICAgICAgICAgICB4cG9zID0gaW52ZXJ0U2xvcGUgKiAoeXBvcyAtIHNlZ21lbnRTdGFydFkpICsgc2VnbWVudFN0YXJ0WDtcbiAgICAgICAgICAgICAgcGxvdCh4cG9zLCB5cG9zLCBzYW1wbGUsIGJpdG1hcFNpemUpOyBcbiAgICAgICAgICAgICAgeXBvcysrO1xuICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIGlmIChzZWdtZW50RW5kWSA8IHNlZ21lbnRTdGFydFkpIHtcbiAgICAgICAgICB5cG9zID0gTWF0aC5jZWlsKHNlZ21lbnRFbmRZKTtcbiAgICAgICAgICB2YXIgaW52ZXJ0U2xvcGUgPSAoc2VnbWVudEVuZFggLSBzZWdtZW50U3RhcnRYKSAvIChzZWdtZW50RW5kWSAtIHNlZ21lbnRTdGFydFkpO1xuICAgICAgICAgIHdoaWxlICh5cG9zIDwgc2VnbWVudFN0YXJ0WSkge1xuICAgICAgICAgICAgeHBvcyA9IGludmVydFNsb3BlICogKHlwb3MgLSBzZWdtZW50U3RhcnRZKSArIHNlZ21lbnRTdGFydFg7IFxuICAgICAgICAgICAgcGxvdCh4cG9zLCB5cG9zLCBzYW1wbGUsIGJpdG1hcFNpemUpOyBcbiAgICAgICAgICAgIHlwb3MrKztcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIHNlZ21lbnRFbmRYID0gc2VnbWVudFN0YXJ0WDtcbiAgICAgIHNlZ21lbnRFbmRZID0gc2VnbWVudFN0YXJ0WTtcbiAgICB9XG4gIH1cbiAgcmV0dXJuIHNhbXBsZTtcbn07XG5cblV0aWxzLnBsb3QgPSBmdW5jdGlvbih4LCB5LCBzYW1wbGUsIHNhbXBsZVNpemUpIHtcbiAgeCA9IHggPCAwID8gMCA6IHg7XG4gIHkgPSB5IDwgMCA/IDAgOiB5O1xuICB2YXIgeEZsb29yID0gTWF0aC5mbG9vcih4KTtcbiAgdmFyIHhDZWlsaW5nID0gTWF0aC5jZWlsKHgpO1xuICB2YXIgeUZsb29yID0gTWF0aC5mbG9vcih5KTtcbiAgdmFyIHlDZWlsaW5nID0gTWF0aC5jZWlsKHkpO1xuICBcbiAgLy8gaWYgaXQncyBhbiBpbnRlZ2VyXG4gIGlmICh4ID09PSB4Rmxvb3IgJiYgeSA9PT0geUZsb29yKSB7XG4gICAgdmFyIGluZGV4ID0geUNlaWxpbmcgKiBzYW1wbGVTaXplICsgeENlaWxpbmc7XG4gICAgaWYgKHNhbXBsZVtpbmRleF0gPCAxKSB7XG4gICAgICBzYW1wbGVbaW5kZXhdID0gMTtcbiAgICB9XG4gIH0gZWxzZSB7XG4gICAgdmFyIHhGbG9vclNxID0gTWF0aC5wb3coeEZsb29yIC0geCwgMik7XG4gICAgdmFyIHlGbG9vclNxID0gTWF0aC5wb3coeUZsb29yIC0geSwgMik7XG4gICAgdmFyIHhDZWlsaW5nU3EgPSBNYXRoLnBvdyh4Q2VpbGluZyAtIHgsIDIpO1xuICAgIHZhciB5Q2VpbGluZ1NxID0gTWF0aC5wb3coeUNlaWxpbmcgLSB5LCAyKTtcbiAgICB2YXIgdG9wTGVmdCA9IE1hdGguc3FydCh4Rmxvb3JTcSArIHlGbG9vclNxKTtcbiAgICB2YXIgdG9wUmlnaHQgPSBNYXRoLnNxcnQoeENlaWxpbmdTcSArIHlGbG9vclNxKTtcbiAgICB2YXIgYnRtTGVmdCA9IE1hdGguc3FydCh4Rmxvb3JTcSArIHlDZWlsaW5nU3EpO1xuICAgIHZhciBidG1SaWdodCA9IE1hdGguc3FydCh4Q2VpbGluZ1NxICsgeUNlaWxpbmdTcSk7XG4gICAgdmFyIHN1bSA9IHRvcExlZnQgKyB0b3BSaWdodCArIGJ0bUxlZnQgKyBidG1SaWdodDtcbiAgICBcbiAgICB2YXIgdmFsdWUgPSB0b3BMZWZ0IC8gc3VtO1xuICAgIHZhciBpbmRleCA9IHlGbG9vciAqIHNhbXBsZVNpemUgKyB4Rmxvb3I7XG4gICAgaWYgKHZhbHVlID4gc2FtcGxlW2luZGV4XSkge1xuICAgICAgc2FtcGxlW2luZGV4XSA9IHZhbHVlO1xuICAgIH1cbiAgICBcbiAgICB2YWx1ZSA9IHRvcFJpZ2h0IC8gc3VtO1xuICAgIGluZGV4ID0geUZsb29yICogc2FtcGxlU2l6ZSArIHhDZWlsaW5nO1xuICAgIGlmICh2YWx1ZSA+IHNhbXBsZVtpbmRleF0pIHtcbiAgICAgIHNhbXBsZVtpbmRleF0gPSB2YWx1ZTtcbiAgICB9XG4gICAgXG4gICAgdmFsdWUgPSBidG1MZWZ0IC8gc3VtO1xuICAgIGluZGV4ID0geUNlaWxpbmcgKiBzYW1wbGVTaXplICsgeEZsb29yO1xuICAgIGlmICh2YWx1ZSA+IHNhbXBsZVtpbmRleF0pIHtcbiAgICAgIHNhbXBsZVtpbmRleF0gPSB2YWx1ZTtcbiAgICB9XG4gICAgXG4gICAgdmFsdWUgPSBidG1SaWdodCAvIHN1bTtcbiAgICBpbmRleCA9IHlDZWlsaW5nICogc2FtcGxlU2l6ZSArIHhDZWlsaW5nO1xuICAgIGlmICh2YWx1ZSA+IHNhbXBsZVtpbmRleF0pIHtcbiAgICAgIHNhbXBsZVtpbmRleF0gPSB2YWx1ZTtcbiAgICB9XG4gIH1cbn07XG5cbi8qKlxuICogU2FtcGxlcyBhIHN0cm9rZSB0ZW1wb3JhbGx5IGludG8gYSBnaXZlbiBudW1iZXIgb2YgZXZlbmx5LWRpc3RyaWJ1dGVkIFxuICogcG9pbnRzLlxuICogXG4gKiBAcGFyYW0gc3Ryb2tlIHRoZSBnZXN0dXJlIHN0cm9rZSB0byBiZSBzYW1wbGVkXG4gKiBAcGFyYW0gbnVtUG9pbnRzIHRoZSBudW1iZXIgb2YgcG9pbnRzXG4gKiBAcmV0dXJuIHRoZSBzYW1wbGVkIHBvaW50cyBpbiB0aGUgZm9ybSBvZiBbeDEsIHkxLCB4MiwgeTIsIC4uLiwgeG4sIHluXVxuICovXG5VdGlscy50ZW1wb3JhbFNhbXBsaW5nID0gZnVuY3Rpb24oc3Ryb2tlLCBudW1Qb2ludHMpIHtcbiAgdmFyIGluY3JlbWVudCA9IHN0cm9rZS5sZW5ndGggLyAobnVtUG9pbnRzIC0gMSk7XG4gIHZhciB2ZWN0b3JMZW5ndGggPSBudW1Qb2ludHMgKiAyO1xuICB2YXIgdmVjdG9yID0gQXJyYXkodmVjdG9yTGVuZ3RoKTtcbiAgdmFyIGRpc3RhbmNlU29GYXIgPSAwO1xuICB2YXIgcHRzID0gc3Ryb2tlLnBvaW50cztcbiAgdmFyIGxzdFBvaW50WCA9IHB0c1swXTtcbiAgdmFyIGxzdFBvaW50WSA9IHB0c1sxXTtcbiAgdmFyIGluZGV4ID0gMDtcbiAgdmFyIGN1cnJlbnRQb2ludFggPSBOdW1iZXIuTUlOX1ZBTFVFO1xuICB2YXIgY3VycmVudFBvaW50WSA9IE51bWJlci5NSU5fVkFMVUU7XG4gIHZlY3RvcltpbmRleF0gPSBsc3RQb2ludFg7XG4gIGluZGV4Kys7XG4gIHZlY3RvcltpbmRleF0gPSBsc3RQb2ludFk7XG4gIGluZGV4Kys7XG4gIHZhciBpID0gMDtcbiAgdmFyIGNvdW50ID0gcHRzLmxlbmd0aCAvIDI7XG4gIHdoaWxlIChpIDwgY291bnQpIHtcbiAgICBpZiAoY3VycmVudFBvaW50WCA9PSBOdW1iZXIuTUlOX1ZBTFVFKSB7XG4gICAgICBpKys7XG4gICAgICBpZiAoaSA+PSBjb3VudCkge1xuICAgICAgICBicmVhaztcbiAgICAgIH1cbiAgICAgIGN1cnJlbnRQb2ludFggPSBwdHNbaSAqIDJdO1xuICAgICAgY3VycmVudFBvaW50WSA9IHB0c1tpICogMiArIDFdO1xuICAgIH1cbiAgICB2YXIgZGVsdGFYID0gY3VycmVudFBvaW50WCAtIGxzdFBvaW50WDtcbiAgICB2YXIgZGVsdGFZID0gY3VycmVudFBvaW50WSAtIGxzdFBvaW50WTtcbiAgICB2YXIgZGlzdGFuY2UgPSBNYXRoLnNxcnQoZGVsdGFYKmRlbHRhWCArIGRlbHRhWSpkZWx0YVkpO1xuICAgIGlmIChkaXN0YW5jZVNvRmFyICsgZGlzdGFuY2UgPj0gaW5jcmVtZW50KSB7XG4gICAgICB2YXIgcmF0aW8gPSAoaW5jcmVtZW50IC0gZGlzdGFuY2VTb0ZhcikgLyBkaXN0YW5jZTtcbiAgICAgIHZhciBueCA9IGxzdFBvaW50WCArIHJhdGlvICogZGVsdGFYO1xuICAgICAgdmFyIG55ID0gbHN0UG9pbnRZICsgcmF0aW8gKiBkZWx0YVk7XG4gICAgICB2ZWN0b3JbaW5kZXhdID0gbng7XG4gICAgICBpbmRleCsrO1xuICAgICAgdmVjdG9yW2luZGV4XSA9IG55O1xuICAgICAgaW5kZXgrKztcbiAgICAgIGxzdFBvaW50WCA9IG54O1xuICAgICAgbHN0UG9pbnRZID0gbnk7XG4gICAgICBkaXN0YW5jZVNvRmFyID0gMDtcbiAgICB9IGVsc2Uge1xuICAgICAgbHN0UG9pbnRYID0gY3VycmVudFBvaW50WDtcbiAgICAgIGxzdFBvaW50WSA9IGN1cnJlbnRQb2ludFk7XG4gICAgICBjdXJyZW50UG9pbnRYID0gTnVtYmVyLk1JTl9WQUxVRTtcbiAgICAgIGN1cnJlbnRQb2ludFkgPSBOdW1iZXIuTUlOX1ZBTFVFO1xuICAgICAgZGlzdGFuY2VTb0ZhciArPSBkaXN0YW5jZTtcbiAgICB9XG4gIH1cblxuICBmb3IgKGkgPSBpbmRleDsgaSA8IHZlY3Rvckxlbmd0aDsgaSArPSAyKSB7XG4gICAgdmVjdG9yW2ldID0gbHN0UG9pbnRYO1xuICAgIHZlY3RvcltpICsgMV0gPSBsc3RQb2ludFk7XG4gIH1cbiAgcmV0dXJuIHZlY3Rvcjtcbn07XG5cbi8qKlxuICogQ2FsY3VsYXRlcyB0aGUgY2VudHJvaWQgb2YgYSBzZXQgb2YgcG9pbnRzLlxuICogXG4gKiBAcGFyYW0gcG9pbnRzIHRoZSBwb2ludHMgaW4gdGhlIGZvcm0gb2YgW3gxLCB5MSwgeDIsIHkyLCAuLi4sIHhuLCB5bl1cbiAqIEByZXR1cm4gdGhlIGNlbnRyb2lkXG4gKi9cblV0aWxzLmNvbXB1dGVDZW50cm9pZCA9IGZ1bmN0aW9uKHBvaW50cykge1xuICB2YXIgY2VudGVyWCA9IDA7XG4gIHZhciBjZW50ZXJZID0gMDtcbiAgdmFyIGNvdW50ID0gcG9pbnRzLmxlbmd0aDtcbiAgZm9yICh2YXIgaT0wOyBpPGNvdW50OyArK2kpIHtcbiAgICBjZW50ZXJYICs9IHBvaW50c1tpXTtcbiAgICBpKys7XG4gICAgY2VudGVyWSArPSBwb2ludHNbaV07XG4gIH1cbiAgcmV0dXJuIFtcbiAgICAyICogY2VudGVyWCAvIGNvdW50LFxuICAgIDIgKiBjZW50ZXJZIC8gY291bnRcbiAgXTtcbn07XG5cbi8qKlxuICogQ2FsY3VsYXRlcyB0aGUgdmFyaWFuY2UtY292YXJpYW5jZSBtYXRyaXggb2YgYSBzZXQgb2YgcG9pbnRzLlxuICogXG4gKiBAcGFyYW0gcG9pbnRzIHRoZSBwb2ludHMgaW4gdGhlIGZvcm0gb2YgW3gxLCB5MSwgeDIsIHkyLCAuLi4sIHhuLCB5bl1cbiAqIEByZXR1cm4gdGhlIHZhcmlhbmNlLWNvdmFyaWFuY2UgbWF0cml4XG4gKi9cblV0aWxzLmNvbXB1dGVDb1ZhcmlhbmNlID0gZnVuY3Rpb24ocG9pbnRzKSB7XG4gIHZhciBhcnJheSA9IFtbMCwwXSwgWzAsMF1dO1xuICB2YXIgY291bnQgPSBwb2ludHMubGVuZ3RoO1xuICBmb3IgKHZhciBpPTA7IGk8Y291bnQ7ICsraSkge1xuICAgIHZhciB4ID0gcG9pbnRzW2ldO1xuICAgIGkrKztcbiAgICB2YXIgeSA9IHBvaW50c1tpXTtcbiAgICBhcnJheVswXVswXSArPSB4ICogeDtcbiAgICBhcnJheVswXVsxXSArPSB4ICogeTtcbiAgICBhcnJheVsxXVswXSA9IGFycmF5WzBdWzFdO1xuICAgIGFycmF5WzFdWzFdICs9IHkgKiB5O1xuICB9XG4gIGFycmF5WzBdWzBdIC89IChjb3VudCAvIDIpO1xuICBhcnJheVswXVsxXSAvPSAoY291bnQgLyAyKTtcbiAgYXJyYXlbMV1bMF0gLz0gKGNvdW50IC8gMik7XG4gIGFycmF5WzFdWzFdIC89IChjb3VudCAvIDIpO1xuICByZXR1cm4gYXJyYXk7XG59O1xuXG5VdGlscy5jb21wdXRlVG90YWxMZW5ndGggPSBmdW5jdGlvbihwb2ludHMpIHtcbiAgdmFyIHN1bSA9IDA7XG4gIHZhciBjb3VudCA9IHBvaW50cy5sZW5ndGggLSA0O1xuICBmb3IgKHZhciBpPTA7IGk8Y291bnQ7IGkrPTIpIHtcbiAgICAgIHZhciBkeCA9IHBvaW50c1tpICsgMl0gLSBwb2ludHNbaV07XG4gICAgICB2YXIgZHkgPSBwb2ludHNbaSArIDNdIC0gcG9pbnRzW2kgKyAxXTtcbiAgICAgIHN1bSArPSBNYXRoLnNxcnQoZHgqZHggKyBkeSpkeSk7XG4gIH1cbiAgcmV0dXJuIHN1bTtcbn07XG5cblV0aWxzLmNvbXB1dGVTdHJhaWdodG5lc3MgPSBmdW5jdGlvbihwb2ludHMpIHtcbiAgdmFyIHRvdGFsTGVuID0gVXRpbHMuY29tcHV0ZVRvdGFsTGVuZ3RoKHBvaW50cyk7XG4gIHZhciBkeCA9IHBvaW50c1syXSAtIHBvaW50c1swXTtcbiAgdmFyIGR5ID0gcG9pbnRzWzNdIC0gcG9pbnRzWzFdO1xuICByZXR1cm4gTWF0aC5zcXJ0KGR4KmR4ICsgZHkqZHkpIC8gdG90YWxMZW47XG59O1xuXG5VdGlscy5jb21wdXRlU3RyYWlnaHRuZXNzID0gZnVuY3Rpb24ocG9pbnRzLCB0b3RhbExlbikge1xuICB2YXIgZHggPSBwb2ludHNbMl0gLSBwb2ludHNbMF07XG4gIHZhciBkeSA9IHBvaW50c1szXSAtIHBvaW50c1sxXTtcbiAgcmV0dXJuIE1hdGguc3FydChkeCpkeCArIGR5KmR5KSAvIHRvdGFsTGVuO1xufTtcblxuLyoqXG4gKiBDYWxjdWxhdGVzIHRoZSBzcXVhcmVkIEV1Y2xpZGVhbiBkaXN0YW5jZSBiZXR3ZWVuIHR3byB2ZWN0b3JzLlxuICogXG4gKiBAcGFyYW0gdmVjdG9yMVxuICogQHBhcmFtIHZlY3RvcjJcbiAqIEByZXR1cm4gdGhlIGRpc3RhbmNlXG4gKi9cblV0aWxzLnNxdWFyZWRFdWNsaWRlYW5EaXN0YW5jZSA9IGZ1bmN0aW9uKHZlY3RvcjEsIHZlY3RvcjIpIHtcbiAgdmFyIHNxdWFyZWREaXN0YW5jZSA9IDA7XG4gIHZhciBzaXplID0gdmVjdG9yMS5sZW5ndGg7XG4gIGZvciAodmFyIGk9MDsgaTxzaXplOyArK2kpIHtcbiAgICB2YXIgZGlmZmVyZW5jZSA9IHZlY3RvcjFbaV0gLSB2ZWN0b3IyW2ldO1xuICAgIHNxdWFyZWREaXN0YW5jZSArPSBkaWZmZXJlbmNlICogZGlmZmVyZW5jZTtcbiAgfVxuICByZXR1cm4gc3F1YXJlZERpc3RhbmNlIC8gc2l6ZTtcbn07XG5cbi8qKlxuICogQ2FsY3VsYXRlcyB0aGUgY29zaW5lIGRpc3RhbmNlIGJldHdlZW4gdHdvIGluc3RhbmNlcy5cbiAqIFxuICogQHBhcmFtIHZlY3RvcjFcbiAqIEBwYXJhbSB2ZWN0b3IyXG4gKiBAcmV0dXJuIHRoZSBkaXN0YW5jZSBiZXR3ZWVuIDAgYW5kIE1hdGguUElcbiAqL1xuVXRpbHMuY29zaW5lRGlzdGFuY2UgPSBmdW5jdGlvbih2ZWN0b3IxLCB2ZWN0b3IyKSB7XG4gIHZhciBzdW0gPSAwO1xuICB2YXIgbGVuID0gdmVjdG9yMS5sZW5ndGg7XG4gIGZvciAodmFyIGk9MDsgaTxsZW47ICsraSkge1xuICAgIHN1bSArPSB2ZWN0b3IxW2ldICogdmVjdG9yMltpXTtcbiAgfVxuICByZXR1cm4gTWF0aC5hY29zKHN1bSk7XG59O1xuXG4vKipcbiAqIENhbGN1bGF0ZXMgdGhlIFwibWluaW11bVwiIGNvc2luZSBkaXN0YW5jZSBiZXR3ZWVuIHR3byBpbnN0YW5jZXMuXG4gKiBcbiAqIEBwYXJhbSB2ZWN0b3IxXG4gKiBAcGFyYW0gdmVjdG9yMlxuICogQHBhcmFtIG51bU9yaWVudGF0aW9ucyB0aGUgbWF4aW11bSBudW1iZXIgb2Ygb3JpZW50YXRpb24gYWxsb3dlZFxuICogQHJldHVybiB0aGUgZGlzdGFuY2UgYmV0d2VlbiB0aGUgdHdvIGluc3RhbmNlcyAoYmV0d2VlbiAwIGFuZCBNYXRoLlBJKVxuICovXG5VdGlscy5taW5pbXVtQ29zaW5lRGlzdGFuY2UgPSBmdW5jdGlvbih2ZWN0b3IxLCB2ZWN0b3IyLCBudW1PcmllbnRhdGlvbnMpIHtcbiAgdmFyIGxlbiA9IHZlY3RvcjEubGVuZ3RoO1xuICB2YXIgYSA9IDA7XG4gIHZhciBiID0gMDtcbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBsZW47IGkgKz0gMikge1xuICAgIGEgKz0gdmVjdG9yMVtpXSAqIHZlY3RvcjJbaV0gKyB2ZWN0b3IxW2kgKyAxXSAqIHZlY3RvcjJbaSArIDFdO1xuICAgIGIgKz0gdmVjdG9yMVtpXSAqIHZlY3RvcjJbaSArIDFdIC0gdmVjdG9yMVtpICsgMV0gKiB2ZWN0b3IyW2ldO1xuICB9XG4gIGlmIChhICE9IDApIHtcbiAgICB2YXIgdGFuID0gYi9hO1xuICAgIHZhciBhbmdsZSA9IE1hdGguYXRhbih0YW4pO1xuICAgIGlmIChudW1PcmllbnRhdGlvbnMgPiAyICYmIE1hdGguYWJzKGFuZ2xlKSA+PSBNYXRoLlBJIC8gbnVtT3JpZW50YXRpb25zKSB7XG4gICAgICByZXR1cm4gTWF0aC5hY29zKGEpO1xuICAgIH0gZWxzZSB7XG4gICAgICB2YXIgY29zaW5lID0gTWF0aC5jb3MoYW5nbGUpO1xuICAgICAgdmFyIHNpbmUgPSBjb3NpbmUgKiB0YW47IFxuICAgICAgcmV0dXJuIE1hdGguYWNvcyhhICogY29zaW5lICsgYiAqIHNpbmUpO1xuICAgIH1cbiAgfSBlbHNlIHtcbiAgICByZXR1cm4gTWF0aC5QSSAvIDI7XG4gIH1cbn07XG5cbi8qKlxuICogQ29tcHV0ZXMgYW4gb3JpZW50ZWQsIG1pbmltdW0gYm91bmRpbmcgYm94IG9mIGEgc2V0IG9mIHBvaW50cy5cbiAqIFxuICogQHBhcmFtIG9yaWdpbmFsUG9pbnRzXG4gKiBAcmV0dXJuIGFuIG9yaWVudGVkIGJvdW5kaW5nIGJveFxuICovXG5VdGlscy5jb21wdXRlT3JpZW50ZWRCb3VuZGluZ0JveFBvaW50cyA9IGZ1bmN0aW9uKG9yaWdpbmFsUG9pbnRzKSB7XG4gIHZhciBjb3VudCA9IG9yaWdpbmFsUG9pbnRzLmxlbmd0aDtcbiAgdmFyIHBvaW50cyA9IEFycmF5KGNvdW50ICogMik7XG4gIGZvciAodmFyIGkgPSAwOyBpIDwgY291bnQ7IGkrKykge1xuICAgICAgdmFyIHBvaW50ID0gb3JpZ2luYWxQb2ludHNbaV07XG4gICAgICB2YXIgaW5kZXggPSBpICogMjtcbiAgICAgIHBvaW50c1tpbmRleF0gPSBwb2ludC54O1xuICAgICAgcG9pbnRzW2luZGV4ICsgMV0gPSBwb2ludC55O1xuICB9XG4gIHZhciBtZWFuVmVjdG9yID0gVXRpbHMuY29tcHV0ZUNlbnRyb2lkKHBvaW50cyk7XG4gIHJldHVybiBVdGlscy5jb21wdXRlT3JpZW50ZWRCb3VuZGluZ0JveEZ1bGwocG9pbnRzLCBtZWFuVmVjdG9yKTtcbn07XG5cbi8qKlxuICogQ29tcHV0ZXMgYW4gb3JpZW50ZWQsIG1pbmltdW0gYm91bmRpbmcgYm94IG9mIGEgc2V0IG9mIHBvaW50cy5cbiAqIFxuICogQHBhcmFtIG9yaWdpbmFsUG9pbnRzXG4gKiBAcmV0dXJuIGFuIG9yaWVudGVkIGJvdW5kaW5nIGJveFxuICovXG5VdGlscy5jb21wdXRlT3JpZW50ZWRCb3VuZGluZ0JveCA9IGZ1bmN0aW9uKG9yaWdpbmFsUG9pbnRzKSB7XG4gIHZhciBzaXplID0gb3JpZ2luYWxQb2ludHMubGVuZ3RoO1xuICB2YXIgcG9pbnRzID0gQXJyYXkoc2l6ZSk7XG4gIGZvciAodmFyIGkgPSAwOyBpIDwgc2l6ZTsgaSsrKSB7XG4gICAgcG9pbnRzW2ldID0gb3JpZ2luYWxQb2ludHNbaV07XG4gIH1cbiAgdmFyIG1lYW5WZWN0b3IgPSBVdGlscy5jb21wdXRlQ2VudHJvaWQocG9pbnRzKTtcbiAgcmV0dXJuIFV0aWxzLmNvbXB1dGVPcmllbnRlZEJvdW5kaW5nQm94RnVsbChwb2ludHMsIG1lYW5WZWN0b3IpO1xufTtcblxuVXRpbHMuY29tcHV0ZU9yaWVudGVkQm91bmRpbmdCb3hGdWxsID0gZnVuY3Rpb24ocG9pbnRzLCBjZW50cm9pZCkge1xuICBVdGlscy50cmFuc2xhdGUocG9pbnRzLCAtY2VudHJvaWRbMF0sIC1jZW50cm9pZFsxXSk7XG5cbiAgdmFyIGFycmF5ID0gVXRpbHMuY29tcHV0ZUNvVmFyaWFuY2UocG9pbnRzKTtcbiAgdmFyIHRhcmdldFZlY3RvciA9IFV0aWxzLmNvbXB1dGVPcmllbnRhdGlvbihhcnJheSk7XG5cbiAgdmFyIGFuZ2xlO1xuICBpZiAodGFyZ2V0VmVjdG9yWzBdID09IDAgJiYgdGFyZ2V0VmVjdG9yWzFdID09IDApIHtcbiAgICBhbmdsZSA9IC1NYXRoLlBJLzI7XG4gIH0gZWxzZSB7IC8vIC1QSTxhbHBoYTxQSVxuICAgIGFuZ2xlID0gTWF0aC5hdGFuMih0YXJnZXRWZWN0b3JbMV0sIHRhcmdldFZlY3RvclswXSk7XG4gICAgVXRpbHMucm90YXRlKHBvaW50cywgLWFuZ2xlKTtcbiAgfVxuXG4gIHZhciBtaW54ID0gTnVtYmVyLk1BWF9WQUxVRTtcbiAgdmFyIG1pbnkgPSBOdW1iZXIuTUFYX1ZBTFVFO1xuICB2YXIgbWF4eCA9IE51bWJlci5NSU5fVkFMVUU7XG4gIHZhciBtYXh5ID0gTnVtYmVyLk1JTl9WQUxVRTtcbiAgdmFyIGNvdW50ID0gcG9pbnRzLmxlbmd0aDtcbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBjb3VudDsgaSsrKSB7XG4gICAgaWYgKHBvaW50c1tpXSA8IG1pbngpIHtcbiAgICAgIG1pbnggPSBwb2ludHNbaV07XG4gICAgfVxuICAgIGlmIChwb2ludHNbaV0gPiBtYXh4KSB7XG4gICAgICBtYXh4ID0gcG9pbnRzW2ldO1xuICAgIH1cbiAgICBpKys7XG4gICAgaWYgKHBvaW50c1tpXSA8IG1pbnkpIHtcbiAgICAgIG1pbnkgPSBwb2ludHNbaV07XG4gICAgfVxuICAgIGlmIChwb2ludHNbaV0gPiBtYXh5KSB7XG4gICAgICBtYXh5ID0gcG9pbnRzW2ldO1xuICAgIH1cbiAgfVxuXG4gIHJldHVybiBuZXcgT3JpZW50ZWRCb3VuZGluZ0JveChcbiAgICAoYW5nbGUgKiAxODAgLyBNYXRoLlBJKSxcbiAgICBjZW50cm9pZFswXSxcbiAgICBjZW50cm9pZFsxXSxcbiAgICBtYXh4IC0gbWlueCxcbiAgICBtYXh5IC0gbWlueVxuICApO1xufTtcblxuVXRpbHMuY29tcHV0ZU9yaWVudGF0aW9uID0gZnVuY3Rpb24oY292YXJpYW5jZU1hdHJpeCkge1xuICB2YXIgdGFyZ2V0VmVjdG9yID0gWzAsIDBdO1xuICBpZiAoY292YXJpYW5jZU1hdHJpeFswXVsxXSA9PSAwIHx8IGNvdmFyaWFuY2VNYXRyaXhbMV1bMF0gPT0gMCkge1xuICAgIHRhcmdldFZlY3RvclswXSA9IDE7XG4gICAgdGFyZ2V0VmVjdG9yWzFdID0gMDtcbiAgfVxuXG4gIHZhciBhID0gLWNvdmFyaWFuY2VNYXRyaXhbMF1bMF0gLSBjb3ZhcmlhbmNlTWF0cml4WzFdWzFdO1xuICB2YXIgYiA9IGNvdmFyaWFuY2VNYXRyaXhbMF1bMF0gKiBjb3ZhcmlhbmNlTWF0cml4WzFdWzFdIC0gY292YXJpYW5jZU1hdHJpeFswXVsxXVxuICAgICAgICAqIGNvdmFyaWFuY2VNYXRyaXhbMV1bMF07XG4gIHZhciB2YWx1ZSA9IGEgLyAyO1xuICB2YXIgcmlnaHRzaWRlID0gTWF0aC5zcXJ0KE1hdGgucG93KHZhbHVlLCAyKSAtIGIpO1xuICB2YXIgbGFtYmRhMSA9IC12YWx1ZSArIHJpZ2h0c2lkZTtcbiAgdmFyIGxhbWJkYTIgPSAtdmFsdWUgLSByaWdodHNpZGU7XG4gIGlmIChsYW1iZGExID09IGxhbWJkYTIpIHtcbiAgICB0YXJnZXRWZWN0b3JbMF0gPSAwO1xuICAgIHRhcmdldFZlY3RvclsxXSA9IDA7XG4gIH0gZWxzZSB7XG4gICAgdmFyIGxhbWJkYSA9IGxhbWJkYTEgPiBsYW1iZGEyID8gbGFtYmRhMSA6IGxhbWJkYTI7XG4gICAgdGFyZ2V0VmVjdG9yWzBdID0gMTtcbiAgICB0YXJnZXRWZWN0b3JbMV0gPSAobGFtYmRhIC0gY292YXJpYW5jZU1hdHJpeFswXVswXSkgLyBjb3ZhcmlhbmNlTWF0cml4WzBdWzFdO1xuICB9XG4gIHJldHVybiB0YXJnZXRWZWN0b3I7XG59O1xuXG5VdGlscy5yb3RhdGUgPSBmdW5jdGlvbihwb2ludHMsIGFuZ2xlKSB7XG4gIHZhciBjb3MgPSBNYXRoLmNvcyhhbmdsZSk7XG4gIHZhciBzaW4gPSBNYXRoLnNpbihhbmdsZSk7XG4gIHZhciBzaXplID0gcG9pbnRzLmxlbmd0aDtcbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBzaXplOyBpICs9IDIpIHtcbiAgICB2YXIgeCA9IHBvaW50c1tpXSAqIGNvcyAtIHBvaW50c1tpICsgMV0gKiBzaW47XG4gICAgdmFyIHkgPSBwb2ludHNbaV0gKiBzaW4gKyBwb2ludHNbaSArIDFdICogY29zO1xuICAgIHBvaW50c1tpXSA9IHg7XG4gICAgcG9pbnRzW2kgKyAxXSA9IHk7XG4gIH1cbiAgcmV0dXJuIHBvaW50cztcbn07XG5cblV0aWxzLnRyYW5zbGF0ZSA9IGZ1bmN0aW9uKHBvaW50cywgZHgsIGR5KSB7XG4gIHZhciBzaXplID0gcG9pbnRzLmxlbmd0aDtcbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBzaXplOyBpICs9IDIpIHtcbiAgICBwb2ludHNbaV0gKz0gZHg7XG4gICAgcG9pbnRzW2kgKyAxXSArPSBkeTtcbiAgfVxuICByZXR1cm4gcG9pbnRzO1xufTtcblxuVXRpbHMuc2NhbGUgPSBmdW5jdGlvbihwb2ludHMsIHN4LCBzeSkge1xuICB2YXIgc2l6ZSA9IHBvaW50cy5sZW5ndGg7XG4gIGZvciAodmFyIGkgPSAwOyBpIDwgc2l6ZTsgaSArPSAyKSB7XG4gICAgcG9pbnRzW2ldICo9IHN4O1xuICAgIHBvaW50c1tpICsgMV0gKj0gc3k7XG4gIH1cbiAgcmV0dXJuIHBvaW50cztcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gVXRpbHM7Il19
