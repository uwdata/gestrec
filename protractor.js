/**
 * Rectangle object.
 */
function RectF(l, t, r, b) {
  this.set(l, t, r, b);
}

RectF.prototype.clone = function() {
  return new RectF(this.left, this.top, this.right, this.bottom);
};

RectF.prototype.centerX = function() {
  return (this.left + this.right) / 2;
};

RectF.prototype.centerY = function() {
  return (this.top + this.bottom) / 2;
};

RectF.prototype.set = function(l, t, r, b) {
  this.top = t;
  this.left = l;
  this.bottom = b;
  this.right = r;
};

RectF.prototype.unionPoint = function(x, y) {
  if (x < this.left) this.left = x;
  if (x > this.right) this.right = x;
  if (y < this.top) this.top = y;
  if (y > this.bottom) this.bottom = y;
};

RectF.prototype.union = function(r) {
  if (r.left < this.left) this.left = r.left;
  if (r.right > this.right) this.right = r.right;
  if (r.top < this.top) this.top = r.top;
  if (r.bottom > this.bottom) this.bottom = r.bottom;
};/**
 * An oriented bounding box
 */
function OrientedBoundingBox(angle, cx, cy, w, h) {
  this.orientation = angle;
  this.width = w;
  this.height = h;
  this.centerX = cx;
  this.centerY = cy;
  var ratio = w / h;
  this.squareness = ratio > 1 ? (1/ratio) : ratio;
}function Prediction(label, predictionScore) {
  this.name = label;
  this.score = predictionScore;
}

Prediction.prototype.toString = function() {
  return this.name;
};/**
 * Constants.
 */
var GestureConstants = {
  STROKE_STRING_BUFFER_SIZE: 1024,
  STROKE_POINT_BUFFER_SIZE: 100, // number of points
  IO_BUFFER_SIZE: 32 * 1024, // 32K
  LOG_TAG: "Gestures"
};/**
 * A timed point of a gesture stroke. Multiple points form a stroke.
 */
function GesturePoint(x, y, t) {
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
}/**
 * A gesture stroke started on a touch down and ended on a touch up. A stroke
 * consists of a sequence of timed points. One or multiple strokes form a gesture.
 */
