function Prediction(label, predictionScore) {
  this.name = label;
  this.score = predictionScore;
}

Prediction.prototype.toString = function() {
  return this.name;
};

module.exports = Prediction;
