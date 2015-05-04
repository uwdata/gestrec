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