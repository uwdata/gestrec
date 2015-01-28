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
