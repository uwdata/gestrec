/**
 * Rectangle object.
 */
function Rect(l, t, r, b) {
  this.set(l, t, r, b);
}

Rect.prototype.clone = function() {
  return new Rect(this.left, this.top, this.right, this.bottom);
};

Rect.prototype.centerX = function() {
  return (this.left + this.right) / 2;
};

Rect.prototype.centerY = function() {
  return (this.top + this.bottom) / 2;
};

Rect.prototype.width = function() {
  return this.right - this.left;
};

Rect.prototype.height = function() {
  return this.bottom - this.top;
};

Rect.prototype.set = function(l, t, r, b) {
  this.top = t;
  this.left = l;
  this.bottom = b;
  this.right = r;
};

Rect.prototype.unionPoint = function(x, y) {
  if (x < this.left) this.left = x;
  if (x > this.right) this.right = x;
  if (y < this.top) this.top = y;
  if (y > this.bottom) this.bottom = y;
};

Rect.prototype.union = function(r) {
  if (r.left < this.left) this.left = r.left;
  if (r.right > this.right) this.right = r.right;
  if (r.top < this.top) this.top = r.top;
  if (r.bottom > this.bottom) this.bottom = r.bottom;
};

module.exports = Rect;
