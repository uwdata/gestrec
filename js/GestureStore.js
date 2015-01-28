/**
 * GestureStore maintains gesture examples and makes predictions on a new
 * gesture
 */
function GestureStore() {
  this.mSequenceType = GestureStore.SEQUENCE_SENSITIVE;
  this.mOrientationStyle = GestureStore.ORIENTATION_SENSITIVE;
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

GestureStore.FILE_FORMAT_VERSION = 1;
GestureStore.PROFILE_LOADING_SAVING = false;

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
  var gestures = mNamedGestures[entryName];
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
    return null;
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
