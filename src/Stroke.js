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
