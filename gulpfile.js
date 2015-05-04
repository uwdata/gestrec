var gulp = require('gulp'),
    browserify = require('browserify'),
    buffer = require('vinyl-buffer'),
    rename = require('gulp-rename'),
    source = require('vinyl-source-stream'),
    uglify = require('gulp-uglify');

function browser() {
  return browserify({
      entries: ['./src/'],
      standalone: 'gestrec',
      debug: true,
      cache: {}, packageCache: {}
    }); 
}

function build() {
  return browser().bundle()
    .pipe(source('gestrec.js'))
    .pipe(buffer())
    .pipe(gulp.dest('.'))
    // This will minify and rename to gestrec.min.js
    .pipe(uglify())
    .pipe(rename({ extname: '.min.js' }))
    .pipe(gulp.dest('.')); 
}

gulp.task('build', function() { build(); });

gulp.task('default', ['build']);