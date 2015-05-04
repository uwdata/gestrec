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
