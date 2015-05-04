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
