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
};