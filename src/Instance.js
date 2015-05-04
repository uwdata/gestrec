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