function GestureStroke(points) {
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
      bx = new RectF(p.x, p.y, p.x, p.y);
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

GestureStroke.prototype.clone = function() {
  var stroke = new GestureStroke();
  stroke.boundingBox = this.boundingBox.clone();
  stroke.length = this.length;
  stroke.points = this.points.slice();
  stroke.timestamps = this.timestamps.slice();
  return stroke;
};

// ---

GestureStroke.prototype.toJSON = function() {
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

GestureStroke.fromJSON = function(json) {
  var points = [];
  for (var i=0; i<json.length; ++i) {
    points.push(new GesturePoint(json[i]));
  }
  return new GestureStroke(points);
};/**
 * A gesture is a hand-drawn shape on a touch screen. It can have one or multiple strokes.
 * Each stroke is a sequence of timed points. A user-defined gesture can be recognized by 
 * a GestureLibrary. 
 */
function Gesture() {
  this.mBoundingBox = new RectF();
  this.mGestureID = this.GESTURE_ID_BASE + (++this.sGestureCount);
  this.mStrokes = [];
}

Gesture.prototype.GESTURE_ID_BASE = Date.now();

Gesture.prototype.sGestureCount = 0;

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
};/**
 * GestureStore maintains gesture examples and makes predictions on a new
 * gesture
 */
function GestureStore() {
  this.mSequenceType = GestureStore.SEQUENCE_SENSITIVE;
  this.mOrientationStyle = GestureStore.ORIENTATION_SENSITIVE_4;
  this.mClassifier = new InstanceLearner();
  this.mChanged = false;
  this.mNamedGestures = {};
}

GestureStore.SEQUENCE_INVARIANT = 1;
// when SEQUENCE_SENSITIVE is used, only single stroke gestures are currently allowed
GestureStore.SEQUENCE_SENSITIVE = 2;

// ORIENTATION_SENSITIVE and ORIENTATION_INVARIANT are only for SEQUENCE_SENSITIVE gestures
GestureStore.ORIENTATION_INVARIANT = 1;
// at most 2 directions can be recognized
GestureStore.ORIENTATION_SENSITIVE = 2;
// at most 4 directions can be recognized
GestureStore.ORIENTATION_SENSITIVE_4 = 4;
// at most 8 directions can be recognized
GestureStore.ORIENTATION_SENSITIVE_8 = 8;

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
 * Remove a entry of gestures
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
var GestureUtils = {};

GestureUtils.CALING_THRESHOLD = 0.26;
GestureUtils.NONUNIFORM_SCALE = Math.sqrt(2);

GestureUtils.zeroes = function(n) {
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
GestureUtils.spatialSampling = function(gesture, bitmapSize, keepAspectRatio) {
  var targetPatchSize = bitmapSize - 1;
  var sample = GestureUtils.zeroes(bitmapSize * bitmapSize);
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
    if (aspectRatio < GestureUtils.SCALING_THRESHOLD) {
      scale = sx < sy ? sx : sy;
      sx = scale;
      sy = scale;
    } else {
      if (sx > sy) {
        scale = sy * GestureUtils.NONUNIFORM_SCALE;
        if (scale < sx) { sx = scale; }
      } else {
        scale = sx * GestureUtils.NONUNIFORM_SCALE; 
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
      plot(segmentStartX, segmentStartY, sample, bitmapSize);
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

GestureUtils.plot = function(x, y, sample, sampleSize) {
  x = x < 0 ? 0 : x;
  y = y < 0 ? 0 : y;
  var xFloor = Math.floor(x);
  var xCeiling = Math.ceil(x);
  var yFloor = Math.floor(y);
  var yCeiling = Math.ceil(y);
  
  // if it's an integer
  if (x == xFloor && y == yFloor) {
    var index = yCeiling * sampleSize + xCeiling;
    if (sample[index] < 1){
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
    if (value > sample[index]){
      sample[index] = value;
    }
    
    value = topRight / sum;
    index = yFloor * sampleSize + xCeiling;
    if (value > sample[index]){
      sample[index] = value;
    }
    
    value = btmLeft / sum;
    index = yCeiling * sampleSize + xFloor;
    if (value > sample[index]){
      sample[index] = value;
    }
    
    value = btmRight / sum;
    index = yCeiling * sampleSize + xCeiling;
    if (value > sample[index]){
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
GestureUtils.temporalSampling = function(stroke, numPoints) {
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
GestureUtils.computeCentroid = function(points) {
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
GestureUtils.computeCoVariance = function(points) {
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

GestureUtils.computeTotalLength = function(points) {
  var sum = 0;
  var count = points.length - 4;
  for (var i=0; i<count; i+=2) {
      var dx = points[i + 2] - points[i];
      var dy = points[i + 3] - points[i + 1];
      sum += Math.sqrt(dx*dx + dy*dy);
  }
  return sum;
};

GestureUtils.computeStraightness = function(points) {
  var totalLen = GestureUtils.computeTotalLength(points);
  var dx = points[2] - points[0];
  var dy = points[3] - points[1];
  return Math.sqrt(dx*dx + dy*dy) / totalLen;
};

GestureUtils.computeStraightness = function(points, totalLen) {
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
GestureUtils.squaredEuclideanDistance = function(vector1, vector2) {
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
GestureUtils.cosineDistance = function(vector1, vector2) {
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
GestureUtils.minimumCosineDistance = function(vector1, vector2, numOrientations) {
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
GestureUtils.computeOrientedBoundingBoxPoints = function(originalPoints) {
  var count = originalPoints.length;
  var points = Array(count * 2);
  for (var i = 0; i < count; i++) {
      var point = originalPoints[i];
      var index = i * 2;
      points[index] = point.x;
      points[index + 1] = point.y;
  }
  var meanVector = GestureUtils.computeCentroid(points);
  return GestureUtils.computeOrientedBoundingBoxFull(points, meanVector);
};

/**
 * Computes an oriented, minimum bounding box of a set of points.
 * 
 * @param originalPoints
 * @return an oriented bounding box
 */
GestureUtils.computeOrientedBoundingBox = function(originalPoints) {
  var size = originalPoints.length;
  var points = Array(size);
  for (var i = 0; i < size; i++) {
    points[i] = originalPoints[i];
  }
  var meanVector = GestureUtils.computeCentroid(points);
  return GestureUtils.computeOrientedBoundingBoxFull(points, meanVector);
};

GestureUtils.computeOrientedBoundingBoxFull = function(points, centroid) {
  GestureUtils.translate(points, -centroid[0], -centroid[1]);

  var array = GestureUtils.computeCoVariance(points);
  var targetVector = GestureUtils.computeOrientation(array);

  var angle;
  if (targetVector[0] == 0 && targetVector[1] == 0) {
    angle = -Math.PI/2;
  } else { // -PI<alpha<PI
    angle = Math.atan2(targetVector[1], targetVector[0]);
    GestureUtils.rotate(points, -angle);
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

GestureUtils.computeOrientation = function(covarianceMatrix) {
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


GestureUtils.rotate = function(points, angle) {
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

GestureUtils.translate = function(points, dx, dy) {
  var size = points.length;
  for (var i = 0; i < size; i += 2) {
    points[i] += dx;
    points[i + 1] += dy;
  }
  return points;
};

GestureUtils.scale = function(points, sx, sy) {
  var size = points.length;
  for (var i = 0; i < size; i += 2) {
    points[i] *= sx;
    points[i + 1] *= sy;
  }
  return points;
};
/**
 * An instance represents a sample if the label is available or a query if the
 * label is null.
 */
function Instance(id, sample, sampleName) {
  this.id = id;
  this.vector = sample;
  this.label = sampleName;
}

Instance.SEQUENCE_SAMPLE_SIZE = 16;

Instance.PATCH_SAMPLE_SIZE = 16;

Instance.ORIENTATIONS = [
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
];

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
  if (sequenceType == GestureStore.SEQUENCE_SENSITIVE) {
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
  return GestureUtils.spatialSampling(gesture, PATCH_SAMPLE_SIZE, false);
};

Instance.temporalSampler = function(orientationType, gesture) {
  var pts = GestureUtils.temporalSampling(gesture.getStrokes()[0],
          Instance.SEQUENCE_SAMPLE_SIZE);
  var center = GestureUtils.computeCentroid(pts);
  var orientation = Math.atan2(pts[1] - center[1], pts[0] - center[0]);

  var adjustment = -orientation;
  if (orientationType != GestureStore.ORIENTATION_INVARIANT) {
    var count = Instance.ORIENTATIONS.length;
    for (var i = 0; i < count; i++) {
      var delta = Instance.ORIENTATIONS[i] - orientation;
      if (Math.abs(delta) < Math.abs(adjustment)) {
        adjustment = delta;
      }
    }
  }

  GestureUtils.translate(pts, -center[0], -center[1]);
  GestureUtils.rotate(pts, adjustment);

  return pts;
};
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
    if (id == instance.id) {
      // TODO! splice...
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
    if (sequenceType == GestureStore.SEQUENCE_SENSITIVE) {
      distance = GestureUtils.minimumCosineDistance(sample.vector, vector, orientationType);
    } else {
      distance = GestureUtils.squaredEuclideanDistance(sample.vector, vector);
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